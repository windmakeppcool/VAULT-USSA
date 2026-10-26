import {
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { PerspectiveCamera } from 'three'
import type { ThreeStage } from './useThreeStage'
import { useStlLoader, type LoadedPart } from './useStlLoader'
import { layout, type LayoutInput, type Placed } from '@/lib/geometry/layout'
import { dequantize, type Quat } from '@/lib/geometry/orientation'
import type { Vec3 } from '@/lib/geometry/vector'
import { VAULT_DATA } from '@/data/manifest'

export const MAX_SCENE_TRIANGLES = 5_000_000
export const MAX_SCENE_PARTS = 80

/** 核心结构类别：即使超出三角面预算也始终保留（与旧实现一致） */
const CORE_CATS = new Set(['box', 'module', 'roof', 'baseplate', 'facade', 'backpanel'])

/** 爆炸展开方向，按类别定义在布局空间（X 宽 / Y 深 / Z 高），与旧实现一致 */
const EXPLODE_DIRS: Record<string, Vec3> = {
  roof: [0, 0, 0.95],
  module: [0, 0, 0.45],
  baseplate: [0, 0, -0.55],
  facade: [0, -0.85, 0],
  box: [0, 0, 0],
}

/** 加载失败时的线框占位颜色（工程正红系的警示色） */
const PLACEHOLDER_COLOR = 0xe1461c

/**
 * 失败部件在清单里没有尺寸信息，用一个估算立方体参与布局，
 * 保证它仍能占据一个可被用户看见的位置。
 */
const PLACEHOLDER_SIZE: Vec3 = [50, 50, 50]

/** 布局是 Z 轴朝上，three.js 场景是 Y 轴朝上，与旧实现一样旋转根节点 */
const LAYOUT_TO_SCENE = -Math.PI / 2

/**
 * 拆分件标记：清单的 k 字段标识 Part 1 / Part 2。
 * 装配视图只传入 path 与 category，所以按路径在模块顶层建一次映射，
 * 让 layout() 的「拆分件取代同类兄弟件」分支能正确触发。
 */
export const SPLIT_BY_PATH = new Map(
  VAULT_DATA.files
    .filter((f) => f.k !== null)
    .map((f) => [f.p, Number(f.k)] as const),
)

export interface AssemblyInput {
  path: string
  category: string
}

export interface AssemblyResult {
  /** 成功加载并渲染的部件数（不含缺失占位） */
  partCount: number
  /** 实际渲染的三角面数 */
  triangles: number
  skipped: number
  failed: number
  oversized: number
  /** 已渲染的线框占位数量 */
  placeholders: number
  /** 本次构建已被更新的构建取代，结果应丢弃 */
  stale?: boolean
}

const EMPTY_RESULT: AssemblyResult = {
  partCount: 0,
  triangles: 0,
  skipped: 0,
  failed: 0,
  oversized: 0,
  placeholders: 0,
}

/**
 * 把量化网格还原成真实坐标的 three 几何体，并重算法线保证光照正确。
 * 顶点按包围盒中心归零：布局给出的 center 是包围盒中心，
 * 若保留 STL 原始原点偏移，落点会变成 R·p + T 而不是旧实现的 R·(p − c) + T。
 */
export function geometryFromQuantized(part: LoadedPart): BufferGeometry {
  const { positions, minimum, maximum } = part.quantized
  const count = positions.length / 3
  const cx = (minimum[0] + maximum[0]) / 2
  const cy = (minimum[1] + maximum[1]) / 2
  const cz = (minimum[2] + maximum[2]) / 2
  const floats = new Float32Array(count * 3)
  const p: Vec3 = [0, 0, 0]
  for (let i = 0; i < count; i++) {
    dequantize({ positions, minimum, maximum }, i, p)
    floats[i * 3] = p[0] - cx
    floats[i * 3 + 1] = p[1] - cy
    floats[i * 3 + 2] = p[2] - cz
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(floats, 3))
  geometry.computeVertexNormals()
  return geometry
}

/**
 * 按包围球半径和相机视场计算能把整个组合放进画面的距离。
 * 旧实现同样使用 min(垂直, 水平) 视场，避免宽屏下左右被裁。
 */
function viewDistance(radius: number, camera: PerspectiveCamera): number {
  const vertical = (camera.fov * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect)
  const half = Math.min(vertical, horizontal) / 2
  const ratio = Math.sin(half) > 1e-6 ? 1 / Math.sin(half) : 1
  return radius * ratio * 1.2
}

interface PlacementRecord {
  mesh: Mesh
  placed: Placed
}

export function useAssembly() {
  const { loadAll } = useStlLoader()

  let stage: ThreeStage | null = null
  let root: Group | null = null
  let lastPlaced: PlacementRecord[] = []
  /** 按类别共享的材质缓存；提到闭包层，供配色变更时实时回流 */
  const materialCache = new Map<string, MeshStandardMaterial>()
  let explode = 0
  let explodeSpan = 0
  let frameCenter: Vec3 = [0, 0, 0]
  let frameRadius = 0
  /** 构建代次：并发或重置时丢弃过期结果 */
  let generation = 0

  function attach(next: ThreeStage): void {
    stage = next
  }

  function disposeRoot(): void {
    if (!root || !stage) return
    stage.scene.remove(root)
    // 材质按类别共享，先收集去重再统一释放，避免同一材质被 dispose 多次
    const materials = new Set<MeshStandardMaterial | MeshBasicMaterial>()
    root.traverse((object) => {
      const mesh = object as Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as MeshStandardMaterial | MeshBasicMaterial | undefined
      if (material) materials.add(material)
    })
    materials.forEach((material) => material.dispose())
    // 材质已释放，清空引用，避免 reset 后 recolor 操作已销毁的材质
    materialCache.clear()
    root = null
    lastPlaced = []
    explodeSpan = 0
    frameRadius = 0
  }

  async function build(
    list: AssemblyInput[],
    colorFor: (category: string) => string,
  ): Promise<AssemblyResult> {
    if (!stage) throw new Error('渲染器未就绪')
    const current = ++generation
    disposeRoot()
    // 旧材质已在 disposeRoot 中释放，这里清空引用，避免 recolor 操作已释放的材质
    materialCache.clear()
    explode = 0

    const settled = await loadAll(list)
    if (current !== generation) return { ...EMPTY_RESULT, stale: true }

    const categoryByPath = new Map(list.map((item) => [item.path, item.category]))

    const loaded: LoadedPart[] = []
    /** 读取失败（非 oversized）的条目，稍后用线框占位 */
    const missing: AssemblyInput[] = []
    let failed = 0
    let oversized = 0

    settled.forEach((result, index) => {
      const item = list[index]
      if (result.status === 'fulfilled') {
        loaded.push(result.value)
        return
      }
      if ((result.reason as Error)?.message === 'oversized') {
        // 超大件是主动省略，不做占位，只在状态栏提示
        oversized++
        return
      }
      failed++
      missing.push(item)
    })

    const categoryOf = (part: LoadedPart): string =>
      categoryByPath.get(part.path) ?? 'other'

    // 核心结构始终保留，小件按顺序填充直到三角面 / 部件数预算耗尽
    const core = loaded.filter((part) => CORE_CATS.has(categoryOf(part)))
    const rest = loaded.filter((part) => !CORE_CATS.has(categoryOf(part)))
    let budgetTriangles = core.reduce((sum, part) => sum + part.triangles, 0)

    const kept: LoadedPart[] = [...core]
    let skipped = 0
    for (const part of rest) {
      if (kept.length >= MAX_SCENE_PARTS || budgetTriangles + part.triangles > MAX_SCENE_TRIANGLES) {
        skipped++
        continue
      }
      kept.push(part)
      budgetTriangles += part.triangles
    }

    // 占位也消耗部件槽位，避免全量失败时生成过多 draw call
    const placeholderSlots = Math.max(0, MAX_SCENE_PARTS - kept.length)
    const placeholders = missing.slice(0, placeholderSlots)

    const inputs: LayoutInput[] = [
      ...kept.map((part) => ({
        part: {
          key: part.path,
          category: categoryOf(part),
          name: part.path.split('/').pop() ?? part.path,
          split: SPLIT_BY_PATH.get(part.path) ?? 0,
        },
        size: part.canonical.size,
        quat: part.canonical.quat,
      })),
      ...placeholders.map((item) => ({
        part: {
          key: item.path,
          category: item.category,
          name: item.path.split('/').pop() ?? item.path,
          split: SPLIT_BY_PATH.get(item.path) ?? 0,
        },
        size: PLACEHOLDER_SIZE,
        quat: [0, 0, 0, 1] as Quat,
      })),
    ]

    const placed = layout(inputs)
    if (!placed) {
      return { ...EMPTY_RESULT, skipped, failed, oversized }
    }

    const keptByPath = new Map(kept.map((part) => [part.path, part]))
    const missingByPath = new Set(placeholders.map((item) => item.path))

    const group = new Group()
    group.rotation.x = LAYOUT_TO_SCENE
    let placeholderMaterial: MeshBasicMaterial | null = null

    let partCount = 0
    let triangles = 0
    let placeholderCount = 0

    for (const item of placed) {
      const key = item.entry.part.key ?? ''
      const category = item.entry.part.category
      let mesh: Mesh

      const part = keptByPath.get(key)
      if (part) {
        const geometry = geometryFromQuantized(part)
        let material = materialCache.get(category)
        if (!material) {
          material = new MeshStandardMaterial({
            color: new Color(colorFor(category)),
            roughness: 0.62,
            metalness: 0.06,
            side: DoubleSide,
            flatShading: false,
          })
          materialCache.set(category, material)
        }
        mesh = new Mesh(geometry, material)
        partCount++
        triangles += part.triangles
      } else if (missingByPath.has(key)) {
        if (!placeholderMaterial) {
          placeholderMaterial = new MeshBasicMaterial({
            color: PLACEHOLDER_COLOR,
            wireframe: true,
          })
        }
        mesh = new Mesh(new BoxGeometry(...item.entry.size), placeholderMaterial)
        placeholderCount++
      } else {
        // 未知 key（理论上不会发生）：跳过，避免错配到别的部件
        continue
      }

      mesh.quaternion.set(...item.entry.quat)
      mesh.position.set(...item.center)
      group.add(mesh)
      lastPlaced.push({ mesh, placed: item })
    }

    stage.scene.add(group)
    root = group

    frameAll(group)
    applyExplode()

    return { partCount, triangles, skipped, failed, oversized, placeholders: placeholderCount }
  }

  /** 根据包围盒调整相机，near / far 必须随模型尺寸缩放，否则大组合会被裁掉 */
  function frameAll(group: Group): void {
    if (!stage) return
    // 取景必须基于未展开的基础位置：临时把爆炸归零再测量，
    // 否则「重置」会用已放大的包围盒重算，反复重置 + 展开会让相机越退越远。
    const previous = explode
    if (previous > 0) {
      explode = 0
      applyExplode()
    }
    const box = new Box3().setFromObject(group)
    if (previous > 0) {
      explode = previous
      applyExplode()
    }
    if (box.isEmpty()) return
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const radius = Math.max(size.length() / 2, 1)

    frameCenter = [center.x, center.y, center.z]
    frameRadius = radius
    explodeSpan = Math.max(size.x, size.y, size.z) * 0.55

    const camera = stage.camera
    const distance = viewDistance(radius, camera) * (1 + explode * 0.55)
    const direction = new Vector3(1, 0.8, 1.1).normalize()

    camera.position.copy(center).addScaledVector(direction, distance)
    camera.near = Math.max(0.1, radius / 1000)
    camera.far = Math.max(1000, distance * 40)
    camera.updateProjectionMatrix()

    stage.controls.target.copy(center)
    stage.controls.minDistance = radius * 0.2
    stage.controls.maxDistance = distance * 8
    stage.controls.update()
    stage.invalidate()
  }

  function setExplode(percent: number): void {
    explode = Math.max(0, Math.min(100, percent)) / 100
    applyExplode()
    if (stage) stage.invalidate()
  }

  function applyExplode(): void {
    const span = explodeSpan * explode
    for (const { mesh, placed } of lastPlaced) {
      const dir = EXPLODE_DIRS[placed.entry.part.category] ?? [0, 0, 0]
      mesh.position.set(
        placed.center[0] + dir[0] * span,
        placed.center[1] + dir[1] * span,
        placed.center[2] + dir[2] * span,
      )
    }
  }

  function setView(view: 'reset' | 'front' | 'top'): void {
    if (!stage) return
    if (view === 'reset') {
      if (root) frameAll(root)
      return
    }

    const camera = stage.camera
    const radius = frameRadius || 1
    const distance = viewDistance(radius, camera) * (1 + explode * 0.55)
    const center = new Vector3(frameCenter[0], frameCenter[1], frameCenter[2])
    // front 从 +Z 看向面板（布局 -Y 旋转后落在世界 +Z）；top 从 +Y 俯看。
    // 给主轴加极小偏移，避免相机 up 与视线共线导致视图退化。
    const direction =
      view === 'top' ? new Vector3(0, 1, 0.0001) : new Vector3(0, 0.0001, 1)

    camera.position.copy(center).addScaledVector(direction.normalize(), distance)
    camera.near = Math.max(0.1, radius / 1000)
    camera.far = Math.max(1000, distance * 40)
    camera.updateProjectionMatrix()

    stage.controls.target.copy(center)
    stage.controls.minDistance = radius * 0.2
    stage.controls.maxDistance = distance * 8
    stage.controls.update()
    stage.invalidate()
  }

  function reset(): void {
    generation++
    disposeRoot()
    explode = 0
  }

  /**
   * 配色变更时实时更新已建场景：材质按类别共享，
   * 每个类别只需改一次颜色，再请求重绘。
   */
  function recolor(colorFor: (category: string) => string): void {
    for (const [category, material] of materialCache) {
      material.color.set(colorFor(category))
    }
    stage?.invalidate()
  }

  return { attach, build, setExplode, setView, reset, recolor }
}

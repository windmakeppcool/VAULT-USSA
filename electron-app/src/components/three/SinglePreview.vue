<template>
  <div class="preview-backdrop" @click.self="$emit('close')">
    <section class="preview-panel">
      <header>
        <div>
          <span class="kicker">SINGLE PREVIEW</span>
          <b>{{ name }}</b>
        </div>
        <button class="close" aria-label="关闭" @click="$emit('close')">×</button>
      </header>

      <div class="stage">
        <div ref="host" class="host"></div>
        <p v-if="!ready" class="overlay">{{ status }}</p>
      </div>

      <footer v-if="info">
        <div><span>尺寸</span><b>{{ info.size }}</b></div>
        <div><span>三角面</span><b>{{ info.triangles }}</b></div>
        <div><span>文件</span><b>{{ info.bytes }}</b></div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Color, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { useThreeStage } from '@/composables/useThreeStage'
import { useStlLoader } from '@/composables/useStlLoader'
import { geometryFromQuantized } from '@/composables/useAssembly'

const props = defineProps<{
  /** STL 路径：同时用于加载与缓存键 */
  path: string
  /** 展示名称 */
  name: string
  /** 类别，缺省按 other 处理（仅影响加载，不影响单件展示姿态） */
  category?: string
}>()
defineEmits<{ close: [] }>()

/** 打印姿态是 Z 轴朝上，three.js 场景是 Y 轴朝上，与旧版 preview.js 一致只旋转根节点 */
const PRINT_TO_SCENE = -Math.PI / 2

const host = ref<HTMLElement | null>(null)
const status = ref('正在读取…')
const ready = ref(false)
const info = ref<{ size: string; triangles: string; bytes: string } | null>(null)

const stage = useThreeStage(host)
const { load } = useStlLoader()
let group: Group | null = null
let material: MeshStandardMaterial | null = null
/** 组件已卸载，异步加载完成后不再改动场景 */
let alive = true

/**
 * 让整个模型落进画面的相机距离。
 * 与旧版 preview.js / useAssembly 一致：取垂直与水平视场中较小者，避免宽屏裁切。
 */
function viewDistance(radius: number): number {
  const camera = stage.camera
  const vertical = (camera.fov * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect)
  const half = Math.min(vertical, horizontal) / 2
  const ratio = Math.sin(half) > 1e-6 ? 1 / Math.sin(half) : 1
  return radius * ratio * 1.2
}

onMounted(async () => {
  try {
    const part = await load(props.path, props.category ?? 'other', {
      // 单件预览正是要看装配视图主动省略的大件，放行 72 MiB 上限
      allowLarge: true,
      // 大件不写共享缓存，避免挤占 180 MiB 预算
      skipCache: true,
    })
    if (!alive) return

    // 复用装配视图的几何构建：顶点已按包围盒中心归零，模型必然居中
    const geometry = geometryFromQuantized(part)
    geometry.computeBoundingBox()
    const size = geometry.boundingBox!.getSize(new Vector3())

    material = new MeshStandardMaterial({
      color: new Color(0xb8bcc0),
      roughness: 0.6,
      metalness: 0.05,
      side: DoubleSide,
    })
    const mesh = new Mesh(geometry, material)

    group = new Group()
    // 不应用 canonical.quat：单件预览展示的是打印姿态的原始模型
    group.rotation.x = PRINT_TO_SCENE
    group.add(mesh)
    stage.scene.add(group)

    const radius = Math.max(size.length() / 2, 1)
    const distance = viewDistance(radius)
    // 旧版单件预览的默认视角方向
    stage.camera.position.copy(new Vector3(1, 0.85, 1.2).normalize().multiplyScalar(distance))
    stage.camera.near = Math.max(0.1, radius / 1000)
    stage.camera.far = Math.max(100, distance * 100)
    stage.camera.updateProjectionMatrix()
    stage.controls.target.set(0, 0, 0)
    stage.controls.minDistance = radius * 0.1
    stage.controls.maxDistance = distance * 8
    stage.controls.update()
    stage.invalidate()

    const f = (v: number) => v.toFixed(1)
    // 尺寸用 canonical.local：原始打印尺寸，不随姿态旋转改变
    const [lx, ly, lz] = part.canonical.local
    info.value = {
      size: `${f(lx)} × ${f(ly)} × ${f(lz)} mm`,
      triangles: part.triangles.toLocaleString('zh-CN'),
      bytes: part.bytes >= 1048576
        ? `${(part.bytes / 1048576).toFixed(1)} MB`
        : `${(part.bytes / 1024).toFixed(0)} KB`,
    }
    ready.value = true
  } catch (error) {
    if (!alive) return
    status.value = `读取失败：${(error as Error).message}`
  }
})

onBeforeUnmount(() => {
  alive = false
  if (!group) return
  stage.scene.remove(group)
  group.traverse((object) => {
    const mesh = object as Mesh
    mesh.geometry?.dispose()
  })
  material?.dispose()
  group = null
  material = null
})
</script>

<style scoped>
.preview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(19, 19, 16, 0.72);
  backdrop-filter: blur(3px);
}
.preview-panel {
  display: flex;
  flex-direction: column;
  width: min(880px, 92vw);
  height: min(680px, 88vh);
  background: var(--paper, #e9e4d6);
  border: 1px solid var(--line, rgba(28, 27, 22, 0.18));
  border-radius: 3px;
  overflow: hidden;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line, rgba(28, 27, 22, 0.18));
}
header b {
  display: block;
  font-size: 15px;
  color: var(--ink, #1c1b16);
}
.kicker {
  display: block;
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--accent, #ff6b00);
}
.close {
  width: 28px;
  height: 28px;
  font-size: 18px;
  line-height: 1;
  background: transparent;
  border: 1px solid var(--line, rgba(28, 27, 22, 0.18));
  border-radius: 2px;
  cursor: pointer;
  color: var(--ink, #1c1b16);
}
.stage {
  position: relative;
  flex: 1;
  /* canvas 的固有高度会让 flex 项无法收缩，导致页脚被挤出面板（overflow:hidden 裁掉） */
  min-height: 0;
  background: var(--stage, #131310);
}
.host {
  width: 100%;
  height: 100%;
}
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  margin: 0;
  color: var(--paper, #e9e4d6);
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 12px;
}
footer {
  display: flex;
  gap: 32px;
  padding: 12px 18px;
  border-top: 1px solid var(--line, rgba(28, 27, 22, 0.18));
}
footer div {
  display: grid;
  gap: 1px;
}
footer span {
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--muted, #6f6a5e);
}
footer b {
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 12px;
  color: var(--ink, #1c1b16);
}
</style>

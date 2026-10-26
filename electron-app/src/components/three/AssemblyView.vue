<template>
  <div
    class="assembly-view"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <ThreeCanvas ref="canvas" />
    <div class="hud">
      <span class="hud-kicker">LIVE ASSEMBLY</span>
      <b>{{ displayTitle }}</b>
      <span class="hud-stats">{{ stats }}</span>
    </div>
    <div class="dock">
      <label class="explode">
        展开 <em>EXPLODE</em>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          :value="explodeValue"
          :disabled="!ready"
          @input="onExplode"
        />
        <span>{{ explodeValue }}%</span>
      </label>
      <div class="views">
        <button :disabled="!ready" @click="assembly.setView('reset')">重置</button>
        <button :disabled="!ready" @click="assembly.setView('front')">正视</button>
        <button :disabled="!ready" @click="assembly.setView('top')">俯视</button>
      </div>
    </div>
    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ThreeCanvas from './ThreeCanvas.vue'
import { useAssembly } from '@/composables/useAssembly'
import { useStlLoader } from '@/composables/useStlLoader'
import { useColorStore } from '@/stores/color'
import { useLibraryStore } from '@/stores/library'
import { toast } from '@/composables/useToast'

const props = defineProps<{
  /** 展示标题；省略时使用默认文案 */
  title?: string
  /** 部件完整路径与类别，路径用于加载与唯一反查 */
  parts: { path: string; category: string }[]
}>()

const emit = defineEmits<{ loaded: [count: number] }>()

const canvas = ref<InstanceType<typeof ThreeCanvas> | null>(null)
const colorStore = useColorStore()
const library = useLibraryStore()
const assembly = useAssembly()
const { clear: clearStlCache } = useStlLoader()

const explodeValue = ref(0)
const ready = ref(false)
const status = ref('')
const stats = ref('—')

/** 当前选中的配色键（未被悬停覆盖时保持高亮） */
const selected = ref<string | null>(null)
/** 当前悬停的配色键 */
const hovered = ref<string | null>(null)
/** 按下位置，用于区分「点击拾取」与「拖动旋转视角」 */
let downAt: { x: number; y: number } | null = null

const displayTitle = computed(() => props.title ?? '组合装配')

const stageReady = ref(false)
/** 组件挂载前收到的部件列表，等渲染器就绪后再构建 */
let pendingParts: { path: string; category: string }[] | null = null
let requestId = 0

watch(canvas, (instance) => {
  if (!instance) return
  assembly.attach(instance.stage)
  stageReady.value = true
  if (pendingParts) {
    const list = pendingParts
    pendingParts = null
    void runBuild(list)
  }
})

watch(
  () => props.parts,
  (list) => {
    void runBuild(list)
  },
  { immediate: true },
)

// 配色改动实时回流到已建场景：材质按配色键共享，直接改色即可
watch(
  () => colorStore.colors,
  () => {
    assembly.recolor((colorKey) => colorStore.colorFor(colorKey))
  },
  { deep: true },
)

// 切换 STL 库后相对路径可能指向完全不同的几何：清空几何缓存并重建。
// 不清理会把旧库的网格按相同路径继续复用。
watch(
  () => library.root,
  (root) => {
    if (!root) return
    clearStlCache()
    void runBuild(props.parts)
  },
)

async function runBuild(list: { path: string; category: string }[]): Promise<void> {
  if (!list.length) {
    requestId++
    assembly.reset()
    explodeValue.value = 0
    ready.value = false
    stats.value = '—'
    status.value = '未选择部件'
    emit('loaded', 0)
    return
  }
  if (!stageReady.value) {
    pendingParts = list
    return
  }

  const current = ++requestId
  ready.value = false
  status.value = '正在读取组合…'
  try {
    const result = await assembly.build(list, (colorKey) => colorStore.colorFor(colorKey))
    // 组件已发起更新的构建，旧结果只清理不展示
    if (current !== requestId || result.stale) return

    // 场景已重建：材质随 materialCache 重建后 emissive 归零，
    // 选中 / 悬停状态必须同步复位，否则会出现「状态说选中但画面无高亮」的脱节
    selected.value = null
    hovered.value = null
    assembly.setHighlight(null)

    explodeValue.value = 0
    // 线框占位件在画面里同样可见，计数要与实际渲染结果一致
    stats.value = `${result.partCount + result.placeholders} 件 · ${(result.triangles / 1000).toFixed(0)}K 面`

    const notes: string[] = []
    if (result.failed) {
      // 占位数会被 MAX_SCENE_PARTS 截断，提示只按真正画出来的线框计数
      const renderedFailed = Math.min(result.failed, result.placeholders)
      notes.push(
        renderedFailed > 0
          ? `${result.failed} 件读取失败（其中 ${renderedFailed} 件以红色线框占位）`
          : `${result.failed} 件读取失败`,
      )
    }
    if (result.skipped) notes.push(`省略 ${result.skipped} 件小件`)
    if (result.oversized) notes.push(`${result.oversized} 件面数过高`)

    status.value = notes.join(' · ')
    ready.value = result.partCount > 0 || result.placeholders > 0
    emit('loaded', result.partCount)
  } catch (error) {
    if (current !== requestId) return
    // useAssembly 失败时内部已把 explode 归零，滑块显示同步复位
    explodeValue.value = 0
    status.value = `组合失败：${(error as Error).message}`
    ready.value = false
  }
}

function onExplode(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  explodeValue.value = value
  assembly.setExplode(value)
}

/** 指针事件只有直接落在画布上才参与拾取，避免 dock / hud 上的点击与悬停穿透到部件 */
function isCanvasTarget(event: PointerEvent): boolean {
  const target = event.target as HTMLElement | null
  return !!target && target.tagName === 'CANVAS'
}

/**
 * 按下时指针是否落在画布上。
 * 拖动后指针捕获可能让 pointerup 的 target 变成容器，因此抬起判定不能看 up 时的 target。
 */
let downOnCanvas = false

/** 记录左键按下位置，抬起时位移很小才算点击，避免转动视角时误触 */
function onPointerDown(event: PointerEvent): void {
  downOnCanvas = isCanvasTarget(event)
  if (!downOnCanvas || event.button !== 0) {
    downAt = null
    return
  }
  downAt = { x: event.clientX, y: event.clientY }
}

function onPointerUp(event: PointerEvent): void {
  if (!downOnCanvas || !downAt) {
    downAt = null
    downOnCanvas = false
    return
  }
  const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y)
  downAt = null
  downOnCanvas = false
  if (moved > 4) return

  const hit = assembly.pick(event.clientX, event.clientY)
  if (!hit) return

  if (colorStore.dyeMode) {
    // 染色模式：按画笔色覆盖命中部件所属配色键（材质按 colorKey 共享，一次全变）
    colorStore.setColor(hit.colorKey, colorStore.brushColor)
    toast(`已上色：${hit.name}`, 'info')
  } else {
    selected.value = hit.colorKey
    assembly.setHighlight(hit.colorKey)
  }
}

/** 悬停预览高亮；染色模式下不做悬停，避免与上色反馈混淆 */
function onPointerMove(event: PointerEvent): void {
  // 悬停在 dock 等控件上时不再对底层部件 raycast
  if (!isCanvasTarget(event)) return
  if (colorStore.dyeMode) return
  // 拖动旋转视角时不做拾取：既避免与 OrbitControls 抢事件，也省掉每帧 raycast
  if (event.buttons !== 0) return
  const hit = assembly.pick(event.clientX, event.clientY)
  const key = hit?.colorKey ?? null
  if (key !== hovered.value) {
    hovered.value = key
    assembly.setHighlight(key ?? selected.value)
  }
}

function onPointerLeave(): void {
  hovered.value = null
  assembly.setHighlight(selected.value)
}

onBeforeUnmount(() => {
  requestId++
  assembly.reset()
})
</script>

<style scoped>
.assembly-view {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--stage, #131310);
}
.hud {
  position: absolute;
  top: 16px;
  left: 18px;
  display: grid;
  gap: 2px;
  color: var(--paper, #e9e4d6);
  pointer-events: none;
}
.hud-kicker {
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--accent, #ff6b00);
}
.hud b {
  font-family: var(--display, 'Segoe UI', sans-serif);
  font-size: 20px;
  letter-spacing: 0.04em;
}
.hud-stats {
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 11px;
  opacity: 0.7;
}
.dock {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--stage, #131310) 82%, transparent);
  border: 1px solid rgba(233, 228, 214, 0.16);
  border-radius: 3px;
}
.explode {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  color: var(--paper, #e9e4d6);
  font-size: 12px;
}
.explode em {
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 9px;
  letter-spacing: 0.14em;
  opacity: 0.55;
  font-style: normal;
}
.explode input {
  flex: 1;
  accent-color: var(--accent, #ff6b00);
}
.explode span {
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 11px;
  min-width: 36px;
  text-align: right;
}
.views {
  display: flex;
  gap: 6px;
}
.views button {
  padding: 5px 12px;
  font-size: 11px;
  color: var(--paper, #e9e4d6);
  background: transparent;
  border: 1px solid rgba(233, 228, 214, 0.28);
  border-radius: 2px;
  cursor: pointer;
}
.views button:hover:not(:disabled) {
  border-color: var(--accent, #ff6b00);
  color: var(--accent, #ff6b00);
}
.views button:disabled {
  opacity: 0.35;
  cursor: default;
}
.status {
  position: absolute;
  left: 18px;
  bottom: 64px;
  margin: 0;
  font-family: var(--mono, 'Consolas', 'Courier New', monospace);
  font-size: 11px;
  color: var(--paper, #e9e4d6);
  opacity: 0.7;
}
</style>

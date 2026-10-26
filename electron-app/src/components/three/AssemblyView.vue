<template>
  <div class="assembly-view">
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
import { useColorStore } from '@/stores/color'

const props = defineProps<{
  /** 展示标题；省略时使用默认文案 */
  title?: string
  /** 部件完整路径与类别，路径用于加载与唯一反查 */
  parts: { path: string; category: string }[]
}>()

const emit = defineEmits<{ loaded: [count: number] }>()

const canvas = ref<InstanceType<typeof ThreeCanvas> | null>(null)
const colorStore = useColorStore()
const assembly = useAssembly()

const explodeValue = ref(0)
const ready = ref(false)
const status = ref('')
const stats = ref('—')

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
  { deep: true, immediate: true },
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
    const result = await assembly.build(list, (category) => colorStore.colorFor(category))
    // 组件已发起更新的构建，旧结果只清理不展示
    if (current !== requestId || result.stale) return

    explodeValue.value = 0
    stats.value = `${result.partCount} 件 · ${(result.triangles / 1000).toFixed(0)}K 面`

    const notes: string[] = []
    if (result.failed) {
      notes.push(
        result.placeholders
          ? `${result.failed} 件读取失败（红色线框为缺失占位）`
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
    status.value = `组合失败：${(error as Error).message}`
    ready.value = false
  }
}

function onExplode(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  explodeValue.value = value
  assembly.setExplode(value)
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

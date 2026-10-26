<template>
  <transition name="slide">
    <aside v-if="open" class="drawer" role="dialog" aria-modal="true" aria-label="打印清单">
      <header class="head">
        <div>
          <span class="kicker">PACKING LIST</span>
          <b>打印清单</b>
        </div>
        <div class="count"><b>{{ bom.fileCount }}</b><span>ITEMS</span></div>
        <button class="close" aria-label="关闭" @click="emit('update:open', false)">×</button>
      </header>

      <section class="library">
        <div>
          <b>本地 STL 库</b>
          <span :title="library.ready ? library.root ?? '' : undefined">{{ librarySummary }}</span>
        </div>
        <button @click="library.choose()">更换目录</button>
      </section>

      <section class="progress">
        <div
          class="bar"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="bom.progress"
        >
          <i :style="{ width: `${bom.progress}%` }" />
        </div>
        <span>{{ bom.doneCount }} / {{ bom.fileCount }} 已完成 · {{ bom.progress }}%</span>
      </section>

      <ul class="list">
        <BomItemRow v-for="item in bom.items" :key="item.path" :item="item" />
        <li v-if="!bom.items.length" class="empty">清单为空。在构型或部件库中加入部件。</li>
      </ul>

      <footer class="foot">
        <div class="totals">
          <div><span>文件</span><b>{{ bom.fileCount }}</b></div>
          <div><span>件数</span><b>{{ bom.totalQty }}</b></div>
          <div><span>体积</span><b>{{ totalSize }}</b></div>
        </div>
        <button class="export" :disabled="!canExport || exporting" @click="startExport">
          {{ exporting ? '打包中…' : '打包下载 STL' }}
        </button>
        <p v-if="exportStatus" class="export-status" :title="exportStatus">{{ exportStatus }}</p>
        <button v-if="exporting" class="cancel" @click="cancel">取消导出</button>
        <button class="clear" :disabled="!bom.items.length" @click="bom.clear()">清空清单</button>
      </footer>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BomItemRow from './BomItemRow.vue'
import { useBomStore } from '@/stores/bom'
import { useLibraryStore } from '@/stores/library'
import { toast } from '@/composables/useToast'
import type { ExportProgress } from '@/types/api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const bom = useBomStore()
const library = useLibraryStore()

const exporting = ref(false)
const exportStatus = ref('')
const jobId = ref('')
// 当前导出进度订阅的取消函数，切换任务或卸载时统一清理
let unsubscribe: (() => void) | null = null
// 进度事件与 IPC 结果可能先后到达，用一个标记避免重复 toast / 状态覆盖
let settled = false

const librarySummary = computed(() => {
  if (!library.checked) return '检测中…'
  if (library.ready) return library.root ?? ''
  if (library.root && !library.valid) return `目录不完整 · ${library.root}`
  return '未配置 · 下载与预览需要本地 STL'
})

const canExport = computed(() => library.ready && bom.items.length > 0)

const totalSize = computed(() => formatBytes(bom.totalBytes))

// 体积展示：≥1 GB 用 GB，否则用 MB，均保留一位小数
function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function detachProgress(): void {
  unsubscribe?.()
  unsubscribe = null
}

function startExport(): void {
  if (!canExport.value || exporting.value) return
  exporting.value = true
  exportStatus.value = '准备中…'
  jobId.value = `job-${Date.now()}`
  settled = false

  // 开始新任务前先解绑旧订阅，避免重复监听
  detachProgress()
  unsubscribe = window.vaultApi.onExportProgress((progress: ExportProgress) => {
    // 主进程可能同时推送其他任务的事件，只处理当前 jobId
    if (progress.jobId !== jobId.value) return
    if (progress.state === 'running') {
      exportStatus.value = `${progress.done} / ${progress.total} · ${progress.currentFile}`
      return
    }
    // 终态：只处理一次，IPC 抛错时 catch 里不再重复提示
    if (settled) return
    settled = true
    exporting.value = false
    detachProgress()
    if (progress.state === 'done') {
      exportStatus.value = ''
      toast('打包完成')
    } else if (progress.state === 'canceled') {
      exportStatus.value = ''
      toast('已取消导出', 'warn')
    } else {
      const reason = progress.error ?? '未知错误'
      exportStatus.value = `导出失败：${reason}`
      toast(`导出失败：${reason}`, 'warn')
    }
  })

  window.vaultApi
    .exportZip(
      bom.items.map((i) => i.path),
      jobId.value,
    )
    .then((result) => {
      if (result.canceled && !settled) {
        settled = true
        exporting.value = false
        exportStatus.value = ''
        detachProgress()
      }
    })
    .catch((error: Error) => {
      // 终态已由进度事件处理过，避免重复 toast
      if (settled) return
      settled = true
      exporting.value = false
      detachProgress()
      exportStatus.value = `导出失败：${error.message}`
      toast(`导出失败：${error.message}`, 'warn')
    })
}

function cancel(): void {
  window.vaultApi.cancelExport(jobId.value)
  exportStatus.value = '正在取消…'
}

function onKeydown(event: KeyboardEvent): void {
  // 导出进行中时先不打断，避免误关导致状态不可见
  if (event.key === 'Escape' && props.open && !exporting.value) {
    emit('update:open', false)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  detachProgress()
})
</script>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  display: flex;
  flex-direction: column;
  width: var(--bom-w);
  background: var(--paper-hi);
  border-left: 1px solid var(--line);
  box-shadow: -10px 0 30px rgba(20, 20, 15, 0.12);
}
.head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}
.kicker {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
.head b {
  font-family: var(--display);
  font-size: 20px;
}
.count {
  display: grid;
  justify-items: end;
  margin-left: auto;
}
.count b {
  font-family: var(--mono);
  font-size: 18px;
}
.count span {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.close {
  width: 26px;
  height: 26px;
  font-size: 17px;
  line-height: 1;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.close:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.library {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  border-bottom: 1px solid var(--line-soft);
}
.library > div {
  display: grid;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.library b {
  font-size: 11px;
}
.library span {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.library button {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: 10px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.library button:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.progress {
  display: grid;
  gap: 5px;
  padding: 10px 18px;
}
.bar {
  height: 3px;
  background: var(--paper-dim);
  border-radius: 2px;
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.24s var(--ease);
}
.progress span {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
}
.list {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}
.empty {
  padding: 28px 18px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}
.foot {
  display: grid;
  gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid var(--line);
}
.totals {
  display: flex;
  gap: 22px;
}
.totals div {
  display: grid;
  gap: 1px;
}
.totals span {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.totals b {
  font-family: var(--mono);
  font-size: 15px;
}
.export {
  padding: 10px;
  font-size: 13px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
}
.export:hover:not(:disabled) {
  background: var(--accent);
}
.export:disabled {
  opacity: 0.4;
  cursor: default;
}
.export-status {
  margin: 0;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cancel,
.clear {
  padding: 6px;
  font-size: 11px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
  color: var(--muted);
}
.cancel:hover,
.clear:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.clear:disabled {
  opacity: 0.4;
  cursor: default;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.26s var(--ease);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>

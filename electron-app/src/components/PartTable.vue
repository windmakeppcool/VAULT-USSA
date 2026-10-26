<template>
  <div ref="scrollRef" class="table-scroll">
    <div class="spacer" :style="{ height: `${totalSize}px` }">
      <div class="rows" :style="{ transform: `translateY(${items[0]?.start ?? 0}px)` }">
        <div v-for="virtual in items" :key="String(virtual.key)" class="row">
          <span class="name" :title="rowFor(virtual.index)?.p ?? ''">
            {{ rowFor(virtual.index)?.n ?? '' }}
          </span>
          <span class="family">{{ rowFor(virtual.index)?.f ?? '—' }}</span>
          <span class="category">{{ rowFor(virtual.index)?.c ?? '' }}</span>
          <span class="support">{{ rowFor(virtual.index)?.u ? '需支撑' : '' }}</span>
          <button type="button" @click="addEntry(rowFor(virtual.index))">加入</button>
        </div>
      </div>
    </div>
    <p v-if="!entries.length" class="empty">没有匹配的部件，试试调整搜索或筛选条件。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useBomStore } from '@/stores/bom'
import { toast } from '@/composables/useToast'
import type { ManifestEntry } from '@/data/types'

const props = defineProps<{ entries: ManifestEntry[] }>()
const bom = useBomStore()

const ROW_HEIGHT = 32
const scrollRef = ref<HTMLElement | null>(null)

// 官方推荐的 Vue 用法：整份 options 用 computed 承载，count 变化才能驱动
// virtualizer 重新计算；传普通对象再内嵌 computed 不会建立依赖。
const virtualizer = useVirtualizer(
  computed(() => ({
    count: props.entries.length,
    getScrollElement: () => scrollRef.value,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })),
)

const items = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// 筛选结果变化时回到顶部，避免停留在旧列表越界后的空白区域
watch(
  () => props.entries,
  () => {
    if (scrollRef.value) scrollRef.value.scrollTop = 0
  },
)

/** 虚拟行索引在列表切换瞬间可能短暂越界，读取时统一判空 */
function rowFor(index: number): ManifestEntry | undefined {
  return props.entries[index]
}

function addEntry(entry: ManifestEntry | undefined): void {
  if (!entry) return
  bom.add(entry.p, entry.n, entry.q, entry.c)
  toast(`已加入：${entry.n}`)
}
</script>

<style scoped>
.table-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.spacer {
  position: relative;
}
.rows {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 60px 110px 60px 56px;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 var(--gutter);
  border-bottom: 1px solid var(--line-soft);
}
.row:hover {
  background: var(--paper-hi);
}
.name {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.family,
.category,
.support {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
.row button {
  padding: 3px 9px;
  font-size: 10px;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.row button:hover {
  color: var(--paper-hi);
  background: var(--accent);
  border-color: var(--accent);
}
.empty {
  margin: 0;
  padding: 48px var(--gutter);
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}
</style>

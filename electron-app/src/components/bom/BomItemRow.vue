<template>
  <li class="row" :class="{ 'is-done': item.done }">
    <input
      type="checkbox"
      :checked="item.done"
      :aria-label="`标记 ${item.name} 已完成`"
      @change="bom.toggleDone(item.path)"
    />
    <div class="meta">
      <span class="name" :title="item.path">{{ item.name }}</span>
      <span class="path">{{ item.path }}</span>
    </div>
    <input
      class="qty"
      type="number"
      min="1"
      step="1"
      :value="item.qty"
      :aria-label="`${item.name} 份数`"
      @change="onQty"
    />
    <select class="batch" :value="item.batchStatus" :aria-label="`${item.name} 批次状态`" @change="onBatch">
      <option value="pending">待打印</option>
      <option value="printed">已打印</option>
      <option value="assembled">已组装</option>
    </select>
    <button class="remove" aria-label="移除" @click="bom.remove(item.path)">×</button>
  </li>
</template>

<script setup lang="ts">
import { useBomStore, type BomItem } from '@/stores/bom'

const props = defineProps<{ item: BomItem }>()
const bom = useBomStore()

// 份数变更后交给 store 统一做取整与下限钳制
function onQty(event: Event): void {
  bom.setQty(props.item.path, Number((event.target as HTMLInputElement).value))
}

function onBatch(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as BomItem['batchStatus']
  bom.setBatch(props.item.path, value)
}
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: auto 1fr 52px 88px 22px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-bottom: 1px solid var(--line-soft);
}
.row.is-done .name {
  text-decoration: line-through;
  opacity: 0.5;
}
.meta {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.name {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.path {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qty {
  width: 48px;
  padding: 3px 5px;
  font-family: var(--mono);
  font-size: 11px;
  text-align: center;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
}
.batch {
  padding: 3px 4px;
  font-size: 10px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
}
.remove {
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 1;
  color: var(--muted);
  background: transparent;
  border: none;
  border-radius: 2px;
}
.remove:hover {
  color: var(--accent);
  background: var(--paper-dim);
}
</style>

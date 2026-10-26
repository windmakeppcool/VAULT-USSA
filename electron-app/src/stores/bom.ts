import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { SceneGroup } from '@/data/types'

export interface BomItem {
  path: string
  name: string
  qty: number
  done: boolean
  batchStatus: 'pending' | 'printed' | 'assembled'
  colorKey: string
}

const STORAGE_KEY = 'vault-ussa-bom-v2'
const clampQty = (value: number) => Math.max(1, Math.floor(Number(value) || 1))

export const useBomStore = defineStore('bom', () => {
  const storageKey = STORAGE_KEY
  const items = ref<BomItem[]>([])

  function load(): void {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (parsed && Array.isArray(parsed.items)) {
        items.value = parsed.items
          .filter((i: BomItem) => typeof i?.path === 'string')
          .map((i: BomItem) => ({
            path: i.path,
            name: i.name ?? i.path,
            qty: clampQty(i.qty),
            done: Boolean(i.done),
            batchStatus: i.batchStatus ?? 'pending',
            colorKey: i.colorKey ?? '',
          }))
      }
    } catch {
      items.value = []
    }
  }

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items.value }))
    } catch {
      // 存储不可用时静默降级，不阻断使用
    }
  }

  load()
  watch(items, persist, { deep: true, flush: 'sync' })

  const fileCount = computed(() => items.value.length)
  const totalQty = computed(() => items.value.reduce((sum, i) => sum + i.qty, 0))
  const doneCount = computed(() => items.value.filter((i) => i.done).length)
  const progress = computed(() =>
    items.value.length === 0 ? 0 : Math.round((doneCount.value / items.value.length) * 100),
  )

  function add(path: string, name: string, qty = 1, colorKey = ''): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) {
      hit.qty = clampQty(hit.qty + clampQty(qty))
      return
    }
    items.value.push({
      path,
      name,
      qty: clampQty(qty),
      done: false,
      batchStatus: 'pending',
      colorKey,
    })
  }

  function setQty(path: string, qty: number): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) hit.qty = clampQty(qty)
  }

  function toggleDone(path: string): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) hit.done = !hit.done
  }

  function setBatch(path: string, status: BomItem['batchStatus']): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) hit.batchStatus = status
  }

  function remove(path: string): void {
    items.value = items.value.filter((i) => i.path !== path)
  }

  function clear(): void {
    items.value = []
  }

  function applyTemplate(group: SceneGroup): void {
    items.value = group.items.map((item) => ({
      path: item.p,
      name: item.p.split('/').pop() ?? item.p,
      qty: clampQty(item.q),
      done: false,
      batchStatus: 'pending' as const,
      colorKey: item.part,
    }))
  }

  function exportList(): { path: string; qty: number }[] {
    return items.value.map((i) => ({ path: i.path, qty: i.qty }))
  }

  return {
    storageKey,
    items,
    fileCount,
    totalQty,
    doneCount,
    progress,
    add,
    setQty,
    toggleDone,
    setBatch,
    remove,
    clear,
    applyTemplate,
    exportList,
  }
})

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { VAULT_DATA } from '@/data/manifest'
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
const LEGACY_KEY = 'vault-ussat-config-v1'
const MIGRATED_KEY = 'vault-ussa-bom-migrated'
const clampQty = (value: number) => {
  const n = Math.floor(Number(value) || 1)
  return Number.isFinite(n) ? Math.max(1, n) : 1
}

// 路径 → 字节数，模块顶层建一次，供 totalBytes 派生计算复用
const SIZE_BY_PATH = new Map(VAULT_DATA.files.map((f) => [f.p, f.s]))

export const useBomStore = defineStore('bom', () => {
  const storageKey = STORAGE_KEY
  const items = ref<BomItem[]>([])

  function loadLegacy(): BomItem[] {
    try {
      const raw = localStorage.getItem(LEGACY_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      const bom = parsed?.bom
      if (!Array.isArray(bom)) return []
      return bom
        .filter((i: { p?: unknown }) => typeof i?.p === 'string' && i.p)
        .map((i: { p: string; q?: number; done?: boolean }) => ({
          path: i.p,
          name: i.p.split('/').pop() ?? i.p,
          qty: clampQty(i.q ?? 1),
          done: Boolean(i.done),
          batchStatus: 'pending' as const,
          colorKey: '',
        }))
    } catch {
      return []
    }
  }

  function load(): void {
    // 迁移只做一次：已迁移过就不再自动注入旧数据
    const migrated = (() => {
      try {
        return localStorage.getItem(MIGRATED_KEY) === '1'
      } catch {
        return false
      }
    })()

    let loadedNew = false
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
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
        loadedNew = true
      }
    } catch {
      items.value = []
    }
    // 新 key 无有效条目且尚未迁移时，尝试迁移旧版清单数据
    if (!loadedNew && !migrated) {
      const legacy = loadLegacy()
      if (legacy.length) {
        items.value = legacy
        // 迁移结果立即落到新 key（旧 key 保留，不删除）
        persist()
      }
      // 无论是否读到旧数据都写标记：用户已启动过新版一次，不再自动注入
      try {
        localStorage.setItem(MIGRATED_KEY, '1')
      } catch {
        // 存储不可用时静默降级
      }
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
  const totalBytes = computed(() =>
    items.value.reduce((sum, i) => sum + (SIZE_BY_PATH.get(i.path) ?? 0) * i.qty, 0),
  )
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
    totalBytes,
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

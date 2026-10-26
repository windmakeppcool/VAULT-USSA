import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useLibraryStore = defineStore('library', () => {
  const root = ref<string | null>(null)
  const valid = ref(false)
  const missing = ref<string[]>([])
  const checked = ref(false)

  const ready = computed(() => valid.value && Boolean(root.value))

  async function refresh(): Promise<void> {
    try {
      const state = await window.vaultApi.getLibraryState()
      root.value = state.root
      valid.value = state.valid
      missing.value = state.missing
    } catch (error) {
      // 读取失败时保持现有状态，并结束加载态避免界面卡住
      console.warn('[library] 读取库状态失败', error)
    } finally {
      checked.value = true
    }
  }

  async function choose(): Promise<void> {
    try {
      const state = await window.vaultApi.selectLibraryRoot()
      root.value = state.root
      valid.value = state.valid
      missing.value = state.missing
    } catch (error) {
      // 选择失败时保持现有状态，并结束加载态避免界面卡住
      console.warn('[library] 选择库根目录失败', error)
    } finally {
      checked.value = true
    }
  }

  return { root, valid, missing, checked, ready, refresh, choose }
})

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useLibraryStore = defineStore('library', () => {
  const root = ref<string | null>(null)
  const valid = ref(false)
  const missing = ref<string[]>([])
  const checked = ref(false)

  const ready = computed(() => valid.value && Boolean(root.value))

  async function refresh(): Promise<void> {
    const state = await window.vaultApi.getLibraryState()
    root.value = state.root
    valid.value = state.valid
    missing.value = state.missing
    checked.value = true
  }

  async function choose(): Promise<void> {
    const state = await window.vaultApi.selectLibraryRoot()
    root.value = state.root
    valid.value = state.valid
    missing.value = state.missing
    checked.value = true
  }

  return { root, valid, missing, checked, ready, refresh, choose }
})

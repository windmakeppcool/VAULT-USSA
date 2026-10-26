import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { VAULT_DATA } from '@/data/manifest'
import type { ManifestEntry } from '@/data/types'

export type BuildMode = 'drawer' | 'sustainer' | 'mod'

const GROUP_OF: Record<BuildMode, ManifestEntry['g']> = {
  drawer: 'drawers',
  sustainer: 'sustainers',
  mod: 'mods',
}

export const useConfigStore = defineStore('config', () => {
  const mode = ref<BuildMode>('drawer')
  const family = ref<string>('S')
  const size = ref<string>('3')
  const height = ref<string>('1F')

  const matchedParts = computed<ManifestEntry[]>(() =>
    VAULT_DATA.files.filter(
      (entry) =>
        entry.g === GROUP_OF[mode.value] &&
        (mode.value === 'mod' || entry.f === family.value) &&
        (mode.value === 'mod' || !entry.z || entry.z === size.value) &&
        (mode.value === 'mod' || !entry.h || entry.h === height.value),
    ),
  )

  const sheetCode = computed(() =>
    mode.value === 'mod' ? 'MOD' : `${family.value} / ${size.value} / ${height.value}`,
  )

  return { mode, family, size, height, matchedParts, sheetCode }
})

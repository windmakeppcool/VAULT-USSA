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

  const matchedParts = computed<ManifestEntry[]>(() => {
    const group = GROUP_OF[mode.value]
    const isMod = mode.value === 'mod'
    return VAULT_DATA.files.filter((entry) => {
      if (entry.g !== group) return false
      if (isMod) {
        // 旧版改装件规则：通用族 U 恒通过，null 字段表示不限制
        if (entry.f && entry.f !== 'U' && entry.f !== family.value) return false
        if (entry.z && entry.z !== size.value) return false
        if (entry.h && entry.h !== height.value) return false
        return true
      }
      // 抽屉 / 支撑沿用旧版的严格族匹配，U 族不参与
      if (entry.f !== family.value) return false
      if (entry.z && entry.z !== size.value) return false
      if (entry.h && entry.h !== height.value) return false
      return true
    })
  })

  const sheetCode = computed(() =>
    mode.value === 'mod' ? 'MOD' : `${family.value} / ${size.value} / ${height.value}`,
  )

  return { mode, family, size, height, matchedParts, sheetCode }
})

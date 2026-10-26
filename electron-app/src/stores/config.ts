import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { VAULT_DATA } from '@/data/manifest'
import type { ManifestEntry } from '@/data/types'

export type BuildMode = 'drawer' | 'sustainer' | 'mod'

const GROUP_OF: Record<BuildMode, ManifestEntry['g']> = {
  drawer: 'drawers',
  sustainer: 'sustainers',
  mod: 'mods',
}

/**
 * 各模式可选规格族。manifest 的 f 字段是 ASCII（如 "L2"），
 * 界面展示用上标（如 "L²"），所以 value 与 label 必须分离。
 * 可选集合与旧版 configurator/app.js:43-45 保持一致。
 */
export const FAMILY_OPTIONS: Record<BuildMode, { value: string; label: string }[]> = {
  drawer: [
    { value: 'S', label: 'S' },
    { value: 'M', label: 'M' },
    { value: 'L', label: 'L' },
    { value: 'XL', label: 'XL' },
    { value: 'L2', label: 'L²' },
    { value: 'XL2', label: 'XL²' },
  ],
  sustainer: [
    { value: 'S', label: 'S' },
    { value: 'M', label: 'M' },
    { value: 'L', label: 'L' },
    { value: 'XL', label: 'XL' },
  ],
  mod: [
    { value: 'S', label: 'S' },
    { value: 'M', label: 'M' },
    { value: 'L', label: 'L' },
    { value: 'XL', label: 'XL' },
  ],
}

/** 族值到界面标签的映射，用于 sheetCode 等展示位置 */
export const FAMILY_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(FAMILY_OPTIONS)
    .flat()
    .map((option) => [option.value, option.label]),
)

export const useConfigStore = defineStore('config', () => {
  const mode = ref<BuildMode>('drawer')
  const family = ref<string>('S')
  const size = ref<string>('3')
  const height = ref<string>('1F')

  // 切换模式时把族归一到该模式允许的值，避免继承到不允许的族（如 drawer 的 L2）。
  // 用同步 flush：赋值后立即读取 matchedParts 也能拿到归一后的正确结果。
  watch(
    mode,
    (next) => {
      if (!FAMILY_OPTIONS[next].some((option) => option.value === family.value)) {
        family.value = 'S'
      }
    },
    { flush: 'sync' },
  )

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

  const sheetCode = computed(() => {
    const label = FAMILY_LABELS[family.value] ?? family.value
    const spec = `${label} / ${size.value} / ${height.value}`
    // 改装件与其它模式同格式，前缀区分模式，避免只看规格误判
    return mode.value === 'mod' ? `MOD · ${spec}` : spec
  })

  return { mode, family, size, height, matchedParts, sheetCode }
})

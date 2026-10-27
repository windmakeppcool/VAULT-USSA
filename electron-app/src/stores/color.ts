import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { VAULT_PALETTES } from '@/data/palettes'
import { colorKeyFor, type ColorKeySource } from '@/lib/color-key'

export const useColorStore = defineStore('color', () => {
  const activePreset = ref(VAULT_PALETTES.defaultPreset)
  const colors = ref<Record<string, string>>({
    ...VAULT_PALETTES.presets[VAULT_PALETTES.defaultPreset].colors,
  })
  const brushColor = ref('#ff6b00')
  const dyeMode = ref(false)

  function applyPreset(id: string): void {
    const preset = VAULT_PALETTES.presets[id]
    if (!preset) return
    activePreset.value = id
    colors.value = { ...preset.colors }
  }

  function setColor(key: string, hex: string): void {
    colors.value = { ...colors.value, [key]: hex }
    activePreset.value = 'custom'
  }

  /**
   * 取色：既可传调色板键（配色工作台），也可传 manifest 部件条目
   * （由 colorKeyFor 换算成调色板键）。缺色时退回强调色，再退回工程橙。
   */
  function colorFor(keyOrEntry: string | ColorKeySource): string {
    const key = typeof keyOrEntry === 'string' ? keyOrEntry : colorKeyFor(keyOrEntry)
    return colors.value[key] ?? colors.value.accent ?? '#ff6b00'
  }

  const swatches = computed(() => VAULT_PALETTES.swatches)

  return { activePreset, colors, brushColor, dyeMode, swatches, applyPreset, setColor, colorFor }
})

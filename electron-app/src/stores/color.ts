import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { VAULT_PALETTES } from '@/data/palettes'

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

  function colorFor(partKey: string): string {
    return colors.value[partKey] ?? '#ff6b00'
  }

  const swatches = computed(() => VAULT_PALETTES.swatches)

  return { activePreset, colors, brushColor, dyeMode, swatches, applyPreset, setColor, colorFor }
})

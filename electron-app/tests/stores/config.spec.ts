import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigStore } from '@/stores/config'

describe('构型 store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('默认抽屉模式匹配到非空部件集', () => {
    const config = useConfigStore()
    expect(config.mode).toBe('drawer')
    expect(config.matchedParts.length).toBeGreaterThan(0)
  })

  it('匹配结果都属于当前分组', () => {
    const config = useConfigStore()
    for (const part of config.matchedParts) {
      expect(part.g).toBe('drawers')
    }
  })

  it('切换族群后匹配结果随之变化', () => {
    const config = useConfigStore()
    const first = config.matchedParts.length
    config.family = 'XL'
    expect(config.matchedParts.length).not.toBe(first)
  })

  it('改装件模式按族群与档位过滤（U 族恒通过）', () => {
    const config = useConfigStore()
    config.mode = 'mod'
    config.family = 'S'
    const s = config.matchedParts
    expect(s.length).toBeGreaterThan(0)
    for (const part of s) {
      expect(part.g).toBe('mods')
      expect(part.f === null || part.f === 'U' || part.f === 'S').toBe(true)
    }
    config.family = 'XL'
    const xl = config.matchedParts
    expect(xl.map((p) => p.p)).not.toEqual(s.map((p) => p.p))
  })

  it('sheetCode 反映当前构型', () => {
    const config = useConfigStore()
    config.family = 'M'
    config.size = '4'
    config.height = '2F'
    expect(config.sheetCode).toBe('M / 4 / 2F')
  })
})

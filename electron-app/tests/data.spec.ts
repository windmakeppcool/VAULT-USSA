import { describe, it, expect } from 'vitest'
import { VAULT_DATA } from '@/data/manifest'
import { VAULT_ORIENTATIONS } from '@/data/orientations'
import { VAULT_3D } from '@/data/thumbnails'
import { VAULT_SCENE_TEMPLATES } from '@/data/scene-templates'
import { VAULT_PALETTES } from '@/data/palettes'

describe('迁移后的数据完整性', () => {
  it('清单包含 756 个 STL', () => {
    expect(VAULT_DATA.files).toHaveLength(756)
  })

  it('三个分组的数量与旧版一致', () => {
    const counts = VAULT_DATA.files.reduce<Record<string, number>>((acc, f) => {
      acc[f.g] = (acc[f.g] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toEqual({ drawers: 433, sustainers: 225, mods: 98 })
  })

  it('所有路径都以三个顶层目录之一开头', () => {
    const prefixes = ['01. DRAWERS/', '02. SUSTAINERS/', '03. MODIFICATIONS/']
    for (const file of VAULT_DATA.files) {
      expect(prefixes.some((p) => file.p.startsWith(p))).toBe(true)
    }
  })

  it('路径中的特殊字符被逐字保留', () => {
    const paths = VAULT_DATA.files.map((f) => f.p)
    expect(paths.some((p) => p.includes('²'))).toBe(true)
    expect(paths.some((p) => p.includes('(Turn On Supports)'))).toBe(true)
  })

  it('姿态表覆盖 743 件且矩阵为 9 个有限数', () => {
    const entries = Object.entries(VAULT_ORIENTATIONS)
    expect(entries).toHaveLength(743)
    for (const [path, m] of entries) {
      expect(m, path).toHaveLength(9)
      for (const v of m) expect(Number.isFinite(v), path).toBe(true)
    }
  })

  it('缩略图映射同样覆盖 743 件', () => {
    expect(Object.keys(VAULT_3D)).toHaveLength(743)
  })

  it('场景模板有 13 组', () => {
    expect(VAULT_SCENE_TEMPLATES.groups).toHaveLength(13)
  })

  it('配色有 10 个色板与 5 套预设', () => {
    expect(VAULT_PALETTES.swatches).toHaveLength(10)
    expect(Object.keys(VAULT_PALETTES.presets)).toHaveLength(5)
    expect(VAULT_PALETTES.defaultPreset).toBe('classic_industrial')
  })
})

import { describe, it, expect } from 'vitest'
import { VAULT_DATA } from '@/data/manifest'
import { VAULT_ORIENTATIONS } from '@/data/orientations'
import { VAULT_3D } from '@/data/thumbnails'
import { VAULT_SCENE_TEMPLATES } from '@/data/scene-templates'
import { VAULT_PALETTES } from '@/data/palettes'
import { VAULT_GUIDE_DATA } from '@/data/guide-content'

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

  it('路径中的特殊字符被逐字保留（按数量断言）', () => {
    const paths = VAULT_DATA.files.map((f) => f.p)
    // 数量来自源清单统计：任何一条丢失或字符被替换都会导致计数下降
    expect(paths.filter((p) => p.includes('²'))).toHaveLength(30)
    expect(paths.filter((p) => p.includes('Heawyweight'))).toHaveLength(12)
    expect(paths.filter((p) => p.includes('(Turn On Supports)'))).toHaveLength(12)
    expect(paths.filter((p) => p.includes(' '))).toHaveLength(756)
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

  it('指南数据的顶层分区完整', () => {
    // 该模块字面量内含 /* ... */ 注释，是迁移脚本 extractAt() 无注释状态机时唯一
    // 可能被静默截断的模块；先锁住顶层键，确保解析没有中途停止
    expect(Object.keys(VAULT_GUIDE_DATA).sort()).toEqual([
      'assembly',
      'manuals',
      'mounts',
      'smallParts'
    ])
  })

  it('指南组装章节结构与源数据一致', () => {
    const assembly = VAULT_GUIDE_DATA.assembly as Record<string, unknown>
    expect(assembly).toBeTypeOf('object')
    expect(assembly).not.toBeNull()
    // 源数据只包含 drawer 与 sustainer 两个组装流程，没有 mod
    expect(Object.keys(assembly).sort()).toEqual(['drawer', 'sustainer'])

    for (const key of ['drawer', 'sustainer']) {
      const section = assembly[key] as {
        name: unknown
        doc: unknown
        pages: unknown
        steps: unknown
      }
      expect(section, key).toBeTypeOf('object')
      expect(section, key).not.toBeNull()

      expect(typeof section.name, `${key}.name`).toBe('string')
      expect((section.name as string).length, `${key}.name`).toBeGreaterThan(0)
      expect(typeof section.doc, `${key}.doc`).toBe('string')

      expect(Array.isArray(section.pages), `${key}.pages`).toBe(true)
      const pages = section.pages as unknown[]
      expect(pages.length, `${key}.pages`).toBeGreaterThan(0)
      for (const page of pages) expect(typeof page, `${key}.pages`).toBe('number')

      expect(Array.isArray(section.steps), `${key}.steps`).toBe(true)
      expect((section.steps as unknown[]).length, `${key}.steps`).toBeGreaterThan(0)
    }
  })
})

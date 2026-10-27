import { describe, it, expect } from 'vitest'
import { colorKeyFor } from '@/lib/color-key'

describe('配色键映射', () => {
  it('类别映射到调色板键', () => {
    expect(colorKeyFor({ name: 'X', path: 'a.stl', category: 'rail' })).toBe('rails')
    expect(colorKeyFor({ name: 'X', path: 'a.stl', category: 'rod' })).toBe('rods')
    expect(colorKeyFor({ name: 'X', path: 'a.stl', category: 'runner' })).toBe('rails')
    expect(colorKeyFor({ name: 'X', path: 'a.stl', category: 'wheels' })).toBe('wheels')
  })

  it('名称规则优先于类别', () => {
    expect(colorKeyFor({ name: 'Runner Stopper', path: 'x.stl', category: 'runner' })).toBe('stopper')
    expect(colorKeyFor({ name: 'Runner Guides', path: 'x.stl', category: 'runner' })).toBe('guides')
    expect(colorKeyFor({ name: 'Lock Holder', path: 'x.stl', category: 'lock' })).toBe('lockholder')
  })

  it('未知类别回落到 accent', () => {
    expect(colorKeyFor({ name: 'X', path: 'a.stl', category: 'unknown-cat' })).toBe('accent')
  })

  it('key hole 不被当作 key 处理', () => {
    // "Key Hole" 不应命中 /key(?! ?hole)/i
    expect(colorKeyFor({ name: 'Key Hole Cover', path: 'a.stl', category: 'divider' })).toBe('divider')
  })
})

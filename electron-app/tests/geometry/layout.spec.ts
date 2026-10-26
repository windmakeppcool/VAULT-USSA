import { describe, it, expect } from 'vitest'
import { layout, LAYOUT_GAP } from '@/lib/geometry/layout'
import type { LayoutInput } from '@/lib/geometry/layout'
import type { Vec3 } from '@/lib/geometry/vector'

function part(category: string, size: Vec3, split = 0): LayoutInput {
  return { part: { category, name: category, split }, size, quat: [0, 0, 0, 1] }
}

describe('堆叠布局', () => {
  it('空输入返回 null', () => {
    expect(layout([])).toBeNull()
  })

  it('单个盒体放在主体前方（旧实现：抽屉前移）', () => {
    const placed = layout([part('box', [100, 80, 40])])!
    expect(placed[0].center[0]).toBeCloseTo(0, 6)
    // 旧实现：y = -(80 * 0.8 + 18 * 0.45) = -72.1
    expect(placed[0].center[1]).toBeCloseTo(-(80 * 0.8 + LAYOUT_GAP * 0.45), 6)
    expect(placed[0].center[2]).toBeCloseTo(20, 6)
  })

  it('抽屉场景中盒体与模块不重叠', () => {
    const placed = layout([part('box', [100, 80, 40]), part('module', [100, 80, 40])])!
    const box = placed.find((p) => p.entry.part.category === 'box')!
    const mod = placed.find((p) => p.entry.part.category === 'module')!
    expect(box.center[1]).not.toBeCloseTo(mod.center[1], 1)
  })

  it('顶盖位于盒体上方，间距等于 LAYOUT_GAP', () => {
    const placed = layout([part('box', [100, 80, 40]), part('roof', [100, 80, 6])])!
    const roof = placed.find((p) => p.entry.part.category === 'roof')!
    expect(roof.center[2]).toBeCloseTo(40 + LAYOUT_GAP + 3, 6)
  })

  it('前面板位于盒体前方（负 Y）', () => {
    const placed = layout([part('box', [100, 80, 40]), part('facade', [100, 4, 40])])!
    const facade = placed.find((p) => p.entry.part.category === 'facade')!
    expect(facade.center[1]).toBeLessThan(-80)
  })

  it('两个模块沿 X 轴居中对称', () => {
    const placed = layout([part('module', [50, 80, 40]), part('module', [50, 80, 40])])!
    const xs = placed.map((p) => p.center[0]).sort((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(-(50 + LAYOUT_GAP) / 2, 6)
    expect(xs[1]).toBeCloseTo((50 + LAYOUT_GAP) / 2, 6)
  })

  it('Part 1 / Part 2 拆分件取代同类兄弟件', () => {
    const placed = layout([
      part('box', [100, 80, 40]),
      part('roof', [100, 80, 6]),
      part('roof', [50, 80, 6], 1),
      part('roof', [50, 80, 6], 2),
    ])!
    const roofs = placed.filter((p) => p.entry.part.category === 'roof')
    expect(roofs).toHaveLength(2)
    expect(roofs.every((r) => r.entry.part.split > 0)).toBe(true)
  })
})

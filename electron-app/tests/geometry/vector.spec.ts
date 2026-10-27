import { describe, it, expect } from 'vitest'
import { add, sub, scale, dot, cross, normalize, hypot3 } from '@/lib/geometry/vector'
import type { Vec3 } from '@/lib/geometry/vector'

describe('向量运算', () => {
  it('add / sub 按分量计算', () => {
    expect(add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9])
    expect(sub([4, 5, 6], [1, 2, 3])).toEqual([3, 3, 3])
  })

  it('scale 按标量缩放', () => {
    expect(scale([1, -2, 3], 2)).toEqual([2, -4, 6])
  })

  it('dot 计算点积', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32)
  })

  it('cross 计算叉积', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1])
  })

  it('normalize 得到单位向量', () => {
    const v: Vec3 = normalize([3, 4, 0])
    expect(hypot3(v)).toBeCloseTo(1, 10)
  })

  it('normalize 对零向量返回零向量而不产生 NaN', () => {
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0])
  })
})

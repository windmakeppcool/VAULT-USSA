import { describe, it, expect } from 'vitest'
import {
  dequantize,
  quatFromMatrix3,
  rotatedBoxSize,
  canonicalize,
} from '@/lib/geometry/orientation'
import type { QuantizedMesh } from '@/lib/geometry/orientation'
import type { Vec3 } from '@/lib/geometry/vector'

const unitBox: QuantizedMesh = {
  positions: new Uint16Array([0, 0, 0, 65535, 0, 0, 0, 65535, 0, 65535, 65535, 65535]),
  minimum: [0, 0, 0],
  maximum: [10, 20, 30],
}

describe('量化还原', () => {
  it('第 0 个顶点还原为 minimum', () => {
    expect(dequantize(unitBox, 0, [0, 0, 0])).toEqual([0, 0, 0])
  })

  it('第 1 个顶点 X 还原为 maximum.x', () => {
    expect(dequantize(unitBox, 1, [0, 0, 0])).toEqual([10, 0, 0])
  })

  it('第 3 个顶点还原为 maximum', () => {
    expect(dequantize(unitBox, 3, [0, 0, 0])).toEqual([10, 20, 30])
  })
})

describe('旋转矩阵转四元数', () => {
  it('单位矩阵得到恒等四元数', () => {
    const q = quatFromMatrix3([1, 0, 0, 0, 1, 0, 0, 0, 1])
    expect(q[0]).toBeCloseTo(0, 10)
    expect(q[1]).toBeCloseTo(0, 10)
    expect(q[2]).toBeCloseTo(0, 10)
    expect(Math.abs(q[3])).toBeCloseTo(1, 10)
  })

  it('绕 X 轴 90° 得到 ±(√½, 0, 0, √½)', () => {
    const q = quatFromMatrix3([1, 0, 0, 0, 0, -1, 0, 1, 0])
    expect(Math.abs(q[0])).toBeCloseTo(Math.SQRT1_2, 10)
    expect(q[1]).toBeCloseTo(0, 10)
    expect(q[2]).toBeCloseTo(0, 10)
    expect(Math.abs(q[3])).toBeCloseTo(Math.SQRT1_2, 10)
  })
})

describe('旋转后的包围盒尺寸', () => {
  it('恒等旋转保持原尺寸', () => {
    expect(rotatedBoxSize([10, 20, 30], [1, 0, 0, 0, 1, 0, 0, 0, 1])).toEqual([10, 20, 30])
  })

  it('绕 X 轴 90° 交换 Y 与 Z 尺寸', () => {
    const size = rotatedBoxSize([10, 20, 30], [1, 0, 0, 0, 0, -1, 0, 1, 0])
    expect(size[0]).toBeCloseTo(10, 10)
    expect(size[1]).toBeCloseTo(30, 10)
    expect(size[2]).toBeCloseTo(20, 10)
  })
})

describe('canonicalize 兜底规则', () => {
  it('无姿态的 box 不旋转', () => {
    const result = canonicalize(unitBox, 'box', '不存在的路径.stl')
    expect(result.quat).toEqual([0, 0, 0, 1])
    expect(result.size).toEqual([10, 20, 30] as Vec3)
  })

  it('无姿态的 module 若 Y 最矮则绕 X 旋转 90°', () => {
    const mesh: QuantizedMesh = {
      positions: new Uint16Array([0, 0, 0]),
      minimum: [0, 0, 0],
      maximum: [10, 5, 30],
    }
    const result = canonicalize(mesh, 'module', '不存在的路径.stl')
    expect(result.quat[0]).toBeCloseTo(Math.SQRT1_2, 10)
    expect(result.size).toEqual([10, 30, 5] as Vec3)
  })
})

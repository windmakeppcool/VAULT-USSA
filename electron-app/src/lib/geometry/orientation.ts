import type { Vec3 } from './vector'
import { add, cross, dot, hypot3, normalize, scale, sub } from './vector'
import { VAULT_ORIENTATIONS } from '@/data/orientations'

export type Quat = [number, number, number, number]

export interface QuantizedMesh {
  positions: Uint16Array
  minimum: Vec3
  maximum: Vec3
}

export interface Canonical {
  quat: Quat
  size: Vec3
  local: Vec3
}

export function dequantize(entry: QuantizedMesh, i: number, out: Vec3): Vec3 {
  const size: Vec3 = [
    entry.maximum[0] - entry.minimum[0],
    entry.maximum[1] - entry.minimum[1],
    entry.maximum[2] - entry.minimum[2],
  ]
  for (let a = 0; a < 3; a++) {
    out[a] = entry.minimum[a] + (entry.positions[i * 3 + a] / 65535) * size[a]
  }
  return out
}

export function quatFromMatrix3(m: number[]): Quat {
  const m00 = m[0], m01 = m[1], m02 = m[2]
  const m10 = m[3], m11 = m[4], m12 = m[5]
  const m20 = m[6], m21 = m[7], m22 = m[8]
  const trace = m00 + m11 + m22
  let s: number
  let q: Quat
  if (trace > 0) {
    s = Math.sqrt(trace + 1) * 2
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]
  } else if (m00 > m11 && m00 > m22) {
    s = Math.sqrt(1 + m00 - m11 - m22) * 2
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]
  } else if (m11 > m22) {
    s = Math.sqrt(1 + m11 - m00 - m22) * 2
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]
  } else {
    s = Math.sqrt(1 + m22 - m00 - m11) * 2
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]
  }
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len]
}

export function quatFromBasis(bx: Vec3, by: Vec3, bz: Vec3): Quat {
  return quatFromMatrix3([
    bx[0], bx[1], bx[2],
    by[0], by[1], by[2],
    bz[0], bz[1], bz[2],
  ])
}

export function rotatedBoxSize(local: Vec3, m: number[]): Vec3 {
  const half: Vec3 = [local[0] / 2, local[1] / 2, local[2] / 2]
  const lo: Vec3 = [Infinity, Infinity, Infinity]
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sy = -1; sy <= 1; sy += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        const x = sx * half[0], y = sy * half[1], z = sz * half[2]
        const values: Vec3 = [
          m[0] * x + m[1] * y + m[2] * z,
          m[3] * x + m[4] * y + m[5] * z,
          m[6] * x + m[7] * y + m[8] * z,
        ]
        for (let a = 0; a < 3; a++) {
          if (values[a] < lo[a]) lo[a] = values[a]
          if (values[a] > hi[a]) hi[a] = values[a]
        }
      }
    }
  }
  return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]
}

export function orientationFor(path: string): number[] | null {
  const matrix = VAULT_ORIENTATIONS[path]
  if (!matrix || matrix.length !== 9) return null
  for (let i = 0; i < 9; i++) {
    if (typeof matrix[i] !== 'number' || !Number.isFinite(matrix[i])) return null
  }
  return matrix
}

export function canonicalize(entry: QuantizedMesh, category: string, path: string): Canonical {
  const local: Vec3 = [
    entry.maximum[0] - entry.minimum[0],
    entry.maximum[1] - entry.minimum[1],
    entry.maximum[2] - entry.minimum[2],
  ]
  const matrix = orientationFor(path)
  if (matrix) {
    return { quat: quatFromMatrix3(matrix), size: rotatedBoxSize(local, matrix), local }
  }
  if (category === 'box') {
    return { quat: [0, 0, 0, 1], size: local, local }
  }
  if (category === 'module') {
    // 小规格模块导出时以 Y 为高；L / XL 模块导出时已以 Z 为高。
    if (local[1] <= local[0] && local[1] <= local[2]) {
      return {
        quat: [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
        size: [local[0], local[2], local[1]],
        local,
      }
    }
    return { quat: [0, 0, 0, 1], size: local, local }
  }
  if (category === 'facade') {
    // 局部 Y 为高、Z 为深（直立打印姿态）
    return {
      quat: [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
      size: [local[0], local[2], local[1]],
      local,
    }
  }
  const flat = flatOrientation(entry, category)
  return { quat: flat.quat, size: flat.size, local }
}

/**
 * PCA 主轴分析：对无姿态件先找最薄轴，再用 0.5° 步长扫描求最小面积矩形，
 * 使面内两轴贴合部件真实宽深方向。与旧 assembly.js 逐行对应。
 */
export function flatOrientation(entry: QuantizedMesh, category: string): { quat: Quat; size: Vec3 } {
  const positions = entry.positions
  const count = positions.length / 3
  const step = Math.max(1, Math.floor(count / 18000))
  const pts: Vec3[] = []
  const p: Vec3 = [0, 0, 0]
  let sx = 0, sy = 0, sz = 0
  for (let i = 0; i < count; i += step) {
    dequantize(entry, i, p)
    pts.push([p[0], p[1], p[2]])
    sx += p[0]; sy += p[1]; sz += p[2]
  }
  const n = pts.length || 1
  const mean: Vec3 = [sx / n, sy / n, sz / n]

  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (const q of pts) {
    const x = q[0] - mean[0], y = q[1] - mean[1], z = q[2] - mean[2]
    cov[0][0] += x * x; cov[0][1] += x * y; cov[0][2] += x * z
    cov[1][0] += x * y; cov[1][1] += y * y; cov[1][2] += y * z
    cov[2][0] += x * z; cov[2][1] += y * z; cov[2][2] += z * z
  }
  const denom = pts.length || 1
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] /= denom

  // 最薄轴 = 协方差最小特征值的特征向量；在 (trace·I − C) 上做幂迭代
  const tr = cov[0][0] + cov[1][1] + cov[2][2]
  const b = [
    [tr - cov[0][0], -cov[0][1], -cov[0][2]],
    [-cov[1][0], tr - cov[1][1], -cov[1][2]],
    [-cov[2][0], -cov[2][1], tr - cov[2][2]],
  ]
  let v: Vec3 = [1, 1, 1]
  for (let i = 0; i < 40; i++) {
    const nx = b[0][0] * v[0] + b[0][1] * v[1] + b[0][2] * v[2]
    const ny = b[1][0] * v[0] + b[1][1] * v[1] + b[1][2] * v[2]
    const nz = b[2][0] * v[0] + b[2][1] * v[1] + b[2][2] * v[2]
    const norm = Math.hypot(nx, ny, nz) || 1
    v = [nx / norm, ny / norm, nz / norm]
  }
  const thin = v

  const helper: Vec3 = Math.abs(thin[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const u = normalize(cross(thin, helper))
  const w = normalize(cross(thin, u))
  const plane = pts.map(
    (q) => [dot(q, u) - dot(mean, u), dot(q, w) - dot(mean, w)] as [number, number],
  )

  let best: { area: number; t: number; ex: number; ey: number } | null = null
  for (let deg = 0; deg < 90; deg += 0.5) {
    const t = (deg * Math.PI) / 180
    const c = Math.cos(t), s = Math.sin(t)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const pt of plane) {
      const px = pt[0] * c + pt[1] * s
      const py = -pt[0] * s + pt[1] * c
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
    }
    const area = (maxX - minX) * (maxY - minY)
    if (!best || area < best.area) best = { area, t, ex: maxX - minX, ey: maxY - minY }
  }

  const chosen = best!
  const ct = Math.cos(chosen.t), st = Math.sin(chosen.t)
  const axisU = normalize(add(scale(u, ct), scale(w, st)))
  const axisV = normalize(add(scale(u, -st), scale(w, ct)))

  let bx: Vec3
  let by: Vec3
  if (chosen.ex >= chosen.ey) {
    by = axisU
    bx = axisV
  } else {
    bx = axisU
    by = axisV
  }
  let bz = thin
  if (dot(bx, cross(by, bz)) < 0) bz = scale(bz, -1)

  // 决定哪一面朝上：垂直于最薄轴、面积最大的一侧是闭合面。
  // 顶盖保持朝上，底板翻转朝下。
  const balance = faceBalance(entry, bz)
  const wantUp = category !== 'baseplate'
  if ((wantUp && balance < 0) || (!wantUp && balance > 0)) {
    by = scale(by, -1)
    bz = scale(bz, -1)
  }

  return { quat: quatFromBasis(bx, by, bz), size: fitExtents(entry, bx, by, bz) }
}

function faceBalance(entry: QuantizedMesh, bz: Vec3): number {
  const count = entry.positions.length / 9
  const a: Vec3 = [0, 0, 0]
  const b: Vec3 = [0, 0, 0]
  const c: Vec3 = [0, 0, 0]
  let up = 0
  let down = 0
  for (let i = 0; i < count; i++) {
    dequantize(entry, i * 3, a)
    dequantize(entry, i * 3 + 1, b)
    dequantize(entry, i * 3 + 2, c)
    const normal = cross(sub(b, a), sub(c, a))
    const area = hypot3(normal) / 2
    if (area <= 0) continue
    const alignment = dot(normal, bz) / (area * 2)
    if (alignment > 0.85) up += area * alignment
    else if (alignment < -0.85) down += -area * alignment
  }
  return up - down
}

function fitExtents(entry: QuantizedMesh, bx: Vec3, by: Vec3, bz: Vec3): Vec3 {
  const count = entry.positions.length / 3
  const p: Vec3 = [0, 0, 0]
  const lo: Vec3 = [Infinity, Infinity, Infinity]
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < count; i++) {
    dequantize(entry, i, p)
    const values: Vec3 = [dot(p, bx), dot(p, by), dot(p, bz)]
    for (let a = 0; a < 3; a++) {
      if (values[a] < lo[a]) lo[a] = values[a]
      if (values[a] > hi[a]) hi[a] = values[a]
    }
  }
  return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]
}

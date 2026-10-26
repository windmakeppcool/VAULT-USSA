import type { Vec3 } from './vector'
import type { Quat } from './orientation'

export const LAYOUT_GAP = 18

export interface LayoutPart {
  category: string
  name: string
  split: number
  /**
   * 完整路径，供调用方按路径唯一反查部件。
   * 清单中存在同名 STL，仅靠 name 会错配。
   * 设为可选以兼容只关心布局几何的旧调用方；装配视图总是填入。
   */
  key?: string
}

export interface LayoutInput {
  part: LayoutPart
  size: Vec3
  quat: Quat
}

export interface Placed {
  entry: LayoutInput
  center: Vec3
}

/** 已有锚定位置的类别，不参与小件网格排布 */
const ANCHORED: Record<string, 1> = {
  box: 1, module: 1, roof: 1, baseplate: 1, facade: 1,
  backpanel: 1, backbone: 1, pegboard: 1, wallmount: 1, handle: 1,
}

/**
 * 渲染类别顺序，决定小件网格的遍历次序。
 * 与旧 assembly.js 的 RENDER_CATS 保持一致（含 accessory / support）。
 */
export const RENDER_CATS: Record<string, 1> = {
  box: 1,
  module: 1,
  roof: 1,
  baseplate: 1,
  facade: 1,
  backpanel: 1,
  rail: 1,
  runner: 1,
  accessory: 1,
  support: 1,
  divider: 1,
  hinge: 1,
  lock: 1,
  rod: 1,
  handle: 1,
  backbone: 1,
  pegboard: 1,
  base: 1,
  feet: 1,
  wallmount: 1,
  wheel: 1,
  hardware: 1,
  other: 1,
}

/**
 * 参考工程风格布局：主体（模块 / 盒体）在原点，顶盖与底板作层，
 * 面板在前，背板在后，提手在上，其余小件排在右侧 3 列网格。
 */
export function layout(entries: LayoutInput[]): Placed[] | null {
  const byCategory: Record<string, LayoutInput[]> = {}
  for (const entry of entries) {
    ;(byCategory[entry.part.category] ||= []).push(entry)
  }

  // Part 1 / Part 2 拆分件取代同类兄弟件
  for (const category of Object.keys(byCategory)) {
    const split = byCategory[category].filter((entry) => entry.part.split > 0)
    if (split.length) {
      split.sort((a, b) => a.part.split - b.part.split)
      byCategory[category] = split
    }
  }

  let body: LayoutInput | null = null
  if (byCategory.box?.length) body = byCategory.box[0]
  else if (byCategory.module?.length) body = byCategory.module[0]
  else {
    let bestVolume = -Infinity
    for (const entry of entries) {
      const volume = entry.size[0] * entry.size[1] * entry.size[2]
      if (volume > bestVolume) {
        bestVolume = volume
        body = entry
      }
    }
  }
  if (!body) return null

  const gap = LAYOUT_GAP
  const bodyW = body.size[0]
  const bodyD = body.size[1]
  const bodyH = body.size[2]
  const boxList = byCategory.box || []
  const boxH = boxList.length ? boxList[0].size[2] : bodyH
  const topZ = Math.max(bodyH, boxH)
  let roofTop = topZ
  const placed: Placed[] = []

  const push = (entry: LayoutInput, center: Vec3) => placed.push({ entry, center })
  const centered = (i: number, count: number) => i - (count - 1) / 2

  const modules = byCategory.module || []
  modules.forEach((entry, i) => {
    push(entry, [centered(i, modules.length) * (bodyW + gap), 0, entry.size[2] / 2])
  })

  boxList.forEach((entry, i) => {
    push(entry, [
      centered(i, boxList.length) * (entry.size[0] + gap),
      -bodyD * 0.8 - gap * 0.45,
      entry.size[2] / 2,
    ])
  })

  const roofs = byCategory.roof || []
  roofs.forEach((entry, i) => {
    const z = topZ + gap + entry.size[2] / 2
    push(entry, [centered(i, roofs.length) * (bodyW * 0.6 + gap), 0, z])
    roofTop = Math.max(roofTop, topZ + gap + entry.size[2])
  })

  const plates = byCategory.baseplate || []
  plates.forEach((entry, i) => {
    push(entry, [
      centered(i, plates.length) * (entry.size[0] + gap),
      -bodyD * 0.8 - gap * 0.45,
      (boxH || bodyH) + gap * 0.6 + entry.size[2] / 2,
    ])
  })

  const facades = byCategory.facade || []
  facades.forEach((entry, i) => {
    push(entry, [
      centered(i, facades.length) * (entry.size[0] + gap),
      -bodyD * 1.35 - gap,
      entry.size[2] / 2,
    ])
  })

  // 背侧层叠大板：类别顺序保证每层分开
  let backY = bodyD * 0.8 + gap
  for (const category of ['backpanel', 'backbone', 'pegboard', 'wallmount']) {
    for (const entry of byCategory[category] || []) {
      push(entry, [0, backY + entry.size[1] / 2, entry.size[2] / 2])
      backY += entry.size[1] + gap
    }
  }

  const handles = byCategory.handle || []
  handles.forEach((entry, i) => {
    push(entry, [
      centered(i, handles.length) * (entry.size[0] + gap),
      0,
      roofTop + gap + entry.size[2] / 2,
    ])
  })

  // 剩余小件：右侧固定 3 列网格
  let smallIndex = 0
  for (const category of Object.keys(RENDER_CATS)) {
    if (ANCHORED[category]) continue
    for (const entry of byCategory[category] || []) {
      const col = smallIndex % 3
      const row = Math.floor(smallIndex / 3)
      push(entry, [
        bodyW * 0.72 + col * 65 + gap * 0.5,
        bodyD * 0.35 - row * 75,
        Math.max(0, entry.size[2] / 2),
      ])
      smallIndex++
    }
  }

  return placed
}

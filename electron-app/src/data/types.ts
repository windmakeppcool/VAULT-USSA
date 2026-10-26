export type GroupId = 'drawers' | 'sustainers' | 'mods'

export interface ManifestEntry {
  /** 相对 STL 库根目录的路径，必须逐字使用 */
  p: string
  n: string
  /** 字节数 */
  s: number
  g: GroupId
  /** 尺寸族 */
  f: string | null
  /** 档位 3–7 */
  z: string | null
  /** 高度 1F/2F/4F */
  h: string | null
  /** 类别 */
  c: string
  v: string
  /** 同族分件序号，源数据中为数字或 null */
  k: number | null
  /** 默认份数 */
  q: number
  /** 是否需要支撑 */
  u: boolean
}

export interface ManifestFile {
  generated: string
  root: string
  files: ManifestEntry[]
}

export interface Swatch {
  name: string
  hex: string
}

export interface PalettePreset {
  name: string
  colors: Record<string, string>
}

export interface PaletteFile {
  swatches: Swatch[]
  presets: Record<string, PalettePreset>
  defaultPreset: string
}

export interface SceneItem {
  p: string
  q: number
  part: string
  partName: string
  color: number
  support: boolean
  ref: string
}

export interface SceneGroup {
  id: string
  name: string
  why: string
  depth: number
  width: string
  /** 顶盖方案，源数据中有 null */
  roof: string | null
  counts: { drawers: number; modules: number; cases: number }
  items: SceneItem[]
}

export interface SceneTemplateFile {
  version: string
  title: string
  notice: string
  assumptions: string[]
  groups: SceneGroup[]
}

export interface GuideData {
  assembly: Record<string, unknown>
  [key: string]: unknown
}

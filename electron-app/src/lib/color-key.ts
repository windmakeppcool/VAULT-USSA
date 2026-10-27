/**
 * 配色键映射：把 manifest 的类别 / 显示名转换为调色板里的键。
 * 逐字复刻旧版 configurator/app.js:139-183 的两层映射逻辑，
 * 名称规则优先于类别规则。
 */

/** 类别 → 调色板键。旧版 configurator/app.js:139 */
const COLOR_KEY_BY_CAT: Record<string, string> = {
  box: 'box',
  module: 'module',
  roof: 'roof',
  baseplate: 'baseplate',
  facade: 'facade',
  backpanel: 'facade',
  rail: 'rails',
  runner: 'rails',
  accessory: 'rails',
  support: 'rails',
  divider: 'divider',
  hinge: 'hinge',
  lock: 'lock',
  rod: 'rods',
  handle: 'handle',
  backbone: 'backbone',
  pegboard: 'backbone',
  base: 'base',
  feet: 'base',
  wallmount: 'wall',
  wheel: 'wheels',
  // 兼容复数写法；manifest 实际使用 wheel，此别名不改变既有行为
  wheels: 'wheels',
  hardware: 'accent',
  other: 'accent',
}

/** 名称正则 → 调色板键，优先于类别。旧版 configurator/app.js:165 */
const COLOR_NAME_RULES: [RegExp, string][] = [
  [/runner stopper/i, 'stopper'],
  [/runner guides?/i, 'guides'],
  [/runner slides?/i, 'slides'],
  [/springs?/i, 'springs'],
  [/latch/i, 'latch'],
  [/lock holder/i, 'lockholder'],
  [/lock inner/i, 'lockinner'],
  [/lock outer/i, 'lockouter'],
  [/pins? for 1 lock/i, 'pins'],
  [/heavyweight roof insert|heawyweight roof insert/i, 'roof'],
  [/handle lock|handle lock knob/i, 'lock'],
  [/top handle|roof handle|pull-out handle|stationary handle/i, 'handle'],
  [/rods?/i, 'rods'],
  [/rails?/i, 'rails'],
  [/tyre/i, 'tyre'],
  // 负向前瞻排除 "key hole"，避免钥匙孔盖被当成锁具
  [/key(?! ?hole)/i, 'lock'],
  [/facade ?cap|label/i, 'facade'],
]

export interface ColorKeySource {
  /** 显示名，对应 manifest 的 n */
  name: string
  /** 相对路径，对应 manifest 的 p */
  path: string
  /** 类别，对应 manifest 的 c */
  category: string
}

/**
 * 计算部件对应的调色板键：先按显示名匹配名称规则，再按类别映射，
 * 都无法识别时回落到强调色 accent。
 */
export function colorKeyFor(entry: ColorKeySource): string {
  const text = String(entry.name || entry.path || '')
  for (const [pattern, key] of COLOR_NAME_RULES) {
    if (pattern.test(text)) return key
  }
  return COLOR_KEY_BY_CAT[entry.category] ?? 'accent'
}

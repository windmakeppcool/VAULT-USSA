// 把旧 configurator/data/*.js 里的 `window.XXX = {...}` 转成 ES 模块导出。
// 只做包装，不改任何键名与字符串内容——路径匹配依赖逐字一致。
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = join(here, '../../configurator')
const OUT = join(here, '../src')

const JOBS = [
  { from: 'data/vault-manifest.js', to: 'data/manifest.ts', global: 'VAULT_DATA', name: 'VAULT_DATA', type: 'ManifestFile', importTypes: true },
  { from: 'data/vault-orientations.js', to: 'data/orientations.ts', global: 'VAULT_ORIENTATIONS', name: 'VAULT_ORIENTATIONS', type: 'Record<string, number[]>', importTypes: false },
  { from: 'data/vault-3d.js', to: 'data/thumbnails.ts', global: 'VAULT_3D', name: 'VAULT_3D', type: 'Record<string, string>', importTypes: false },
  { from: 'data/scene-templates.js', to: 'data/scene-templates.ts', global: 'VAULT_SCENE_TEMPLATES', name: 'VAULT_SCENE_TEMPLATES', type: 'SceneTemplateFile', importTypes: true },
  // palettes.js 是 IIFE，VAULT_PALETTES 引用了函数内的局部变量 SWATCHES / PRESETS，
  // 需要把它们的内联字面量代入后才能成为自包含模块。
  { from: 'data/palettes.js', to: 'data/palettes.ts', global: 'VAULT_PALETTES', name: 'VAULT_PALETTES', type: 'PaletteFile', importTypes: true, locals: ['SWATCHES', 'PRESETS'] },
  { from: 'data/guide-content.js', to: 'data/guide-content.ts', global: 'VAULT_GUIDE_DATA', name: 'VAULT_GUIDE_DATA', type: 'GuideData', importTypes: true },
]

const TYPE_NAMES = ['ManifestFile', 'SceneTemplateFile', 'PaletteFile', 'GuideData']

/** 从 anchor 所在行 `= ` 之后提取第一个括号平衡的字面量 */
function extractAt(raw, anchor) {
  const start = raw.indexOf(anchor)
  if (start < 0) throw new Error(`未找到 ${anchor}`)
  let i = raw.indexOf('=', start) + 1
  if (i <= 0) throw new Error(`${anchor}: 未找到赋值`)
  while (i < raw.length && /\s/.test(raw[i])) i++
  const open = raw[i]
  const close = open === '{' ? '}' : open === '[' ? ']' : null
  if (!close) throw new Error(`${anchor}: 不是对象或数组字面量`)

  let depth = 0
  let inString = false
  let quote = ''
  let escaped = false
  for (let j = i; j < raw.length; j++) {
    const ch = raw[j]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) inString = false
      continue
    }
    if (ch === '"' || ch === "'") { inString = true; quote = ch; continue }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return raw.slice(i, j + 1)
    }
  }
  throw new Error(`${anchor}: 字面量未闭合`)
}

function extract(raw, globalName) {
  return extractAt(raw, `window.${globalName}`)
}

/** 把字面量里出现的外部局部变量名替换为它们各自的字面量文本（只替换字符串外） */
function substituteLocals(literal, replacements) {
  if (!replacements || replacements.size === 0) return literal
  let out = ''
  let inString = false
  let quote = ''
  let escaped = false
  for (let i = 0; i < literal.length; ) {
    const ch = literal[i]
    if (inString) {
      out += ch
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) inString = false
      i++
      continue
    }
    if (ch === '"' || ch === "'") { inString = true; quote = ch; out += ch; i++; continue }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < literal.length && /[A-Za-z0-9_$]/.test(literal[j])) j++
      const word = literal.slice(i, j)
      out += replacements.has(word) ? replacements.get(word) : word
      i = j
      continue
    }
    out += ch
    i++
  }
  return out
}

for (const job of JOBS) {
  const raw = readFileSync(join(SRC, job.from), 'utf8')
  let literal = extract(raw, job.global)
  // 处理 IIFE 内的局部变量引用（见 JOBS 里 palettes 的 locals 说明）
  if (job.locals) {
    const replacements = new Map(job.locals.map((n) => [n, extractAt(raw, `var ${n} =`)]))
    literal = substituteLocals(literal, replacements)
  }
  const outPath = join(OUT, job.to)
  mkdirSync(dirname(outPath), { recursive: true })
  const header = job.importTypes
    ? `// 由 scripts/migrate-data.mjs 生成，请勿手改\nimport type { ${TYPE_NAMES.join(', ')} } from './types'`
    : `// 由 scripts/migrate-data.mjs 生成，请勿手改`
  writeFileSync(outPath, `${header}\nexport const ${job.name} = ${literal} as ${job.type}\n`, 'utf8')
  console.log(`✓ ${job.to}`)
}

cpSync(join(SRC, 'assets/previews'), join(OUT, 'assets/previews'), { recursive: true })
cpSync(join(SRC, 'assets/manuals'), join(OUT, 'assets/manuals'), { recursive: true })
console.log('✓ assets 已复制')

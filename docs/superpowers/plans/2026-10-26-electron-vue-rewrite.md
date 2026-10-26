# VAULT / USSA Electron + Vue 重写 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有纯静态 STL 配置器重写为可分发、双击即用的 Electron 桌面应用，前端使用 Vue 3 + TypeScript，3D 渲染改用原生 three.js。

**Architecture:** Electron 主进程注册 `app://` 自定义协议，把 `app://ui/*` 映射到打包产物、`app://stl/*` 映射到用户自选的 STL 库根目录；渲染进程仍是标准 `fetch` 语义，因此 3D 加载、缩略图、PDF 全部复用浏览器原生能力。前端拆为 4 个 Pinia store（库 / 清单 / 构型 / 配色）与 4 个视图，3D 逻辑抽成纯函数模块以便单测。

**Tech Stack:** Electron 33 · Vue 3.5 · TypeScript 5.6 · Vite 6 · Pinia 2 · Vue Router 4 · three.js 0.170 · @tanstack/vue-virtual 3 · electron-builder 25 · Vitest 2

**Spec:** `docs/superpowers/specs/2026-10-26-electron-vue-rewrite-design.md`

## Global Constraints

- 工程根目录 `electron-app/`，旧 `configurator/` 原样保留作为参照，不得修改或删除
- 所有 STL 相对路径**逐字保留**：含空格、括号、中文句点、`²`、`Heawyweight` 等原始拼写，不做任何规范化或重命名
- 源文件读写一律 UTF-8；Windows 路径含空格时必须加引号
- URL 路径分段使用 `encodeURIComponent`，不得整串编码（会破坏 `/` 分隔）
- 渲染进程 `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`，只能经 preload 的 `vaultApi` 访问主进程
- 主进程读取任何用户路径前必须校验解析结果仍在库根目录内，不合规返回 403
- 不引入 UI 组件库（Element Plus / Naive UI 等）；只允许 `@tanstack/vue-virtual` 一个 UI 相关依赖
- 布局魔数与旧实现严格一致：`LAYOUT_GAP=18`、`MAX_SCENE_TRIANGLES=5000000`、`MAX_SCENE_PARTS=80`、`MAX_PART_BYTES=72*1048576`、`MAX_CACHE_BYTES=180*1048576`、`CONCURRENCY=2`
- 中文界面文案与旧版保持一致，不擅自改写

---

## 文件结构

```
electron-app/
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── electron-builder.yml
├── vitest.config.ts
├── scripts/migrate-data.mjs          数据迁移脚本
├── electron/
│   ├── main.ts                       app 生命周期 + 窗口 + 协议注册
│   ├── protocol.ts                   app:// 路由 + 路径安全校验
│   ├── stl-library.ts                库根目录选择 / 校验 / 持久化
│   ├── zip-export.ts                 流式 ZIP 写盘
│   └── preload.ts                    contextBridge
├── src/
│   ├── main.ts  App.vue  env.d.ts
│   ├── assets/                       静态资源（迁移后的预览图与手册页）
│   ├── data/                         迁移后的类型化数据
│   │   ├── manifest.ts  orientations.ts  thumbnails.ts
│   │   ├── scene-templates.ts  palettes.ts  guide-content.ts
│   │   └── types.ts
│   ├── lib/
│   │   ├── geometry/
│   │   │   ├── vector.ts             向量/矩阵基础运算
│   │   │   ├── quantize.ts           Uint16 量化还原
│   │   │   ├── orientation.ts        姿态矩阵 → 四元数 / AABB
│   │   │   ├── pca.ts                PCA 主轴 + 最小面积矩形
│   │   │   └── layout.ts             堆叠布局
│   │   ├── zip/crc32.ts              CRC32
│   │   └── path.ts                   URL 路径编码 + 安全校验（纯函数）
│   ├── stores/
│   │   ├── library.ts  bom.ts  config.ts  color.ts
│   ├── composables/
│   │   ├── useStlLoader.ts           fetch → parse → 缓存
│   │   └── useThreeStage.ts          renderer / camera / controls 生命周期
│   ├── components/
│   │   ├── three/ThreeCanvas.vue  AssemblyView.vue  SinglePreview.vue
│   │   ├── bom/BomDrawer.vue  BomItemRow.vue
│   │   ├── ConfigPanel.vue  ColorStudio.vue  PartTable.vue  FilterBar.vue
│   │   └── LibraryGate.vue  ToastHost.vue  AppRail.vue
│   ├── views/
│   │   ├── BuildView.vue  CatalogView.vue  TemplatesView.vue  GuideView.vue
│   ├── styles/tokens.css  base.css
│   └── router/index.ts
└── tests/
    ├── geometry/*.spec.ts  path.spec.ts  zip.spec.ts
    └── stores/*.spec.ts
```

---

## Task 1: 工程脚手架与可运行窗口

**Files:**
- Create: `electron-app/package.json`
- Create: `electron-app/tsconfig.json`, `electron-app/tsconfig.node.json`
- Create: `electron-app/vite.config.ts`, `electron-app/vitest.config.ts`
- Create: `electron-app/electron/main.ts`
- Create: `electron-app/electron/preload.ts`
- Create: `electron-app/src/main.ts`, `electron-app/src/App.vue`, `electron-app/src/env.d.ts`
- Create: `electron-app/index.html`

**Interfaces:**
- Consumes: 无（起点）
- Produces: 可 `npm run dev` 启动的 Electron 窗口；`vaultApi` 类型声明挂到 `window` 上，供后续任务扩展

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "vault-ussa",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "pack": "npm run build && electron-builder --win portable"
  },
  "dependencies": {
    "@tanstack/vue-virtual": "^3.11.2",
    "pinia": "^2.3.0",
    "three": "^0.170.0",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@types/three": "^0.170.0",
    "@vitejs/plugin-vue": "^5.2.1",
    "electron": "^33.3.1",
    "electron-builder": "^25.1.8",
    "typescript": "^5.6.3",
    "vite": "^6.0.7",
    "vite-plugin-electron": "^0.29.0",
    "vite-plugin-electron-renderer": "^0.14.6",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: 创建 TypeScript 配置**

`electron-app/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "electron/**/*.ts", "tests/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`electron-app/tsconfig.node.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "composite": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: 创建 Vite 配置**

`electron-app/vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: { entry: 'electron/main.ts' },
      preload: { input: 'electron/preload.ts' },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir: 'dist' },
})
```

- [ ] **Step 4: 创建最小主进程**

`electron-app/electron/main.ts`：

```ts
import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const DEV_URL = process.env.VITE_DEV_SERVER_URL as string | undefined

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#131310',
    webPreferences: {
      preload: path.join(dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (DEV_URL) {
    void win.loadURL(DEV_URL)
  } else {
    void win.loadFile(path.join(dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 5: 创建 preload**

`electron-app/electron/preload.ts`：

```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('vaultApi', {})
```

- [ ] **Step 6: 创建渲染进程入口**

`electron-app/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>VAULT / USSA — STL 配置台</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`electron-app/src/main.ts`：

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

`electron-app/src/App.vue`：

```vue
<template>
  <main class="boot-screen">
    <h1>VAULT / USSA</h1>
    <p>脚手架就绪</p>
  </main>
</template>

<style>
.boot-screen {
  display: grid;
  place-content: center;
  gap: 8px;
  height: 100vh;
  background: #131310;
  color: #e9e4d6;
  font-family: 'Segoe UI', sans-serif;
  text-align: center;
}
</style>
```

`electron-app/src/env.d.ts`：

```ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface VaultApi {}

declare global {
  interface Window {
    vaultApi: VaultApi
  }
}

export {}
```

- [ ] **Step 7: 创建 Vitest 配置**

`electron-app/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
```

- [ ] **Step 8: 安装依赖并验证启动**

```bash
cd electron-app && npm install
```

预期：安装成功，无 peer dependency 冲突导致的中断。

```bash
cd electron-app && npm run dev
```

预期：Vite 启动，Electron 窗口打开并显示「脚手架就绪」。关闭窗口后进程退出。

- [ ] **Step 9: 提交**

```bash
git add electron-app/package.json electron-app/package-lock.json electron-app/tsconfig.json electron-app/tsconfig.node.json electron-app/vite.config.ts electron-app/vitest.config.ts electron-app/index.html electron-app/electron electron-app/src
git commit -m "feat(electron-app): 搭建 Vite + Vue 3 + Electron 脚手架"
```

---

## Task 2: 数据迁移脚本与类型化数据模块

**Files:**
- Create: `electron-app/scripts/migrate-data.mjs`
- Create: `electron-app/src/data/types.ts`
- Generate: `electron-app/src/data/{manifest,orientations,thumbnails,scene-templates,palettes,guide-content}.ts`
- Copy: `configurator/assets/previews/*` → `electron-app/src/assets/previews/`
- Copy: `configurator/assets/manuals/*` → `electron-app/src/assets/manuals/`
- Test: `electron-app/tests/data.spec.ts`

**Interfaces:**
- Consumes: 旧 `configurator/data/*.js`
- Produces:
  - `ManifestEntry` / `ManifestFile`，`VAULT_DATA: ManifestFile`
  - `VAULT_ORIENTATIONS: Record<string, number[]>`
  - `VAULT_3D: Record<string, string>`
  - `VAULT_SCENE_TEMPLATES: SceneTemplateFile`
  - `VAULT_PALETTES: PaletteFile`
  - `VAULT_GUIDE_DATA: GuideData`

- [ ] **Step 1: 定义数据类型**

`electron-app/src/data/types.ts`：

```ts
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
  k: string | null
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
  roof: string
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
```

- [ ] **Step 2: 编写迁移脚本**

`electron-app/scripts/migrate-data.mjs`：

```js
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
  { from: 'data/palettes.js', to: 'data/palettes.ts', global: 'VAULT_PALETTES', name: 'VAULT_PALETTES', type: 'PaletteFile', importTypes: true },
  { from: 'data/guide-content.js', to: 'data/guide-content.ts', global: 'VAULT_GUIDE_DATA', name: 'VAULT_GUIDE_DATA', type: 'GuideData', importTypes: true },
]

const TYPE_NAMES = ['ManifestFile', 'SceneTemplateFile', 'PaletteFile', 'GuideData']

/** 从 `window.NAME = ` 之后提取第一个括号平衡的字面量 */
function extract(raw, globalName) {
  const start = raw.indexOf(`window.${globalName}`)
  if (start < 0) throw new Error(`未找到 window.${globalName}`)
  let i = raw.indexOf('=', start) + 1
  while (i < raw.length && /\s/.test(raw[i])) i++
  const open = raw[i]
  const close = open === '{' ? '}' : open === '[' ? ']' : null
  if (!close) throw new Error(`${globalName}: 不是对象或数组字面量`)

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
  throw new Error(`${globalName}: 字面量未闭合`)
}

for (const job of JOBS) {
  const raw = readFileSync(join(SRC, job.from), 'utf8')
  const literal = extract(raw, job.global)
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
```

- [ ] **Step 3: 运行迁移脚本**

```bash
cd electron-app && node scripts/migrate-data.mjs
```

预期输出 6 行 `✓` 加 `✓ assets 已复制`。

- [ ] **Step 4: 编写数据完整性测试**

`electron-app/tests/data.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { VAULT_DATA } from '@/data/manifest'
import { VAULT_ORIENTATIONS } from '@/data/orientations'
import { VAULT_3D } from '@/data/thumbnails'
import { VAULT_SCENE_TEMPLATES } from '@/data/scene-templates'
import { VAULT_PALETTES } from '@/data/palettes'

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

  it('路径中的特殊字符被逐字保留', () => {
    const paths = VAULT_DATA.files.map((f) => f.p)
    expect(paths.some((p) => p.includes('²'))).toBe(true)
    expect(paths.some((p) => p.includes('(Turn On Supports)'))).toBe(true)
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
})
```

- [ ] **Step 5: 运行测试**

```bash
cd electron-app && npx vitest run tests/data.spec.ts
```

预期：8 个测试全部 PASS。若数量断言失败，说明字面量被截断——检查 `extract()` 的括号平衡逻辑与字符串转义处理。

- [ ] **Step 6: 提交**

```bash
git add electron-app/scripts electron-app/src/data electron-app/src/assets electron-app/tests/data.spec.ts
git commit -m "feat(electron-app): 迁移 STL 清单 / 姿态 / 模板 / 配色数据并加完整性测试"
```

---

## Task 3: 几何纯函数模块（量化、姿态、PCA、布局）

**Files:**
- Create: `electron-app/src/lib/geometry/vector.ts`
- Create: `electron-app/src/lib/geometry/orientation.ts`
- Create: `electron-app/src/lib/geometry/layout.ts`
- Test: `electron-app/tests/geometry/vector.spec.ts`
- Test: `electron-app/tests/geometry/orientation.spec.ts`
- Test: `electron-app/tests/geometry/layout.spec.ts`

**Interfaces:**
- Consumes: `VAULT_ORIENTATIONS`（Task 2）
- Produces:
  - `type Vec3 = [number, number, number]`、`type Quat = [number, number, number, number]`
  - `Vec3` 工具：`add` `sub` `scale` `dot` `cross` `normalize` `hypot3`
  - `dequantize(entry: QuantizedMesh, i: number, out: Vec3): Vec3`
  - `quatFromMatrix3(m: number[]): Quat`
  - `quatFromBasis(bx: Vec3, by: Vec3, bz: Vec3): Quat`
  - `rotatedBoxSize(local: Vec3, m: number[]): Vec3`
  - `canonicalize(entry: QuantizedMesh, category: string, path: string): Canonical`
  - `flatOrientation(entry: QuantizedMesh, category: string): { quat: Quat; size: Vec3 }`
  - `layout(entries: LayoutInput[]): Placed[] | null`
  - `LAYOUT_GAP = 18`、`RENDER_CATS`

- [ ] **Step 1: 写向量运算的失败测试**

`electron-app/tests/geometry/vector.spec.ts`：

```ts
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
```

- [ ] **Step 2: 运行确认失败**

```bash
cd electron-app && npx vitest run tests/geometry/vector.spec.ts
```

预期：FAIL，`Failed to resolve import "@/lib/geometry/vector"`。

- [ ] **Step 3: 实现向量模块**

`electron-app/src/lib/geometry/vector.ts`：

```ts
export type Vec3 = [number, number, number]

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

export const hypot3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2])

export function normalize(a: Vec3): Vec3 {
  const n = hypot3(a)
  return n === 0 ? [0, 0, 0] : [a[0] / n, a[1] / n, a[2] / n]
}
```

- [ ] **Step 4: 运行确认通过**

```bash
cd electron-app && npx vitest run tests/geometry/vector.spec.ts
```

预期：6 个测试 PASS。

- [ ] **Step 5: 写姿态模块的失败测试**

`electron-app/tests/geometry/orientation.spec.ts`：

```ts
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
```

- [ ] **Step 6: 运行确认失败**

```bash
cd electron-app && npx vitest run tests/geometry/orientation.spec.ts
```

预期：FAIL，`Failed to resolve import "@/lib/geometry/orientation"`。

- [ ] **Step 7: 实现姿态模块**

`electron-app/src/lib/geometry/orientation.ts`：

```ts
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
```

- [ ] **Step 8: 运行确认通过**

```bash
cd electron-app && npx vitest run tests/geometry/orientation.spec.ts
```

预期：8 个测试 PASS。四元数分量顺序为 `[x, y, z, w]`，w 在末位——这是旧实现的约定。

- [ ] **Step 9: 写布局的失败测试**

`electron-app/tests/geometry/layout.spec.ts`：

```ts
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

  it('单个盒体放在原点上方的半高处', () => {
    const placed = layout([part('box', [100, 80, 40])])!
    expect(placed[0].center[0]).toBeCloseTo(0, 6)
    expect(placed[0].center[1]).toBeCloseTo(0, 6)
    expect(placed[0].center[2]).toBeCloseTo(20, 6)
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
```

- [ ] **Step 10: 实现布局模块**

`electron-app/src/lib/geometry/layout.ts`：

```ts
import type { Vec3 } from './vector'
import type { Quat } from './orientation'

export const LAYOUT_GAP = 18

export interface LayoutPart {
  category: string
  name: string
  split: number
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

/** 渲染类别顺序，决定小件网格的遍历次序 */
export const RENDER_CATS: Record<string, 1> = {
  box: 1, module: 1, roof: 1, baseplate: 1, facade: 1,
  backpanel: 1, backbone: 1, pegboard: 1, wallmount: 1, handle: 1,
  divider: 1, runner: 1, rail: 1, slide: 1, spring: 1, stopper: 1,
  lock: 1, latch: 1, hinge: 1, hingetop: 1, rod: 1, lockholder: 1,
  lockinner: 1, lockouter: 1, pin: 1, tyre: 1, wheel: 1, wheels: 1,
  pullhandle: 1, base: 1, feet: 1, hardware: 1, other: 1,
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
```

- [ ] **Step 11: 运行全部几何测试**

```bash
cd electron-app && npx vitest run tests/geometry
```

预期：vector 6 项、orientation 8 项、layout 6 项全部 PASS。

- [ ] **Step 12: 提交**

```bash
git add electron-app/src/lib/geometry electron-app/tests/geometry
git commit -m "feat(electron-app): 移植几何算法（量化还原 / 姿态 / PCA / 堆叠布局）并加单测"
```

---

## Task 4: 路径安全、app:// 协议与 STL 库管理

**Files:**
- Create: `electron-app/src/lib/path.ts`（纯函数，渲染进程与主进程共用）
- Create: `electron-app/electron/protocol.ts`
- Create: `electron-app/electron/stl-library.ts`
- Modify: `electron-app/electron/preload.ts`
- Modify: `electron-app/electron/main.ts`
- Test: `electron-app/tests/path.spec.ts`

**Interfaces:**
- Consumes: Task 1 的窗口与 preload 骨架
- Produces:
  - `encodeStlPath(relPath: string): string` — 逐段编码，保留 `/`
  - `stlUrl(relPath: string): string` — 返回 `app://stl/<encoded>`
  - `isInsideRoot(root: string, candidate: string): boolean`
  - `resolveWithinRoot(root: string, relPath: string): string | null`
  - `REQUIRED_DIRS: readonly string[]`
  - `checkLibraryRoot(root: string): { ok: boolean; missing: string[] }`
  - `loadSavedRoot(): string | null`、`saveRoot(root: string): void`
  - preload 暴露：`vaultApi.selectLibraryRoot(): Promise<LibraryState>`、`vaultApi.getLibraryState(): Promise<LibraryState>`
  - `interface LibraryState { root: string | null; valid: boolean; missing: string[] }`

- [ ] **Step 1: 写路径安全的失败测试**

`electron-app/tests/path.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { encodeStlPath, stlUrl, isInsideRoot, resolveWithinRoot } from '@/lib/path'

const ROOT = process.platform === 'win32' ? 'D:\\Models\\VAULT' : '/models/vault'

describe('路径编码', () => {
  it('逐段编码但保留分隔符', () => {
    expect(encodeStlPath('01. DRAWERS/S3 Box 1F.stl')).toBe('01.%20DRAWERS/S3%20Box%201F.stl')
  })

  it('编码中文与特殊字符', () => {
    expect(encodeStlPath('04. L² Families/a b.stl')).toBe('04.%20L%C2%B2%20Families/a%20b.stl')
  })

  it('不把分隔符编码成 %2F', () => {
    expect(encodeStlPath('a/b/c.stl')).not.toContain('%2F')
  })

  it('stlUrl 生成 app://stl/ 前缀', () => {
    expect(stlUrl('01. DRAWERS/x.stl')).toBe('app://stl/01.%20DRAWERS/x.stl')
  })
})

describe('根目录包含判定', () => {
  it('根目录内的文件返回 true', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, '01. DRAWERS', 'a.stl'))).toBe(true)
  })

  it('根目录自身返回 true', () => {
    expect(isInsideRoot(ROOT, ROOT)).toBe(true)
  })

  it('父目录返回 false', () => {
    expect(isInsideRoot(ROOT, path.dirname(ROOT))).toBe(false)
  })

  it('穿越到根目录之外返回 false', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, '..', 'secret.txt'))).toBe(false)
  })

  it('前缀相同时不误判（VAULT2 不是 VAULT 的子目录）', () => {
    const sibling = ROOT + '2'
    expect(isInsideRoot(ROOT, path.join(sibling, 'a.stl'))).toBe(false)
  })
})

describe('resolveWithinRoot', () => {
  it('合法相对路径解析为绝对路径', () => {
    const resolved = resolveWithinRoot(ROOT, '01. DRAWERS/a.stl')
    expect(resolved).toBe(path.join(ROOT, '01. DRAWERS', 'a.stl'))
  })

  it('含 .. 的路径返回 null', () => {
    expect(resolveWithinRoot(ROOT, '../secret.txt')).toBeNull()
  })

  it('绝对路径返回 null', () => {
    expect(resolveWithinRoot(ROOT, path.join(ROOT, 'a.stl'))).toBeNull()
  })

  it('空路径返回 null', () => {
    expect(resolveWithinRoot(ROOT, '')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
cd electron-app && npx vitest run tests/path.spec.ts
```

预期：FAIL，`Failed to resolve import "@/lib/path"`。

- [ ] **Step 3: 实现路径模块**

`electron-app/src/lib/path.ts`：

```ts
import path from 'node:path'

/** 逐段编码，保留 `/` 分隔符 */
export function encodeStlPath(relPath: string): string {
  return relPath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function stlUrl(relPath: string): string {
  return `app://stl/${encodeStlPath(relPath)}`
}

/** candidate 是否等于 root 或位于其下（按路径段比较，避免前缀误判） */
export function isInsideRoot(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * 把相对路径解析为根目录下的绝对路径。
 * 拒绝空串、绝对路径、以及解析后逃出根目录的输入。
 */
export function resolveWithinRoot(root: string, relPath: string): string | null {
  if (!relPath || !root) return null
  const normalized = relPath.replace(/\\/g, '/')
  if (path.isAbsolute(normalized)) return null
  if (normalized.split('/').some((seg) => seg === '..')) return null
  const resolved = path.resolve(root, normalized)
  return isInsideRoot(root, resolved) ? resolved : null
}
```

- [ ] **Step 4: 运行确认通过**

```bash
cd electron-app && npx vitest run tests/path.spec.ts
```

预期：12 个测试 PASS。

- [ ] **Step 5: 实现 STL 库管理**

`electron-app/electron/stl-library.ts`：

```ts
import { app, dialog, BrowserWindow } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

export const REQUIRED_DIRS = ['01. DRAWERS', '02. SUSTAINERS', '03. MODIFICATIONS'] as const

export interface LibraryState {
  root: string | null
  valid: boolean
  missing: string[]
}

interface Config {
  libraryRoot?: string
  windowBounds?: { width: number; height: number; x?: number; y?: number }
}

function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

export function readConfig(): Config {
  try {
    return JSON.parse(readFileSync(configPath(), 'utf8')) as Config
  } catch {
    return {}
  }
}

export function writeConfig(patch: Partial<Config>): void {
  const next = { ...readConfig(), ...patch }
  const file = configPath()
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
}

export function checkLibraryRoot(root: string): { ok: boolean; missing: string[] } {
  const missing = REQUIRED_DIRS.filter((dir) => !existsSync(path.join(root, dir)))
  return { ok: missing.length === 0, missing: [...missing] }
}

export function loadSavedRoot(): string | null {
  const root = readConfig().libraryRoot
  return root && existsSync(root) ? root : null
}

export function getLibraryState(): LibraryState {
  const root = loadSavedRoot()
  if (!root) return { root: null, valid: false, missing: [] }
  const { ok, missing } = checkLibraryRoot(root)
  return { root, valid: ok, missing }
}

export async function selectLibraryRoot(win: BrowserWindow | null): Promise<LibraryState> {
  const result = await dialog.showOpenDialog(win ?? undefined!, {
    title: '选择 STL 库根目录（需含 01. DRAWERS / 02. SUSTAINERS / 03. MODIFICATIONS）',
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths.length) return getLibraryState()

  const root = result.filePaths[0]
  const { ok, missing } = checkLibraryRoot(root)
  if (!ok) {
    // 不保存无效路径，把缺失目录回报给界面引导用户重选
    return { root, valid: false, missing }
  }
  writeConfig({ libraryRoot: root })
  return { root, valid: true, missing: [] }
}
```

- [ ] **Step 6: 实现 app:// 协议路由**

`electron-app/electron/protocol.ts`：

```ts
import { protocol, net } from 'electron'
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Readable } from 'node:stream'
import { resolveWithinRoot } from '../src/lib/path'
import { loadSavedRoot } from './stl-library'

export const APP_SCHEME = 'app'

/** 必须在 app.whenReady() 之前调用 */
export function registerAppSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ])
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.stl': 'model/stl',
}

function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

function streamFile(file: string, status = 200): Response {
  const info = statSync(file)
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream
  return new Response(body, {
    status,
    headers: {
      'content-type': mimeFor(file),
      'content-length': String(info.size),
      'cache-control': 'no-store',
    },
  })
}

/**
 * 注册协议 handler。必须在 app.whenReady() 之后调用。
 * @param uiRoot 打包产物目录（生产环境为 dist/）
 * @param devUrl 开发环境 Vite 地址；存在时 UI 请求直接转发
 */
export function registerAppProtocol(uiRoot: string, devUrl?: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    const host = url.hostname
    const rawPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''))

    if (host === 'ui') {
      if (devUrl) return net.fetch(devUrl + url.pathname + url.search)
      const file = path.join(uiRoot, rawPath || 'index.html')
      if (!file.startsWith(path.resolve(uiRoot))) {
        return new Response('Forbidden', { status: 403 })
      }
      try {
        return streamFile(file)
      } catch {
        // SPA 路由回退
        return streamFile(path.join(uiRoot, 'index.html'))
      }
    }

    if (host === 'stl') {
      const root = loadSavedRoot()
      if (!root) return new Response('Library not configured', { status: 409 })
      const resolved = resolveWithinRoot(root, rawPath)
      if (!resolved) return new Response('Forbidden', { status: 403 })
      try {
        return streamFile(resolved)
      } catch {
        return new Response('Not found', { status: 404 })
      }
    }

    return new Response('Not found', { status: 404 })
  })
}
```

- [ ] **Step 7: 扩展 preload**

`electron-app/electron/preload.ts`：

```ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getLibraryState: () => ipcRenderer.invoke('library:get'),
  selectLibraryRoot: () => ipcRenderer.invoke('library:select'),
}

contextBridge.exposeInMainWorld('vaultApi', api)

export type VaultApi = typeof api
```

`electron-app/src/env.d.ts` 中的 `VaultApi` 改为：

```ts
interface LibraryState {
  root: string | null
  valid: boolean
  missing: string[]
}

interface VaultApi {
  getLibraryState(): Promise<LibraryState>
  selectLibraryRoot(): Promise<LibraryState>
}
```

- [ ] **Step 8: 接线主进程**

`electron-app/electron/main.ts` 改为：

```ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerAppSchemePrivileges, registerAppProtocol } from './protocol'
import { getLibraryState, selectLibraryRoot, readConfig, writeConfig } from './stl-library'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const DEV_URL = process.env.VITE_DEV_SERVER_URL as string | undefined
const UI_ROOT = path.join(dirname, '../dist')

registerAppSchemePrivileges()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const bounds = readConfig().windowBounds
  const win = new BrowserWindow({
    width: bounds?.width ?? 1440,
    height: bounds?.height ?? 900,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#131310',
    webPreferences: {
      preload: path.join(dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })
  mainWindow = win

  win.on('close', () => {
    const [width, height] = win.getSize()
    writeConfig({ windowBounds: { width, height } })
  })
  win.on('closed', () => {
    mainWindow = null
  })

  if (DEV_URL) {
    void win.loadURL(DEV_URL)
  } else {
    void win.loadURL('app://ui/index.html')
  }
}

app.whenReady().then(() => {
  registerAppProtocol(UI_ROOT, DEV_URL)
  ipcMain.handle('library:get', () => getLibraryState())
  ipcMain.handle('library:select', () => selectLibraryRoot(mainWindow))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 9: 手工验证协议**

临时把 `App.vue` 的模板换成如下内容，运行后检查窗口内文字：

```vue
<template>
  <main style="padding:32px;font-family:monospace">
    <p>库状态：{{ JSON.stringify(state) }}</p>
    <button @click="pick">选择 STL 库目录</button>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const state = ref<unknown>(null)
onMounted(async () => { state.value = await window.vaultApi.getLibraryState() })
async function pick() { state.value = await window.vaultApi.selectLibraryRoot() }
</script>
```

```bash
cd electron-app && npm run dev
```

预期：
- 首次显示 `{"root":null,"valid":false,"missing":[]}`
- 点按钮选一个不含三个顶层目录的文件夹 → 显示 `valid:false` 且 `missing` 列出缺少的目录名
- 选对目录 → `valid:true`

- [ ] **Step 10: 提交**

```bash
git add electron-app/src/lib/path.ts electron-app/electron electron-app/src/env.d.ts electron-app/tests/path.spec.ts
git commit -m "feat(electron-app): 实现 app:// 协议、路径安全校验与 STL 库管理"
```

---

## Task 5: 流式 ZIP 导出

**Files:**
- Create: `electron-app/src/lib/zip/crc32.ts`
- Create: `electron-app/electron/zip-export.ts`
- Modify: `electron-app/electron/preload.ts`
- Modify: `electron-app/electron/main.ts`
- Test: `electron-app/tests/zip.spec.ts`

**Interfaces:**
- Consumes: `resolveWithinRoot`（Task 4）、`loadSavedRoot`（Task 4）
- Produces:
  - `crc32(bytes: Uint8Array): number`
  - `zipDosStamp(date: Date): { time: number; date: number }`
  - `buildLocalHeader(opts): Uint8Array`、`buildCentralHeader(opts): Uint8Array`、`buildEocd(opts): Uint8Array`
  - 主进程 IPC：`export:start`（返回 `{ jobId }`）、`export:cancel`
  - 事件：`export:progress` 载荷 `ExportProgress`
  - `interface ExportProgress { jobId: string; done: number; total: number; bytes: number; currentFile: string; state: 'running' | 'done' | 'failed' | 'canceled'; error?: string }`

- [ ] **Step 1: 写 CRC32 与 ZIP 头的失败测试**

`electron-app/tests/zip.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { crc32, zipDosStamp, buildLocalHeader, buildCentralHeader, buildEocd } from '@/lib/zip/crc32'

describe('CRC32', () => {
  it('空数据的校验值为 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it('"123456789" 的校验值为 0xCBF43926', () => {
    const bytes = new TextEncoder().encode('123456789')
    expect(crc32(bytes) >>> 0).toBe(0xcbf43926)
  })

  it('结果始终是无符号 32 位', () => {
    const bytes = new TextEncoder().encode('hello world')
    const value = crc32(bytes)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('DOS 时间戳', () => {
  it('2026-10-26 12:00:00 编码符合 ZIP 规范', () => {
    const stamp = zipDosStamp(new Date(2026, 9, 26, 12, 0, 0))
    expect(stamp.time).toBe((12 << 11) | (0 << 5) | 0)
    expect(stamp.date).toBe(((2026 - 1980) << 9) | ((9 + 1) << 5) | 26)
  })
})

describe('ZIP 头结构', () => {
  const name = new TextEncoder().encode('a/b.stl')
  const opts = { name, crc: 0x12345678, size: 100, offset: 0, stamp: zipDosStamp(new Date(2026, 9, 26)) }

  it('本地文件头签名为 0x04034b50', () => {
    const header = buildLocalHeader(opts)
    expect(new DataView(header.buffer).getUint32(0, true)).toBe(0x04034b50)
  })

  it('本地文件头长度为 30 字节加文件名长度', () => {
    expect(buildLocalHeader(opts)).toHaveLength(30 + name.length)
  })

  it('中央目录头签名为 0x02014b50', () => {
    const header = buildCentralHeader(opts)
    expect(new DataView(header.buffer).getUint32(0, true)).toBe(0x02014b50)
  })

  it('EOCD 签名为 0x06054b50 且长度为 22 字节', () => {
    const eocd = buildEocd({ count: 3, centralSize: 120, centralOffset: 500 })
    expect(eocd).toHaveLength(22)
    expect(new DataView(eocd.buffer).getUint32(0, true)).toBe(0x06054b50)
    expect(new DataView(eocd.buffer).getUint16(10, true)).toBe(3)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
cd electron-app && npx vitest run tests/zip.spec.ts
```

预期：FAIL，`Failed to resolve import "@/lib/zip/crc32"`。

- [ ] **Step 3: 实现 CRC32 与头构造**

`electron-app/src/lib/zip/crc32.ts`：

```ts
const TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zipDosStamp(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

export interface LocalHeaderOptions {
  name: Uint8Array
  crc: number
  size: number
  stamp: { time: number; date: number }
}

export function buildLocalHeader(o: LocalHeaderOptions): Uint8Array {
  const buf = new Uint8Array(30 + o.name.length)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true)          // version needed
  view.setUint16(6, 0x0800, true)      // UTF-8 文件名标志
  view.setUint16(8, 0, true)           // store，不压缩
  view.setUint16(10, o.stamp.time, true)
  view.setUint16(12, o.stamp.date, true)
  view.setUint32(14, o.crc, true)
  view.setUint32(18, o.size, true)
  view.setUint32(22, o.size, true)
  view.setUint16(26, o.name.length, true)
  view.setUint16(28, 0, true)
  buf.set(o.name, 30)
  return buf
}

export interface CentralHeaderOptions extends LocalHeaderOptions {
  offset: number
}

export function buildCentralHeader(o: CentralHeaderOptions): Uint8Array {
  const buf = new Uint8Array(46 + o.name.length)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint16(8, 0x0800, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, o.stamp.time, true)
  view.setUint16(14, o.stamp.date, true)
  view.setUint32(16, o.crc, true)
  view.setUint32(20, o.size, true)
  view.setUint32(24, o.size, true)
  view.setUint16(28, o.name.length, true)
  view.setUint32(42, o.offset, true)
  buf.set(o.name, 46)
  return buf
}

export interface EocdOptions {
  count: number
  centralSize: number
  centralOffset: number
}

export function buildEocd(o: EocdOptions): Uint8Array {
  const buf = new Uint8Array(22)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, o.count, true)
  view.setUint16(10, o.count, true)
  view.setUint32(12, o.centralSize, true)
  view.setUint32(16, o.centralOffset, true)
  return buf
}
```

- [ ] **Step 4: 运行确认通过**

```bash
cd electron-app && npx vitest run tests/zip.spec.ts
```

预期：9 个测试 PASS。

- [ ] **Step 5: 实现流式导出主进程逻辑**

`electron-app/electron/zip-export.ts`：

```ts
import { dialog, BrowserWindow } from 'electron'
import { createReadStream, createWriteStream, statSync, unlinkSync } from 'node:fs'
import { once } from 'node:events'
import path from 'node:path'
import { resolveWithinRoot } from '../src/lib/path'
import { loadSavedRoot } from './stl-library'
import {
  buildCentralHeader,
  buildEocd,
  buildLocalHeader,
  crc32,
  zipDosStamp,
} from '../src/lib/zip/crc32'

export interface ExportProgress {
  jobId: string
  done: number
  total: number
  bytes: number
  currentFile: string
  state: 'running' | 'done' | 'failed' | 'canceled'
  error?: string
}

const jobs = new Map<string, AbortController>()

async function readWholeFile(file: string): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  const stream = createReadStream(file)
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  return new Uint8Array(Buffer.concat(chunks))
}

/**
 * 逐件流式写入 ZIP（store 模式）。内存只占单个文件，
 * 因此 25 GB 级清单也不会整块驻留。
 */
export async function exportZip(
  win: BrowserWindow,
  relPaths: string[],
  jobId: string,
): Promise<{ canceled: boolean; savedTo?: string }> {
  const root = loadSavedRoot()
  if (!root) throw new Error('STL 库未配置')

  const target = await dialog.showSaveDialog(win, {
    title: '导出 STL 压缩包',
    defaultPath: `VAULT_USSA_STL_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`,
    filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }],
  })
  if (target.canceled || !target.filePath) return { canceled: true }

  const controller = new AbortController()
  jobs.set(jobId, controller)

  const out = createWriteStream(target.filePath)
  const stamp = zipDosStamp(new Date())
  const central: Uint8Array[] = []
  let offset = 0
  let bytes = 0

  const emit = (patch: Partial<ExportProgress>) => {
    if (win.isDestroyed()) return
    win.webContents.send('export:progress', {
      jobId, done: 0, total: relPaths.length, bytes, currentFile: '', state: 'running', ...patch,
    } satisfies ExportProgress)
  }

  try {
    for (let i = 0; i < relPaths.length; i++) {
      if (controller.signal.aborted) throw new Error('canceled')

      const rel = relPaths[i]
      const file = resolveWithinRoot(root, rel)
      if (!file) throw new Error(`非法路径：${rel}`)

      let size: number
      try {
        size = statSync(file).size
      } catch {
        throw new Error(`缺少文件：${rel}`)
      }

      emit({ done: i, currentFile: rel })

      // 逐件读入以计算 CRC（CRC 必须先于本地头写出）
      const data = await readWholeFile(file)
      const crc = crc32(data)
      const nameBytes = new TextEncoder().encode(rel)

      const local = buildLocalHeader({ name: nameBytes, crc, size, stamp })
      out.write(local)
      out.write(data)
      central.push(buildCentralHeader({ name: nameBytes, crc, size, stamp, offset }))

      offset += local.length + data.length
      bytes += data.length
    }

    const centralOffset = offset
    let centralSize = 0
    for (const header of central) {
      out.write(header)
      centralSize += header.length
    }
    out.write(buildEocd({ count: central.length, centralSize, centralOffset }))
    out.end()
    await once(out, 'finish')

    emit({ done: relPaths.length, state: 'done' })
    return { canceled: false, savedTo: target.filePath }
  } catch (error) {
    out.destroy()
    try {
      unlinkSync(target.filePath)
    } catch {
      // 文件可能根本没创建，忽略
    }
    const canceled = (error as Error).message === 'canceled'
    emit({
      state: canceled ? 'canceled' : 'failed',
      error: canceled ? undefined : (error as Error).message,
    })
    if (canceled) return { canceled: true }
    throw error
  } finally {
    jobs.delete(jobId)
  }
}

export function cancelExport(jobId: string): void {
  jobs.get(jobId)?.abort()
}
```

- [ ] **Step 6: 接线 IPC 与 preload**

`electron-app/electron/preload.ts` 追加：

```ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getLibraryState: () => ipcRenderer.invoke('library:get'),
  selectLibraryRoot: () => ipcRenderer.invoke('library:select'),
  exportZip: (relPaths: string[], jobId: string) =>
    ipcRenderer.invoke('export:start', relPaths, jobId),
  cancelExport: (jobId: string) => ipcRenderer.send('export:cancel', jobId),
  onExportProgress: (handler: (p: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => handler(payload)
    ipcRenderer.on('export:progress', listener)
    return () => ipcRenderer.removeListener('export:progress', listener)
  },
}

contextBridge.exposeInMainWorld('vaultApi', api)
```

`electron-app/electron/main.ts` 的 `app.whenReady()` 内追加：

```ts
import { exportZip, cancelExport } from './zip-export'
import { randomUUID } from 'node:crypto'

ipcMain.handle('export:start', (event, relPaths: string[], jobId: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) throw new Error('窗口已关闭')
  return exportZip(win, relPaths, jobId)
})
ipcMain.on('export:cancel', (_event, jobId: string) => cancelExport(jobId))
```

`electron-app/src/env.d.ts` 的 `VaultApi` 追加：

```ts
interface ExportProgress {
  jobId: string
  done: number
  total: number
  bytes: number
  currentFile: string
  state: 'running' | 'done' | 'failed' | 'canceled'
  error?: string
}

interface VaultApi {
  // ...前面已有的方法
  exportZip(relPaths: string[], jobId: string): Promise<{ canceled: boolean; savedTo?: string }>
  cancelExport(jobId: string): void
  onExportProgress(handler: (p: ExportProgress) => void): () => void
}
```

- [ ] **Step 7: 手工验证导出**

准备一个临时目录，放入 `01. DRAWERS/`、`02. SUSTAINERS/`、`03. MODIFICATIONS/`，其中放 3 个小型 STL（可用文本内容代替，仅验证 ZIP 结构）。把它设为库根目录，然后在开发者工具控制台执行：

```js
await window.vaultApi.exportZip(
  ['01. DRAWERS/a.stl', '02. SUSTAINERS/b.stl', '03. MODIFICATIONS/c.stl'],
  'job-1',
)
```

预期：
- 弹出保存对话框
- 保存后生成 zip 文件
- 用系统解压工具能正常解出 3 个文件，目录结构保留

- [ ] **Step 8: 提交**

```bash
git add electron-app/src/lib/zip electron-app/electron/zip-export.ts electron-app/electron/preload.ts electron-app/electron/main.ts electron-app/src/env.d.ts electron-app/tests/zip.spec.ts
git commit -m "feat(electron-app): 实现流式 ZIP 导出（store 模式，含进度与取消）"
```

---

## Task 6: Pinia Store（库 / 清单 / 构型 / 配色）

**Files:**
- Create: `electron-app/src/stores/library.ts`
- Create: `electron-app/src/stores/bom.ts`
- Create: `electron-app/src/stores/config.ts`
- Create: `electron-app/src/stores/color.ts`
- Test: `electron-app/tests/stores/bom.spec.ts`
- Test: `electron-app/tests/stores/config.spec.ts`

**Interfaces:**
- Consumes: `VAULT_DATA`（Task 2）、`window.vaultApi`（Task 4）
- Produces:
  - `useLibraryStore()`：`root`、`valid`、`missing`、`ready`、`refresh()`、`choose()`
  - `useBomStore()`：`items`、`fileCount`、`totalQty`、`totalBytes`、`progress`、`add(entry, qty)`、`setQty`、`toggleDone`、`remove`、`clear`、`applyTemplate(group)`、`exportList()`
  - `useConfigStore()`：`mode`、`family`、`size`、`height`、`matchedParts`
  - `useColorStore()`：`colors`、`activePreset`、`applyPreset(id)`、`setColor(key, hex)`、`colorFor(entry)`
  - `BomItem` 类型

- [ ] **Step 1: 写清单 store 的失败测试**

`electron-app/tests/stores/bom.spec.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBomStore } from '@/stores/bom'

describe('打印清单 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('初始为空', () => {
    const bom = useBomStore()
    expect(bom.items).toEqual([])
    expect(bom.fileCount).toBe(0)
    expect(bom.totalQty).toBe(0)
  })

  it('加入同一条目时累加份数而不是新增行', () => {
    const bom = useBomStore()
    bom.add('01. DRAWERS/a.stl', 'A', 2)
    bom.add('01. DRAWERS/a.stl', 'A', 3)
    expect(bom.items).toHaveLength(1)
    expect(bom.items[0].qty).toBe(5)
  })

  it('份数下限为 1', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.setQty('a.stl', 0)
    expect(bom.items[0].qty).toBe(1)
  })

  it('fileCount 统计文件数、totalQty 统计件数', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 2)
    bom.add('b.stl', 'B', 3)
    expect(bom.fileCount).toBe(2)
    expect(bom.totalQty).toBe(5)
  })

  it('progress 按完成项占比计算', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.add('b.stl', 'B', 1)
    expect(bom.progress).toBe(0)
    bom.toggleDone('a.stl')
    expect(bom.progress).toBe(50)
  })

  it('remove 删除指定条目', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.add('b.stl', 'B', 1)
    bom.remove('a.stl')
    expect(bom.items.map((i) => i.path)).toEqual(['b.stl'])
  })

  it('clear 清空全部', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.clear()
    expect(bom.items).toHaveLength(0)
  })

  it('applyTemplate 用模板条目替换清单', () => {
    const bom = useBomStore()
    bom.add('old.stl', 'Old', 1)
    bom.applyTemplate({
      id: 'A01',
      name: '测试模板',
      why: '',
      depth: 3,
      width: 'L',
      roof: 'table',
      counts: { drawers: 1, modules: 1, cases: 0 },
      items: [
        { p: 'x.stl', q: 2, part: 'box', partName: '抽屉盒', color: 1, support: false, ref: 'm1' },
      ],
    })
    expect(bom.items).toHaveLength(1)
    expect(bom.items[0]).toMatchObject({ path: 'x.stl', qty: 2 })
  })

  it('状态写入 localStorage 后可恢复', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 4)
    const snapshot = localStorage.getItem(bom.storageKey)
    expect(snapshot).toBeTruthy()
    expect(JSON.parse(snapshot!).items[0].qty).toBe(4)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
cd electron-app && npx vitest run tests/stores/bom.spec.ts
```

预期：FAIL，`Failed to resolve import "@/stores/bom"`。

- [ ] **Step 3: 实现清单 store**

`electron-app/src/stores/bom.ts`：

```ts
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { SceneGroup } from '@/data/types'

export interface BomItem {
  path: string
  name: string
  qty: number
  done: boolean
  batchStatus: 'pending' | 'printed' | 'assembled'
  colorKey: string
}

const STORAGE_KEY = 'vault-ussa-bom-v2'
const clampQty = (value: number) => Math.max(1, Math.floor(Number(value) || 1))

export const useBomStore = defineStore('bom', () => {
  const storageKey = STORAGE_KEY
  const items = ref<BomItem[]>([])

  function load(): void {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
      if (parsed && Array.isArray(parsed.items)) {
        items.value = parsed.items
          .filter((i: BomItem) => typeof i?.path === 'string')
          .map((i: BomItem) => ({
            path: i.path,
            name: i.name ?? i.path,
            qty: clampQty(i.qty),
            done: Boolean(i.done),
            batchStatus: i.batchStatus ?? 'pending',
            colorKey: i.colorKey ?? '',
          }))
      }
    } catch {
      items.value = []
    }
  }

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items.value }))
    } catch {
      // 存储不可用时静默降级，不阻断使用
    }
  }

  load()
  watch(items, persist, { deep: true })

  const fileCount = computed(() => items.value.length)
  const totalQty = computed(() => items.value.reduce((sum, i) => sum + i.qty, 0))
  const doneCount = computed(() => items.value.filter((i) => i.done).length)
  const progress = computed(() =>
    items.value.length === 0 ? 0 : Math.round((doneCount.value / items.value.length) * 100),
  )

  function add(path: string, name: string, qty = 1, colorKey = ''): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) {
      hit.qty = clampQty(hit.qty + clampQty(qty))
      return
    }
    items.value.push({
      path,
      name,
      qty: clampQty(qty),
      done: false,
      batchStatus: 'pending',
      colorKey,
    })
  }

  function setQty(path: string, qty: number): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) hit.qty = clampQty(qty)
  }

  function toggleDone(path: string): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) hit.done = !hit.done
  }

  function setBatch(path: string, status: BomItem['batchStatus']): void {
    const hit = items.value.find((i) => i.path === path)
    if (hit) hit.batchStatus = status
  }

  function remove(path: string): void {
    items.value = items.value.filter((i) => i.path !== path)
  }

  function clear(): void {
    items.value = []
  }

  function applyTemplate(group: SceneGroup): void {
    items.value = group.items.map((item) => ({
      path: item.p,
      name: item.p.split('/').pop() ?? item.p,
      qty: clampQty(item.q),
      done: false,
      batchStatus: 'pending' as const,
      colorKey: item.part,
    }))
  }

  function exportList(): { path: string; qty: number }[] {
    return items.value.map((i) => ({ path: i.path, qty: i.qty }))
  }

  return {
    storageKey,
    items,
    fileCount,
    totalQty,
    doneCount,
    progress,
    add,
    setQty,
    toggleDone,
    setBatch,
    remove,
    clear,
    applyTemplate,
    exportList,
  }
})
```

- [ ] **Step 4: 运行确认通过**

```bash
cd electron-app && npx vitest run tests/stores/bom.spec.ts
```

预期：9 个测试 PASS。测试环境为 `node`，需在 `vitest.config.ts` 的 `test` 里加 `environment: 'happy-dom'` 才能用 `localStorage`——若未安装，改为在文件顶部用内存实现替代。

- [ ] **Step 5: 补充 happy-dom 并修正测试环境**

若 Step 4 因 `localStorage is not defined` 失败：

```bash
cd electron-app && npm i -D happy-dom
```

`vitest.config.ts` 改为：

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
  },
})
```

- [ ] **Step 6: 写库 / 构型 / 配色 store**

`electron-app/src/stores/library.ts`：

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useLibraryStore = defineStore('library', () => {
  const root = ref<string | null>(null)
  const valid = ref(false)
  const missing = ref<string[]>([])
  const checked = ref(false)

  const ready = computed(() => valid.value && Boolean(root.value))

  async function refresh(): Promise<void> {
    const state = await window.vaultApi.getLibraryState()
    root.value = state.root
    valid.value = state.valid
    missing.value = state.missing
    checked.value = true
  }

  async function choose(): Promise<void> {
    const state = await window.vaultApi.selectLibraryRoot()
    root.value = state.root
    valid.value = state.valid
    missing.value = state.missing
    checked.value = true
  }

  return { root, valid, missing, checked, ready, refresh, choose }
})
```

`electron-app/src/stores/config.ts`：

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { VAULT_DATA } from '@/data/manifest'
import type { ManifestEntry } from '@/data/types'

export type BuildMode = 'drawer' | 'sustainer' | 'mod'

const GROUP_OF: Record<BuildMode, ManifestEntry['g']> = {
  drawer: 'drawers',
  sustainer: 'sustainers',
  mod: 'mods',
}

export const useConfigStore = defineStore('config', () => {
  const mode = ref<BuildMode>('drawer')
  const family = ref<string>('S')
  const size = ref<string>('3')
  const height = ref<string>('1F')

  const matchedParts = computed<ManifestEntry[]>(() =>
    VAULT_DATA.files.filter(
      (entry) =>
        entry.g === GROUP_OF[mode.value] &&
        (mode.value === 'mod' || entry.f === family.value) &&
        (mode.value === 'mod' || !entry.z || entry.z === size.value) &&
        (mode.value === 'mod' || !entry.h || entry.h === height.value),
    ),
  )

  const sheetCode = computed(() =>
    mode.value === 'mod' ? 'MOD' : `${family.value} / ${size.value} / ${height.value}`,
  )

  return { mode, family, size, height, matchedParts, sheetCode }
})
```

`electron-app/src/stores/color.ts`：

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { VAULT_PALETTES } from '@/data/palettes'

export const useColorStore = defineStore('color', () => {
  const activePreset = ref(VAULT_PALETTES.defaultPreset)
  const colors = ref<Record<string, string>>({
    ...VAULT_PALETTES.presets[VAULT_PALETTES.defaultPreset].colors,
  })
  const brushColor = ref('#ff6b00')
  const dyeMode = ref(false)

  function applyPreset(id: string): void {
    const preset = VAULT_PALETTES.presets[id]
    if (!preset) return
    activePreset.value = id
    colors.value = { ...preset.colors }
  }

  function setColor(key: string, hex: string): void {
    colors.value = { ...colors.value, [key]: hex }
    activePreset.value = 'custom'
  }

  function colorFor(partKey: string): string {
    return colors.value[partKey] ?? '#ff6b00'
  }

  const swatches = computed(() => VAULT_PALETTES.swatches)

  return { activePreset, colors, brushColor, dyeMode, swatches, applyPreset, setColor, colorFor }
})
```

- [ ] **Step 7: 写构型 store 的测试**

`electron-app/tests/stores/config.spec.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigStore } from '@/stores/config'

describe('构型 store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('默认抽屉模式匹配到非空部件集', () => {
    const config = useConfigStore()
    expect(config.mode).toBe('drawer')
    expect(config.matchedParts.length).toBeGreaterThan(0)
  })

  it('匹配结果都属于当前分组', () => {
    const config = useConfigStore()
    for (const part of config.matchedParts) {
      expect(part.g).toBe('drawers')
    }
  })

  it('切换族群后匹配结果随之变化', () => {
    const config = useConfigStore()
    const first = config.matchedParts.length
    config.family = 'XL'
    expect(config.matchedParts.length).not.toBe(first)
  })

  it('改装件模式不受族群与档位限制', () => {
    const config = useConfigStore()
    config.mode = 'mod'
    config.family = '不存在的族'
    expect(config.matchedParts.length).toBeGreaterThan(0)
    for (const part of config.matchedParts) {
      expect(part.g).toBe('mods')
    }
  })

  it('sheetCode 反映当前构型', () => {
    const config = useConfigStore()
    config.family = 'M'
    config.size = '4'
    config.height = '2F'
    expect(config.sheetCode).toBe('M / 4 / 2F')
  })
})
```

- [ ] **Step 8: 运行全部 store 测试**

```bash
cd electron-app && npx vitest run tests/stores
```

预期：bom 9 项 + config 5 项全部 PASS。

- [ ] **Step 9: 提交**

```bash
git add electron-app/src/stores electron-app/tests/stores electron-app/vitest.config.ts electron-app/package.json
git commit -m "feat(electron-app): 实现库 / 清单 / 构型 / 配色四个 Pinia store 并加单测"
```

---

## Task 7: 3D 渲染底座（ThreeCanvas + STL 加载与缓存）

**Files:**
- Create: `electron-app/src/composables/useThreeStage.ts`
- Create: `electron-app/src/composables/useStlLoader.ts`
- Create: `electron-app/src/components/three/ThreeCanvas.vue`

**Interfaces:**
- Consumes: `stlUrl`（Task 4）、`canonicalize` / `QuantizedMesh`（Task 3）
- Produces:
  - `useThreeStage(hostRef)` 返回 `{ scene, camera, renderer, controls, invalidate, dispose }`
  - `useStlLoader()` 返回 `{ load(path, category): Promise<LoadedPart>; clear(): void }`
  - `interface LoadedPart { path: string; quantized: QuantizedMesh; canonical: Canonical; triangles: number; bytes: number }`
  - `ThreeCanvas.vue` props：`autoRotate?: boolean`；exposes `{ invalidate(): void }`

- [ ] **Step 1: 实现渲染底座 composable**

`electron-app/src/composables/useThreeStage.ts`：

```ts
import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface ThreeStage {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  controls: OrbitControls
  invalidate: () => void
  dispose: () => void
}

export function useThreeStage(hostRef: Ref<HTMLElement | null>, background = 0x131310): ThreeStage {
  let renderer!: WebGLRenderer
  let scene!: Scene
  let camera!: PerspectiveCamera
  let controls!: OrbitControls
  let raf = 0
  let dirty = true
  let resizeObserver: ResizeObserver | null = null

  const invalidate = () => {
    dirty = true
  }

  function render(): void {
    raf = requestAnimationFrame(render)
    if (!dirty) return
    dirty = false
    controls.update()
    renderer.render(scene, camera)
  }

  onMounted(() => {
    const host = hostRef.value
    if (!host) return

    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    host.appendChild(renderer.domElement)

    scene = new Scene()
    scene.background = new Color(background)

    camera = new PerspectiveCamera(38, 1, 0.1, 20000)
    camera.position.set(320, -420, 280)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.12
    controls.addEventListener('change', invalidate)

    scene.add(new HemisphereLight(0xffffff, 0x555555, 1.8))
    const key = new DirectionalLight(0xffffff, 2.2)
    key.position.set(1, 1.4, 1.2)
    scene.add(key)
    const fill = new DirectionalLight(0xffffff, 0.8)
    fill.position.set(-1, -0.6, 0.4)
    scene.add(fill)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      invalidate()
    }
    resize()

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)

    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      cancelAnimationFrame(raf)
    })

    render()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    resizeObserver?.disconnect()
    controls?.dispose()
    renderer?.dispose()
    renderer?.domElement.remove()
  })

  return {
    get scene() { return scene },
    get camera() { return camera },
    get renderer() { return renderer },
    get controls() { return controls },
    invalidate,
    dispose() {
      cancelAnimationFrame(raf)
      renderer?.dispose()
    },
  }
}
```

- [ ] **Step 2: 实现 STL 加载与缓存 composable**

`electron-app/src/composables/useStlLoader.ts`：

```ts
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { BufferGeometry } from 'three'
import { stlUrl } from '@/lib/path'
import { canonicalize, type Canonical, type QuantizedMesh } from '@/lib/geometry/orientation'
import type { Vec3 } from '@/lib/geometry/vector'

export const MAX_PART_BYTES = 72 * 1048576
export const MAX_CACHE_BYTES = 180 * 1048576
export const CONCURRENCY = 2

export interface LoadedPart {
  path: string
  quantized: QuantizedMesh
  canonical: Canonical
  triangles: number
  bytes: number
}

const loader = new STLLoader()
const cache = new Map<string, LoadedPart>()
let cacheBytes = 0

/** 顶点按 65535 归一化为 Uint16，内存占用减半 */
function quantize(geometry: BufferGeometry): QuantizedMesh {
  const attr = geometry.getAttribute('position')
  const count = attr.count
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      const v = attr.getComponent(i, a)
      if (v < min[a]) min[a] = v
      if (v > max[a]) max[a] = v
    }
  }
  const span: Vec3 = [max[0] - min[0] || 1, max[1] - min[1] || 1, max[2] - min[2] || 1]
  const positions = new Uint16Array(count * 3)
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      const v = attr.getComponent(i, a)
      positions[i * 3 + a] = Math.round(((v - min[a]) / span[a]) * 65535)
    }
  }
  return { positions, minimum: min, maximum: max }
}

function trimCache(): void {
  if (cacheBytes <= MAX_CACHE_BYTES) return
  for (const key of Array.from(cache.keys())) {
    if (cacheBytes <= MAX_CACHE_BYTES) break
    const entry = cache.get(key)
    if (!entry) continue
    cacheBytes -= entry.bytes
    cache.delete(key)
  }
}

async function fetchOne(path: string, category: string): Promise<LoadedPart> {
  const response = await fetch(stlUrl(path))
  if (!response.ok) {
    throw new Error(response.status === 404 ? `缺少文件：${path}` : `读取失败（${response.status}）：${path}`)
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_PART_BYTES) throw new Error('oversized')

  const geometry = loader.parse(buffer)
  const quantized = quantize(geometry)
  geometry.dispose()

  const part: LoadedPart = {
    path,
    quantized,
    canonical: canonicalize(quantized, category, path),
    triangles: quantized.positions.length / 9,
    bytes: quantized.positions.byteLength,
  }
  cache.set(path, part)
  cacheBytes += part.bytes
  trimCache()
  return part
}

export function useStlLoader() {
  const pending = new Map<string, Promise<LoadedPart>>()

  function load(path: string, category: string): Promise<LoadedPart> {
    const cached = cache.get(path)
    if (cached) return Promise.resolve(cached)
    const inflight = pending.get(path)
    if (inflight) return inflight
    const job = fetchOne(path, category).finally(() => pending.delete(path))
    pending.set(path, job)
    return job
  }

  /** 并发受控地加载一组部件，逐个回调进度 */
  function loadAll(
    list: { path: string; category: string }[],
    onProgress?: (done: number, total: number, current: string) => void,
  ): Promise<PromiseSettledResult<LoadedPart>[]> {
    return new Promise((resolve) => {
      const results: PromiseSettledResult<LoadedPart>[] = new Array(list.length)
      let index = 0
      let active = 0
      let done = 0

      const pump = () => {
        while (active < CONCURRENCY && index < list.length) {
          const i = index++
          const item = list[i]
          active++
          load(item.path, item.category)
            .then(
              (value) => { results[i] = { status: 'fulfilled', value } },
              (reason) => { results[i] = { status: 'rejected', reason } },
            )
            .finally(() => {
              active--
              done++
              onProgress?.(done, list.length, item.path)
              pump()
            })
        }
        if (active === 0 && index >= list.length) resolve(results)
      }
      pump()
    })
  }

  function clear(): void {
    cache.clear()
    cacheBytes = 0
  }

  return { load, loadAll, clear }
}
```

- [ ] **Step 3: 实现 ThreeCanvas 组件**

`electron-app/src/components/three/ThreeCanvas.vue`：

```vue
<template>
  <div ref="host" class="three-canvas">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useThreeStage } from '@/composables/useThreeStage'

const host = ref<HTMLElement | null>(null)
const stage = useThreeStage(host)

defineExpose({ stage, invalidate: stage.invalidate })
</script>

<style scoped>
.three-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.three-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
```

- [ ] **Step 4: 手工验证单个 STL 可加载**

临时把 `App.vue` 换成：

```vue
<template>
  <div style="height:100vh;display:flex;flex-direction:column">
    <button @click="pick">选择 STL 库</button>
    <p>{{ status }}</p>
    <ThreeCanvas />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ThreeCanvas from '@/components/three/ThreeCanvas.vue'
import { useStlLoader } from '@/composables/useStlLoader'
import { VAULT_DATA } from '@/data/manifest'

const status = ref('未加载')
const { load } = useStlLoader()

async function pick() {
  await window.vaultApi.selectLibraryRoot()
  const entry = VAULT_DATA.files.find((f) => f.c.endsWith('box'))!
  try {
    const part = await load(entry.p, entry.c)
    status.value = `已加载 ${entry.p} · ${part.triangles} 三角面 · 尺寸 ${part.canonical.size.map((v) => v.toFixed(0)).join('×')}`
  } catch (e) {
    status.value = `失败：${(e as Error).message}`
  }
}
</script>
```

```bash
cd electron-app && npm run dev
```

预期：选择库目录后点击，状态行显示三角面数与尺寸；尺寸应为合理的毫米量级（几十到几百），而非 0 或天文数字。

- [ ] **Step 5: 提交**

```bash
git add electron-app/src/composables electron-app/src/components/three
git commit -m "feat(electron-app): 实现 three.js 渲染底座与 STL 加载缓存"
```

---

## Task 8: 组合装配视图

**Files:**
- Create: `electron-app/src/components/three/AssemblyView.vue`
- Create: `electron-app/src/composables/useAssembly.ts`

**Interfaces:**
- Consumes: `useThreeStage`、`useStlLoader`（Task 7）、`layout`（Task 3）、`useColorStore`（Task 6）
- Produces:
  - `useAssembly()` 返回 `{ build(paths, categories): Promise<AssemblyResult>; setExplode(v: number): void; reset(): void; setView('reset'|'front'|'top'): void }`
  - `AssemblyView.vue` props：`paths: string[]`、`categories: Record<string, string>`；emits `loaded(stats)`

- [ ] **Step 1: 实现装配 composable**

`electron-app/src/composables/useAssembly.ts`：

```ts
import { ref } from 'vue'
import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  BufferGeometry,
  BufferAttribute,
  DoubleSide,
  Box3,
  Vector3,
} from 'three'
import type { ThreeStage } from './useThreeStage'
import { useStlLoader, type LoadedPart } from './useStlLoader'
import { layout, type LayoutInput, type Placed } from '@/lib/geometry/layout'
import { dequantize } from '@/lib/geometry/orientation'
import type { Vec3 } from '@/lib/geometry/vector'

export const MAX_SCENE_TRIANGLES = 5_000_000
export const MAX_SCENE_PARTS = 80
const CORE_CATS = new Set(['box', 'module', 'roof', 'baseplate', 'facade', 'backpanel'])

/** 爆炸展开方向，按类别定义在布局空间（X 宽 / Y 深 / Z 高） */
const EXPLODE_DIRS: Record<string, Vec3> = {
  roof: [0, 0, 0.95],
  module: [0, 0, 0.45],
  baseplate: [0, 0, -0.55],
  facade: [0, -0.85, 0],
  box: [0, 0, 0],
}

export interface AssemblyResult {
  partCount: number
  triangles: number
  skipped: number
  failed: number
  oversized: number
}

function geometryFromQuantized(part: LoadedPart): BufferGeometry {
  const { positions, minimum, maximum } = part.quantized
  const count = positions.length / 3
  const floats = new Float32Array(count * 3)
  const p: Vec3 = [0, 0, 0]
  for (let i = 0; i < count; i++) {
    dequantize({ positions, minimum, maximum }, i, p)
    floats[i * 3] = p[0]
    floats[i * 3 + 1] = p[1]
    floats[i * 3 + 2] = p[2]
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(floats, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function useAssembly() {
  const { loadAll } = useStlLoader()
  let stage: ThreeStage | null = null
  let root: Group | null = null
  let lastPlaced: { mesh: Mesh; placed: Placed }[] = []
  let explode = 0

  function attach(next: ThreeStage): void {
    stage = next
  }

  function disposeRoot(): void {
    if (!root || !stage) return
    stage.scene.remove(root)
    root.traverse((object) => {
      const mesh = object as Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as MeshStandardMaterial | undefined
      material?.dispose()
    })
    root = null
    lastPlaced = []
  }

  async function build(
    list: { path: string; category: string }[],
    colorFor: (category: string) => string,
  ): Promise<AssemblyResult> {
    if (!stage) throw new Error('渲染器未就绪')
    disposeRoot()

    const settled = await loadAll(list)

    const parts: LoadedPart[] = []
    let failed = 0
    let oversized = 0
    for (const result of settled) {
      if (result.status === 'rejected') {
        if ((result.reason as Error)?.message === 'oversized') oversized++
        else failed++
        continue
      }
      parts.push(result.value)
    }

    // 核心结构始终保留，小件按顺序填充直到三角面预算耗尽
    const core = parts.filter((p) => CORE_CATS.has(list.find((l) => l.path === p.path)!.category))
    const rest = parts.filter((p) => !core.includes(p))
    let triangles = core.reduce((sum, p) => sum + p.triangles, 0)

    const kept = [...core]
    let skipped = 0
    for (const part of rest) {
      if (kept.length >= MAX_SCENE_PARTS || triangles + part.triangles > MAX_SCENE_TRIANGLES) {
        skipped++
        continue
      }
      kept.push(part)
      triangles += part.triangles
    }

    const inputs: LayoutInput[] = kept.map((part) => {
      const category = list.find((l) => l.path === part.path)!.category
      return {
        part: { category, name: part.path.split('/').pop() ?? part.path, split: 0 },
        size: part.canonical.size,
        quat: part.canonical.quat,
      }
    })

    const placed = layout(inputs)
    if (!placed) {
      return { partCount: 0, triangles: 0, skipped, failed, oversized }
    }

    const group = new Group()
    const materialCache = new Map<string, MeshStandardMaterial>()

    for (const item of placed) {
      const part = kept.find((p) => p.path.split('/').pop() === item.entry.part.name) ?? kept[0]
      const geometry = geometryFromQuantized(part)
      const category = item.entry.part.category
      let material = materialCache.get(category)
      if (!material) {
        material = new MeshStandardMaterial({
          color: new Color(colorFor(category)),
          roughness: 0.62,
          metalness: 0.06,
          side: DoubleSide,
          flatShading: false,
        })
        materialCache.set(category, material)
      }
      const mesh = new Mesh(geometry, material)
      mesh.quaternion.set(...item.entry.quat)
      mesh.position.set(...item.center)
      group.add(mesh)
      lastPlaced.push({ mesh, placed: item })
    }

    stage.scene.add(group)
    root = group

    frameAll(group)
    return { partCount: placed.length, triangles, skipped, failed, oversized }
  }

  function frameAll(group: Group): void {
    if (!stage) return
    const box = new Box3().setFromObject(group)
    if (box.isEmpty()) return
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const radius = Math.max(size.x, size.y, size.z) || 100

    stage.camera.position.set(center.x + radius * 1.3, center.y - radius * 1.7, center.z + radius * 1.1)
    stage.controls.target.copy(center)
    stage.camera.near = Math.max(radius / 500, 0.1)
    stage.camera.far = radius * 40
    stage.camera.updateProjectionMatrix()
    stage.controls.update()
    stage.invalidate()
  }

  function setExplode(percent: number): void {
    explode = percent / 100
    applyExplode()
  }

  function applyExplode(): void {
    if (!stage) return
    const span = 220 * explode
    for (const { mesh, placed } of lastPlaced) {
      const dir = EXPLODE_DIRS[placed.entry.part.category] ?? [0, 0, 0]
      mesh.position.set(
        placed.center[0] + dir[0] * span,
        placed.center[1] + dir[1] * span,
        placed.center[2] + dir[2] * span,
      )
    }
    stage.invalidate()
  }

  function setView(view: 'reset' | 'front' | 'top'): void {
    if (!stage) return
    if (view === 'reset' && root) frameAll(root)
    if (view === 'front') {
      const target = stage.controls.target
      stage.camera.position.set(target.x, target.y - 900, target.z)
      stage.controls.update()
    }
    if (view === 'top') {
      const target = stage.controls.target
      stage.camera.position.set(target.x, target.y, target.z + 900)
      stage.controls.update()
    }
    stage.invalidate()
  }

  function reset(): void {
    disposeRoot()
  }

  return { attach, build, setExplode, setView, reset }
}
```

- [ ] **Step 2: 实现 AssemblyView 组件**

`electron-app/src/components/three/AssemblyView.vue`：

```vue
<template>
  <div class="assembly-view">
    <ThreeCanvas ref="canvas" />
    <div class="hud">
      <span class="hud-kicker">LIVE ASSEMBLY</span>
      <b>{{ title }}</b>
      <span class="hud-stats">{{ stats }}</span>
    </div>
    <div class="dock">
      <label class="explode">
        展开 <em>EXPLODE</em>
        <input
          type="range" min="0" max="100" step="1"
          :value="explodeValue"
          :disabled="!ready"
          @input="onExplode"
        />
        <span>{{ explodeValue }}%</span>
      </label>
      <div class="views">
        <button :disabled="!ready" @click="assembly.setView('reset')">重置</button>
        <button :disabled="!ready" @click="assembly.setView('front')">正视</button>
        <button :disabled="!ready" @click="assembly.setView('top')">俯视</button>
      </div>
    </div>
    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ThreeCanvas from './ThreeCanvas.vue'
import { useAssembly } from '@/composables/useAssembly'
import { useColorStore } from '@/stores/color'

const props = defineProps<{
  title: string
  parts: { path: string; category: string }[]
}>()

const emit = defineEmits<{ loaded: [count: number] }>()

const canvas = ref<InstanceType<typeof ThreeCanvas> | null>(null)
const colorStore = useColorStore()
const assembly = useAssembly()

const explodeValue = ref(0)
const ready = ref(false)
const status = ref('')
const stats = ref('—')

watch(canvas, (instance) => {
  if (instance) assembly.attach(instance.stage)
}, { immediate: true })

watch(
  () => props.parts,
  async (list) => {
    if (!list.length) return
    ready.value = false
    status.value = '正在读取组合…'
    try {
      const result = await assembly.build(list, (category) => colorStore.colorFor(category))
      explodeValue.value = 0
      stats.value = `${result.partCount} 件 · ${(result.triangles / 1000).toFixed(0)}K 面`
      const notes: string[] = []
      if (result.skipped) notes.push(`省略 ${result.skipped} 件小件`)
      if (result.failed) notes.push(`${result.failed} 件读取失败`)
      if (result.oversized) notes.push(`${result.oversized} 件面数过高`)
      status.value = notes.join(' · ')
      ready.value = result.partCount > 0
      emit('loaded', result.partCount)
    } catch (error) {
      status.value = `组合失败：${(error as Error).message}`
      ready.value = false
    }
  },
  { deep: true },
)

function onExplode(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  explodeValue.value = value
  assembly.setExplode(value)
}
</script>

<style scoped>
.assembly-view {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--stage);
}
.hud {
  position: absolute;
  top: 16px;
  left: 18px;
  display: grid;
  gap: 2px;
  color: var(--paper);
  pointer-events: none;
}
.hud-kicker {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--accent);
}
.hud b {
  font-family: var(--display);
  font-size: 20px;
  letter-spacing: 0.04em;
}
.hud-stats {
  font-family: var(--mono);
  font-size: 11px;
  opacity: 0.7;
}
.dock {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--stage) 82%, transparent);
  border: 1px solid rgba(233, 228, 214, 0.16);
  border-radius: 3px;
}
.explode {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  color: var(--paper);
  font-size: 12px;
}
.explode em {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  opacity: 0.55;
  font-style: normal;
}
.explode input {
  flex: 1;
  accent-color: var(--accent);
}
.explode span {
  font-family: var(--mono);
  font-size: 11px;
  min-width: 36px;
  text-align: right;
}
.views {
  display: flex;
  gap: 6px;
}
.views button {
  padding: 5px 12px;
  font-size: 11px;
  color: var(--paper);
  background: transparent;
  border: 1px solid rgba(233, 228, 214, 0.28);
  border-radius: 2px;
  cursor: pointer;
}
.views button:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.views button:disabled {
  opacity: 0.35;
  cursor: default;
}
.status {
  position: absolute;
  left: 18px;
  bottom: 64px;
  margin: 0;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--paper);
  opacity: 0.7;
}
</style>
```

- [ ] **Step 3: 手工验证装配视图**

用 `App.vue` 临时挂载，传入一个抽屉的部件路径（可从 `VAULT_DATA` 按 `f==='S' && z==='3'` 过滤），验证：

- 模型正确堆叠：盒体在中间、顶盖在上、面板在前
- 旋转、缩放流畅
- 展开滑块 0% → 100% 时各部件沿合理方向散开
- 「正视」「俯视」「重置」切换正确
- 控制台无 WebGL 报错

- [ ] **Step 4: 提交**

```bash
git add electron-app/src/composables/useAssembly.ts electron-app/src/components/three/AssemblyView.vue
git commit -m "feat(electron-app): 实现组合装配视图（布局 / 爆炸展开 / 视角切换）"
```

---

## Task 9: 单件预览

**Files:**
- Create: `electron-app/src/components/three/SinglePreview.vue`

**Interfaces:**
- Consumes: `useThreeStage`（Task 7）、`useStlLoader`（Task 7）
- Produces: 组件 props `{ path: string; name: string }`；关闭时 emits `close`

- [ ] **Step 1: 实现组件**

`electron-app/src/components/three/SinglePreview.vue`：

```vue
<template>
  <div class="preview-backdrop" @click.self="$emit('close')">
    <section class="preview-panel">
      <header>
        <div>
          <span class="kicker">SINGLE PREVIEW</span>
          <b>{{ name }}</b>
        </div>
        <button class="close" aria-label="关闭" @click="$emit('close')">×</button>
      </header>

      <div class="stage">
        <div ref="host" class="host"></div>
        <p v-if="!ready" class="overlay">{{ status }}</p>
      </div>

      <footer v-if="info">
        <div><span>尺寸</span><b>{{ info.size }}</b></div>
        <div><span>三角面</span><b>{{ info.triangles }}</b></div>
        <div><span>文件</span><b>{{ info.bytes }}</b></div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Box3, BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { useThreeStage } from '@/composables/useThreeStage'
import { useStlLoader } from '@/composables/useStlLoader'
import { dequantize } from '@/lib/geometry/orientation'
import type { Vec3 } from '@/lib/geometry/vector'

const props = defineProps<{ path: string; name: string; category?: string }>()
defineEmits<{ close: [] }>()

const host = ref<HTMLElement | null>(null)
const status = ref('正在读取…')
const ready = ref(false)
const info = ref<{ size: string; triangles: string; bytes: string } | null>(null)

const stage = useThreeStage(host)
const { load } = useStlLoader()
let mesh: Mesh | null = null

onMounted(async () => {
  try {
    const part = await load(props.path, props.category ?? 'other')

    const { positions, minimum, maximum } = part.quantized
    const count = positions.length / 3
    const floats = new Float32Array(count * 3)
    const p: Vec3 = [0, 0, 0]
    for (let i = 0; i < count; i++) {
      dequantize(part.quantized, i, p)
      floats[i * 3] = p[0]
      floats[i * 3 + 1] = p[1]
      floats[i * 3 + 2] = p[2]
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(floats, 3))
    geometry.computeVertexNormals()

    const material = new MeshStandardMaterial({
      color: new Color(0xb8bcc0),
      roughness: 0.6,
      metalness: 0.05,
      side: DoubleSide,
    })

    mesh = new Mesh(geometry, material)
    stage.scene.add(mesh)

    const box = new Box3().setFromObject(mesh)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const radius = Math.max(size.x, size.y, size.z) || 100

    mesh.position.sub(center)
    stage.camera.position.set(radius * 1.2, -radius * 1.6, radius * 1.1)
    stage.camera.near = Math.max(radius / 500, 0.1)
    stage.camera.far = radius * 40
    stage.camera.updateProjectionMatrix()
    stage.controls.target.set(0, 0, 0)
    stage.controls.update()
    stage.invalidate()

    const f = (v: number) => v.toFixed(1)
    info.value = {
      size: `${f(size.x)} × ${f(size.y)} × ${f(size.z)} mm`,
      triangles: part.triangles.toLocaleString('zh-CN'),
      bytes: part.bytes >= 1048576
        ? `${(part.bytes / 1048576).toFixed(1)} MB`
        : `${(part.bytes / 1024).toFixed(0)} KB`,
    }
    ready.value = true
  } catch (error) {
    status.value = `读取失败：${(error as Error).message}`
  }
})

onBeforeUnmount(() => {
  if (mesh) {
    stage.scene.remove(mesh)
    mesh.geometry.dispose()
    ;(mesh.material as MeshStandardMaterial).dispose()
  }
})
</script>

<style scoped>
.preview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(19, 19, 16, 0.72);
  backdrop-filter: blur(3px);
}
.preview-panel {
  display: flex;
  flex-direction: column;
  width: min(880px, 92vw);
  height: min(680px, 88vh);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 3px;
  overflow: hidden;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
header b {
  display: block;
  font-size: 15px;
  color: var(--ink);
}
.kicker {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--accent);
}
.close {
  width: 28px;
  height: 28px;
  font-size: 18px;
  line-height: 1;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
  cursor: pointer;
  color: var(--ink);
}
.stage {
  position: relative;
  flex: 1;
  background: var(--stage);
}
.host {
  width: 100%;
  height: 100%;
}
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  margin: 0;
  color: var(--paper);
  font-family: var(--mono);
  font-size: 12px;
}
footer {
  display: flex;
  gap: 32px;
  padding: 12px 18px;
  border-top: 1px solid var(--line);
}
footer div {
  display: grid;
  gap: 1px;
}
footer span {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
footer b {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
}
</style>
```

- [ ] **Step 2: 手工验证**

打开一个真实 STL，确认：
- 模型居中显示，尺寸数值合理（毫米量级）
- 旋转、缩放正常
- 点击遮罩或右上角 × 可关闭

- [ ] **Step 3: 提交**

```bash
git add electron-app/src/components/three/SinglePreview.vue
git commit -m "feat(electron-app): 实现单件 STL 预览弹窗"
```

---

## Task 10: 主界面骨架与构型视图

**Files:**
- Create: `electron-app/src/styles/tokens.css`
- Create: `electron-app/src/styles/base.css`
- Create: `electron-app/src/router/index.ts`
- Create: `electron-app/src/App.vue`（替换脚手架版本）
- Create: `electron-app/src/components/AppRail.vue`
- Create: `electron-app/src/components/LibraryGate.vue`
- Create: `electron-app/src/components/ToastHost.vue`
- Create: `electron-app/src/views/BuildView.vue`
- Create: `electron-app/src/components/ConfigPanel.vue`
- Create: `electron-app/src/components/ColorStudio.vue`

**Interfaces:**
- Consumes: 四个 store（Task 6）、`AssemblyView`（Task 8）
- Produces: 可导航的四视图外壳；`LibraryGate` 在库未就绪时挡住主界面

- [ ] **Step 1: 写设计变量**

`electron-app/src/styles/tokens.css`：

```css
:root {
  --paper: #e9e4d6;
  --paper-hi: #f4efe2;
  --paper-dim: #dcd5c3;
  --ink: #14140f;
  --muted: #6f6a5a;
  --line: #c3bba8;
  --line-soft: rgba(20, 20, 15, 0.1);
  --accent: #e1461c;
  --stage: #131310;

  --display: 'Barlow Condensed', 'Arial Narrow', Impact, sans-serif;
  --mono: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  --body: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);

  --chrome-h: 78px;
  --gutter: 20px;
  --console-w: 364px;
  --bom-w: 384px;
}
```

`electron-app/src/styles/base.css`：

```css
@import './tokens.css';

* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--body);
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input,
select {
  font-family: inherit;
  font-size: inherit;
}
```

在 `electron-app/src/main.ts` 中 `import './styles/base.css'`，并挂载 router 与 pinia：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/base.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

- [ ] **Step 2: 配置路由**

`electron-app/src/router/index.ts`：

```ts
import { createRouter, createWebHashHistory } from 'vue-router'
import BuildView from '@/views/BuildView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/build' },
    { path: '/build', name: 'build', component: BuildView },
    { path: '/catalog', name: 'catalog', component: () => import('@/views/CatalogView.vue') },
    { path: '/templates', name: 'templates', component: () => import('@/views/TemplatesView.vue') },
    { path: '/guide', name: 'guide', component: () => import('@/views/GuideView.vue') },
  ],
})
```

使用 hash 路由是因为 `app://` 协议下的路径回退能力有限，hash 最稳。

- [ ] **Step 3: 实现导航栏与库门禁**

`electron-app/src/components/AppRail.vue`：

```vue
<template>
  <nav class="rail" aria-label="主导航">
    <div class="brand">
      <span class="mark">VAULT<i>/</i>USSA</span>
      <span class="tag">STL CONFIGURATOR</span>
    </div>
    <div class="tabs">
      <RouterLink
        v-for="(tab, i) in tabs"
        :key="tab.name"
        :to="tab.path"
        class="tab"
        active-class="is-active"
      >
        <span>{{ String(i + 1).padStart(2, '0') }}</span>
        <b>{{ tab.label }}</b>
        <i>{{ tab.en }}</i>
      </RouterLink>
    </div>
    <slot name="actions" />
  </nav>
</template>

<script setup lang="ts">
const tabs = [
  { name: 'build', path: '/build', label: '构型', en: 'BUILD' },
  { name: 'catalog', path: '/catalog', label: '部件库', en: 'PARTS' },
  { name: 'templates', path: '/templates', label: '模板', en: 'SCENES' },
  { name: 'guide', path: '/guide', label: '指南', en: 'GUIDE' },
]
</script>

<style scoped>
.rail {
  display: flex;
  align-items: center;
  gap: 28px;
  height: var(--chrome-h);
  padding: 0 var(--gutter);
  border-bottom: 1px solid var(--line);
  background: var(--paper-hi);
}
.brand {
  display: grid;
  gap: 1px;
}
.mark {
  font-family: var(--display);
  font-size: 22px;
  letter-spacing: 0.06em;
}
.mark i {
  color: var(--accent);
  font-style: normal;
}
.tag {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--muted);
}
.tabs {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.tab {
  display: grid;
  gap: 1px;
  padding: 8px 18px;
  text-decoration: none;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  transition: color 0.2s var(--ease), border-color 0.2s var(--ease);
}
.tab span {
  font-family: var(--mono);
  font-size: 9px;
  opacity: 0.6;
}
.tab b {
  font-size: 13px;
  color: var(--ink);
}
.tab i {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.16em;
  font-style: normal;
  opacity: 0.5;
}
.tab:hover {
  color: var(--accent);
}
.tab.is-active {
  border-bottom-color: var(--accent);
}
.tab.is-active b {
  color: var(--accent);
}
</style>
```

`electron-app/src/components/LibraryGate.vue`：

```vue
<template>
  <div class="gate">
    <div class="card">
      <span class="kicker">LOCAL STL LIBRARY</span>
      <h1>选择 STL 模型库</h1>
      <p>请选择包含 <code>01. DRAWERS</code>、<code>02. SUSTAINERS</code>、<code>03. MODIFICATIONS</code> 三个目录的根文件夹。路径会被记住，下次启动自动加载。</p>

      <ul v-if="library.missing.length" class="missing">
        <li v-for="dir in library.missing" :key="dir">缺少 <code>{{ dir }}</code></li>
      </ul>

      <p v-if="library.root && !library.valid" class="warn">
        当前路径 <code>{{ library.root }}</code> 不完整，请重新选择。
      </p>

      <button class="pick" @click="library.choose()">选择目录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLibraryStore } from '@/stores/library'
const library = useLibraryStore()
</script>

<style scoped>
.gate {
  display: grid;
  place-items: center;
  height: 100vh;
  background: var(--paper);
}
.card {
  width: min(560px, 88vw);
  padding: 36px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--accent);
}
h1 {
  margin: 8px 0 12px;
  font-family: var(--display);
  font-size: 30px;
  letter-spacing: 0.03em;
}
p {
  margin: 0 0 14px;
  line-height: 1.7;
  color: var(--muted);
}
code {
  font-family: var(--mono);
  font-size: 11px;
  padding: 1px 5px;
  background: var(--paper-dim);
  border-radius: 2px;
}
.missing {
  margin: 0 0 14px;
  padding-left: 18px;
  color: var(--accent);
  font-size: 12px;
}
.warn {
  color: var(--accent);
}
.pick {
  margin-top: 6px;
  padding: 10px 26px;
  font-size: 13px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
}
.pick:hover {
  background: var(--accent);
}
</style>
```

`electron-app/src/components/ToastHost.vue`：

```vue
<template>
  <div class="toasts" role="status" aria-live="polite">
    <transition-group name="toast">
      <div v-for="item in toasts" :key="item.id" class="toast" :class="item.kind">
        {{ item.text }}
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { toasts } from '@/composables/useToast'
</script>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: 26px;
  z-index: 90;
  display: grid;
  gap: 8px;
  transform: translateX(-50%);
  pointer-events: none;
}
.toast {
  padding: 9px 18px;
  font-size: 12px;
  color: var(--paper-hi);
  background: var(--ink);
  border-radius: 2px;
  box-shadow: 0 6px 20px rgba(20, 20, 15, 0.22);
}
.toast.warn {
  background: var(--accent);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s var(--ease), transform 0.22s var(--ease);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
```

`electron-app/src/composables/useToast.ts`：

```ts
import { ref } from 'vue'

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'warn'
}

export const toasts = ref<Toast[]>([])
let nextId = 1

export function toast(text: string, kind: Toast['kind'] = 'info', ms = 2600): void {
  const id = nextId++
  toasts.value.push({ id, text, kind })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, ms)
}
```

- [ ] **Step 4: 实现 App 外壳**

`electron-app/src/App.vue`：

```vue
<template>
  <LibraryGate v-if="library.checked && !library.ready" />
  <div v-else class="shell">
    <AppRail>
      <template #actions>
        <button class="bom-fab" @click="bomOpen = true">
          <span>打印清单</span><b>{{ bom.fileCount }}</b>
        </button>
      </template>
    </AppRail>
    <main class="work">
      <RouterView />
    </main>
    <BomDrawer v-model:open="bomOpen" />
    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppRail from '@/components/AppRail.vue'
import LibraryGate from '@/components/LibraryGate.vue'
import ToastHost from '@/components/ToastHost.vue'
import BomDrawer from '@/components/bom/BomDrawer.vue'
import { useLibraryStore } from '@/stores/library'
import { useBomStore } from '@/stores/bom'

const library = useLibraryStore()
const bom = useBomStore()
const bomOpen = ref(false)

onMounted(() => library.refresh())
</script>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.work {
  flex: 1;
  min-height: 0;
}
.bom-fab {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
}
.bom-fab:hover {
  background: var(--accent);
}
.bom-fab b {
  font-family: var(--mono);
  font-size: 11px;
  padding: 1px 6px;
  background: var(--accent);
  border-radius: 8px;
}
.bom-fab:hover b {
  background: var(--ink);
}
</style>
```

- [ ] **Step 5: 实现构型视图与面板**

`electron-app/src/views/BuildView.vue`：

```vue
<template>
  <div class="build">
    <section class="stage-area">
      <AssemblyView
        :title="`组合预览 · ${config.sheetCode}`"
        :parts="assemblyParts"
      />
    </section>
    <aside class="console">
      <ConfigPanel />
      <ColorStudio />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AssemblyView from '@/components/three/AssemblyView.vue'
import ConfigPanel from '@/components/ConfigPanel.vue'
import ColorStudio from '@/components/ColorStudio.vue'
import { useConfigStore } from '@/stores/config'

const config = useConfigStore()

const assemblyParts = computed(() =>
  config.matchedParts.slice(0, 40).map((entry) => ({
    path: entry.p,
    category: entry.c,
  })),
)
</script>

<style scoped>
.build {
  display: grid;
  grid-template-columns: 1fr var(--console-w);
  height: 100%;
  min-height: 0;
}
.stage-area {
  min-width: 0;
  background: var(--stage);
}
.console {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  border-left: 1px solid var(--line);
  background: var(--paper-hi);
}
</style>
```

`electron-app/src/components/ConfigPanel.vue`：

```vue
<template>
  <section class="panel">
    <header>
      <span class="kicker">CONFIGURATOR / 01</span>
      <h2>自由构型</h2>
      <p class="code">{{ config.sheetCode }}</p>
    </header>

    <div class="modes">
      <button
        v-for="mode in modes"
        :key="mode.id"
        :class="{ 'is-active': config.mode === mode.id }"
        @click="config.mode = mode.id"
      >
        <span>{{ mode.no }}</span><b>{{ mode.label }}</b>
      </button>
    </div>

    <template v-if="config.mode !== 'mod'">
      <label class="field">
        <span>规格族 <em>FAMILY</em></span>
        <select v-model="config.family">
          <option v-for="f in families" :key="f" :value="f">{{ f }}</option>
        </select>
      </label>
      <label class="field">
        <span>档位 <em>SIZE</em></span>
        <select v-model="config.size">
          <option v-for="s in sizes" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="field">
        <span>高度 <em>HEIGHT</em></span>
        <select v-model="config.height">
          <option v-for="h in heights" :key="h" :value="h">{{ h }}</option>
        </select>
      </label>
    </template>

    <div class="result">
      <span>匹配部件</span><b>{{ config.matchedParts.length }}</b>
    </div>

    <ul class="parts">
      <li v-for="entry in config.matchedParts.slice(0, 60)" :key="entry.p">
        <span class="name" :title="entry.p">{{ entry.n }}</span>
        <button class="add" @click="addToBom(entry)">加入清单</button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import { useBomStore } from '@/stores/bom'
import { toast } from '@/composables/useToast'
import type { ManifestEntry } from '@/data/types'

const config = useConfigStore()
const bom = useBomStore()

const modes = [
  { id: 'drawer' as const, no: '01', label: '抽屉' },
  { id: 'sustainer' as const, no: '02', label: '收纳箱' },
  { id: 'mod' as const, no: '03', label: '改装件' },
]
const families = ['S', 'M', 'L', 'L²', 'XL', 'XL²']
const sizes = ['3', '4', '5', '6', '7']
const heights = ['1F', '2F', '4F']

function addToBom(entry: ManifestEntry): void {
  bom.add(entry.p, entry.n, entry.q, entry.c)
  toast(`已加入：${entry.n}`)
}
</script>

<style scoped>
.panel {
  padding: 18px;
  border-bottom: 1px solid var(--line);
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h2 {
  margin: 6px 0 2px;
  font-family: var(--display);
  font-size: 24px;
  letter-spacing: 0.02em;
}
.code {
  margin: 0 0 14px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin-bottom: 14px;
}
.modes button {
  display: grid;
  gap: 1px;
  padding: 8px 4px;
  background: var(--paper-dim);
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--muted);
}
.modes button span {
  font-family: var(--mono);
  font-size: 8px;
  opacity: 0.6;
}
.modes button b {
  font-size: 12px;
  color: var(--ink);
}
.modes button.is-active {
  background: var(--paper-hi);
  border-bottom-color: var(--accent);
}
.modes button.is-active b {
  color: var(--accent);
}
.field {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
}
.field > span {
  font-size: 11px;
  color: var(--muted);
}
.field em {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  font-style: normal;
  opacity: 0.6;
  margin-left: 6px;
}
.field select {
  padding: 7px 10px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
  color: var(--ink);
}
.result {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 14px 0 8px;
  padding-top: 12px;
  border-top: 1px solid var(--line-soft);
  font-size: 11px;
  color: var(--muted);
}
.result b {
  font-family: var(--mono);
  font-size: 18px;
  color: var(--ink);
}
.parts {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 320px;
  overflow-y: auto;
}
.parts li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  background: var(--paper);
  border-radius: 2px;
}
.parts li:hover {
  background: var(--paper-dim);
}
.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.add {
  flex-shrink: 0;
  padding: 3px 9px;
  font-size: 10px;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.add:hover {
  color: var(--paper-hi);
  background: var(--accent);
  border-color: var(--accent);
}
</style>
```

`electron-app/src/components/ColorStudio.vue`：

```vue
<template>
  <section class="studio">
    <header>
      <span class="kicker">COLOR STUDIO / 耗材配色</span>
      <h3>三维配色</h3>
    </header>

    <label class="field">
      <span>方案 <em>SCHEME</em></span>
      <select :value="color.activePreset" @change="onPreset">
        <option v-for="(preset, id) in presets" :key="id" :value="id">{{ preset.name }}</option>
        <option v-if="color.activePreset === 'custom'" value="custom">自定义</option>
      </select>
    </label>

    <div class="brush">
      <span>画笔 <em>BRUSH</em></span>
      <div class="swatches">
        <button
          v-for="sw in color.swatches"
          :key="sw.hex"
          class="swatch"
          :class="{ 'is-active': color.brushColor === sw.hex }"
          :style="{ background: sw.hex }"
          :title="`${sw.name} ${sw.hex}`"
          @click="color.brushColor = sw.hex"
        />
      </div>
      <label class="custom">
        自定义<input v-model="color.brushColor" type="color" />
      </label>
    </div>

    <div class="part-list">
      <span class="label">部位 <em>PARTS</em></span>
      <button
        v-for="key in partKeys"
        :key="key"
        class="part-row"
        @click="color.setColor(key, color.brushColor)"
      >
        <i :style="{ background: color.colorFor(key) }" />
        <span>{{ key }}</span>
        <code>{{ color.colorFor(key) }}</code>
      </button>
    </div>

    <p class="hint">点击部位即可用当前画笔色覆盖。色值为屏幕参考，实际以耗材色卡为准。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useColorStore } from '@/stores/color'
import { VAULT_PALETTES } from '@/data/palettes'

const color = useColorStore()
const presets = computed(() => VAULT_PALETTES.presets)
const partKeys = computed(() => Object.keys(color.colors))

function onPreset(event: Event): void {
  const id = (event.target as HTMLSelectElement).value
  if (id !== 'custom') color.applyPreset(id)
}
</script>

<style scoped>
.studio {
  padding: 18px;
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h3 {
  margin: 6px 0 14px;
  font-family: var(--display);
  font-size: 20px;
}
.field {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
}
.field > span,
.brush > span,
.label {
  font-size: 11px;
  color: var(--muted);
}
.field em,
.brush em,
.label em {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  font-style: normal;
  opacity: 0.6;
  margin-left: 6px;
}
.field select {
  padding: 7px 10px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
}
.brush {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.swatch {
  width: 22px;
  height: 22px;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.swatch.is-active {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.custom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
}
.custom input {
  width: 36px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
}
.part-list {
  display: grid;
  gap: 1px;
  margin-bottom: 12px;
}
.part-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: var(--paper);
  border: none;
  border-radius: 2px;
  text-align: left;
}
.part-row:hover {
  background: var(--paper-dim);
}
.part-row i {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--line-soft);
}
.part-row span {
  flex: 1;
  font-size: 11px;
}
.part-row code {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
.hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.6;
  color: var(--muted);
}
</style>
```

- [ ] **Step 5: 手工验证**

```bash
cd electron-app && npm run dev
```

预期：
- 首次启动显示 `LibraryGate`，选目录后进入主界面
- 构型视图左侧 3D 舞台、右侧面板
- 切换规格族 / 档位 / 高度时 3D 重新装配
- 点「加入清单」后右上角计数增加
- 配色点击部位后 3D 颜色随之更新

- [ ] **Step 6: 提交**

```bash
git add electron-app/src/styles electron-app/src/router electron-app/src/App.vue electron-app/src/main.ts electron-app/src/views/BuildView.vue electron-app/src/components/AppRail.vue electron-app/src/components/LibraryGate.vue electron-app/src/components/ToastHost.vue electron-app/src/components/ConfigPanel.vue electron-app/src/components/ColorStudio.vue electron-app/src/composables/useToast.ts
git commit -m "feat(electron-app): 实现主界面骨架、导航与构型视图"
```

---

## Task 11: 打印清单侧栏与导出

**Files:**
- Create: `electron-app/src/components/bom/BomDrawer.vue`
- Create: `electron-app/src/components/bom/BomItemRow.vue`

**Interfaces:**
- Consumes: `useBomStore`（Task 6）、`useLibraryStore`（Task 6）、`window.vaultApi.exportZip` / `onExportProgress`（Task 5）
- Produces: `BomDrawer.vue` props `{ open: boolean }`，emits `update:open`

- [ ] **Step 1: 实现清单行组件**

`electron-app/src/components/bom/BomItemRow.vue`：

```vue
<template>
  <li class="row" :class="{ 'is-done': item.done }">
    <input type="checkbox" :checked="item.done" @change="bom.toggleDone(item.path)" />
    <div class="meta">
      <span class="name" :title="item.path">{{ item.name }}</span>
      <span class="path">{{ item.path }}</span>
    </div>
    <input
      class="qty"
      type="number"
      min="1"
      :value="item.qty"
      @change="onQty"
    />
    <select class="batch" :value="item.batchStatus" @change="onBatch">
      <option value="pending">待打印</option>
      <option value="printed">已打印</option>
      <option value="assembled">已组装</option>
    </select>
    <button class="remove" aria-label="移除" @click="bom.remove(item.path)">×</button>
  </li>
</template>

<script setup lang="ts">
import { useBomStore, type BomItem } from '@/stores/bom'

const props = defineProps<{ item: BomItem }>()
const bom = useBomStore()

function onQty(event: Event): void {
  bom.setQty(props.item.path, Number((event.target as HTMLInputElement).value))
}

function onBatch(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as BomItem['batchStatus']
  bom.setBatch(props.item.path, value)
}
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: auto 1fr 52px 88px 22px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-bottom: 1px solid var(--line-soft);
}
.row.is-done .name {
  text-decoration: line-through;
  opacity: 0.5;
}
.meta {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.name {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.path {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qty {
  width: 48px;
  padding: 3px 5px;
  font-family: var(--mono);
  font-size: 11px;
  text-align: center;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
}
.batch {
  padding: 3px 4px;
  font-size: 10px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
}
.remove {
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 1;
  color: var(--muted);
  background: transparent;
  border: none;
  border-radius: 2px;
}
.remove:hover {
  color: var(--accent);
  background: var(--paper-dim);
}
</style>
```

- [ ] **Step 2: 实现清单侧栏**

`electron-app/src/components/bom/BomDrawer.vue`：

```vue
<template>
  <transition name="slide">
    <aside v-if="open" class="drawer" aria-label="打印清单">
      <header class="head">
        <div>
          <span class="kicker">PACKING LIST</span>
          <b>打印清单</b>
        </div>
        <div class="count"><b>{{ bom.fileCount }}</b><span>ITEMS</span></div>
        <button class="close" aria-label="关闭" @click="$emit('update:open', false)">×</button>
      </header>

      <section class="library">
        <div>
          <b>本地 STL 库</b>
          <span>{{ librarySummary }}</span>
        </div>
        <button @click="library.choose()">更换目录</button>
      </section>

      <section class="progress">
        <div class="bar" role="progressbar" :aria-valuenow="bom.progress">
          <i :style="{ width: `${bom.progress}%` }" />
        </div>
        <span>{{ bom.doneCount }} / {{ bom.fileCount }} 已完成 · {{ bom.progress }}%</span>
      </section>

      <ul class="list">
        <BomItemRow v-for="item in bom.items" :key="item.path" :item="item" />
        <li v-if="!bom.items.length" class="empty">清单为空。在构型或部件库中加入部件。</li>
      </ul>

      <footer class="foot">
        <div class="totals">
          <div><span>文件</span><b>{{ bom.fileCount }}</b></div>
          <div><span>件数</span><b>{{ bom.totalQty }}</b></div>
        </div>
        <button class="export" :disabled="!canExport || exporting" @click="startExport">
          {{ exporting ? '打包中…' : '打包下载 STL' }}
        </button>
        <p v-if="exportStatus" class="export-status">{{ exportStatus }}</p>
        <button v-if="exporting" class="cancel" @click="cancel">取消导出</button>
        <button class="clear" :disabled="!bom.items.length" @click="bom.clear()">清空清单</button>
      </footer>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BomItemRow from './BomItemRow.vue'
import { useBomStore } from '@/stores/bom'
import { useLibraryStore } from '@/stores/library'
import { toast } from '@/composables/useToast'
import type { ExportProgress } from '@/env'

defineProps<{ open: boolean }>()
defineEmits<{ 'update:open': [value: boolean] }>()

const bom = useBomStore()
const library = useLibraryStore()

const exporting = ref(false)
const exportStatus = ref('')
const jobId = ref('')
let unsubscribe: (() => void) | null = null

const librarySummary = computed(() =>
  library.ready
    ? library.root ?? ''
    : '未配置 · 下载与预览需要本地 STL',
)

const canExport = computed(() => library.ready && bom.items.length > 0)

function startExport(): void {
  if (!canExport.value || exporting.value) return
  exporting.value = true
  exportStatus.value = '准备中…'
  jobId.value = `job-${Date.now()}`

  unsubscribe?.()
  unsubscribe = window.vaultApi.onExportProgress((progress: ExportProgress) => {
    if (progress.jobId !== jobId.value) return
    if (progress.state === 'running') {
      exportStatus.value = `${progress.done} / ${progress.total} · ${progress.currentFile}`
    } else if (progress.state === 'done') {
      exporting.value = false
      exportStatus.value = ''
      toast('打包完成')
    } else if (progress.state === 'canceled') {
      exporting.value = false
      exportStatus.value = ''
      toast('已取消导出', 'warn')
    } else {
      exporting.value = false
      exportStatus.value = `导出失败：${progress.error ?? '未知错误'}`
      toast(`导出失败：${progress.error ?? '未知错误'}`, 'warn')
    }
  })

  window.vaultApi
    .exportZip(bom.items.map((i) => i.path), jobId.value)
    .then((result) => {
      if (result.canceled) {
        exporting.value = false
        exportStatus.value = ''
      }
    })
    .catch((error: Error) => {
      exporting.value = false
      exportStatus.value = `导出失败：${error.message}`
      toast(`导出失败：${error.message}`, 'warn')
    })
}

function cancel(): void {
  window.vaultApi.cancelExport(jobId.value)
}

onBeforeUnmount(() => unsubscribe?.())
</script>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  display: flex;
  flex-direction: column;
  width: var(--bom-w);
  background: var(--paper-hi);
  border-left: 1px solid var(--line);
  box-shadow: -10px 0 30px rgba(20, 20, 15, 0.12);
}
.head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}
.kicker {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
.head b {
  font-family: var(--display);
  font-size: 20px;
}
.count {
  display: grid;
  justify-items: end;
  margin-left: auto;
}
.count b {
  font-family: var(--mono);
  font-size: 18px;
}
.count span {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.close {
  width: 26px;
  height: 26px;
  font-size: 17px;
  line-height: 1;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.library {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  border-bottom: 1px solid var(--line-soft);
}
.library > div {
  display: grid;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.library b {
  font-size: 11px;
}
.library span {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.library button {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: 10px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.library button:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.progress {
  display: grid;
  gap: 5px;
  padding: 10px 18px;
}
.bar {
  height: 3px;
  background: var(--paper-dim);
  border-radius: 2px;
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.24s var(--ease);
}
.progress span {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
}
.list {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}
.empty {
  padding: 28px 18px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}
.foot {
  display: grid;
  gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid var(--line);
}
.totals {
  display: flex;
  gap: 26px;
}
.totals div {
  display: grid;
  gap: 1px;
}
.totals span {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.totals b {
  font-family: var(--mono);
  font-size: 15px;
}
.export {
  padding: 10px;
  font-size: 13px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
}
.export:hover:not(:disabled) {
  background: var(--accent);
}
.export:disabled {
  opacity: 0.4;
  cursor: default;
}
.export-status {
  margin: 0;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cancel,
.clear {
  padding: 6px;
  font-size: 11px;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
  color: var(--muted);
}
.cancel:hover,
.clear:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.clear:disabled {
  opacity: 0.4;
  cursor: default;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.26s var(--ease);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
```

- [ ] **Step 3: 手工验证导出**

选一个含 3 个真实 STL 的库目录，加入清单后点「打包下载 STL」：
- 弹出保存对话框
- 进度文字实时更新（`1 / 3 · 01. DRAWERS/...`）
- 完成后可用系统解压打开，目录结构保留
- 中途点「取消导出」能中断且不留半成品文件

- [ ] **Step 4: 提交**

```bash
git add electron-app/src/components/bom
git commit -m "feat(electron-app): 实现打印清单侧栏与流式导出交互"
```

---

## Task 12: 部件库视图（虚拟滚动）

**Files:**
- Create: `electron-app/src/views/CatalogView.vue`
- Create: `electron-app/src/components/PartTable.vue`
- Create: `electron-app/src/components/FilterBar.vue`

**Interfaces:**
- Consumes: `VAULT_DATA`（Task 2）、`useBomStore`（Task 6）
- Produces: `PartTable.vue` props `{ entries: ManifestEntry[] }`

- [ ] **Step 1: 实现筛选栏**

`electron-app/src/components/FilterBar.vue`：

```vue
<template>
  <div class="filters">
    <div class="search">
      <input v-model="query" type="search" placeholder="搜索部件 / 路径 / 变体…" />
    </div>
    <div class="groups">
      <button
        v-for="group in groups"
        :key="group.id"
        :class="{ 'is-active': modelGroup === group.id }"
        @click="modelGroup = group.id"
      >
        {{ group.label }}
      </button>
    </div>
    <label>
      <span>FAMILY</span>
      <select v-model="modelFamily">
        <option value="">全部</option>
        <option v-for="f in families" :key="f" :value="f">{{ f }}</option>
      </select>
    </label>
    <label>
      <span>CATEGORY</span>
      <select v-model="modelCategory">
        <option value="">全部</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VAULT_DATA } from '@/data/manifest'

const query = defineModel<string>('query', { default: '' })
const modelGroup = defineModel<string>('group', { default: '' })
const modelFamily = defineModel<string>('family', { default: '' })
const modelCategory = defineModel<string>('category', { default: '' })

const groups = [
  { id: '', label: '全部' },
  { id: 'drawers', label: '抽屉' },
  { id: 'sustainers', label: '收纳箱' },
  { id: 'mods', label: '改装件' },
]

const families = computed(() =>
  Array.from(new Set(VAULT_DATA.files.map((f) => f.f).filter(Boolean))) as string[],
)
const categories = computed(() =>
  Array.from(new Set(VAULT_DATA.files.map((f) => f.c))).sort(),
)
</script>

<style scoped>
.filters {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px var(--gutter);
  border-bottom: 1px solid var(--line);
}
.search {
  flex: 1;
  min-width: 200px;
}
.search input {
  width: 100%;
  padding: 8px 12px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 2px;
  font-size: 12px;
}
.groups {
  display: flex;
  gap: 2px;
}
.groups button {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
}
.groups button.is-active {
  color: var(--accent);
  border-color: var(--line);
  background: var(--paper-hi);
}
label {
  display: grid;
  gap: 2px;
}
label span {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  color: var(--muted);
}
label select {
  padding: 5px 8px;
  font-size: 11px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 2px;
}
</style>
```

- [ ] **Step 2: 实现虚拟滚动表格**

`electron-app/src/components/PartTable.vue`：

```vue
<template>
  <div ref="scrollRef" class="table-scroll">
    <div class="spacer" :style="{ height: `${totalSize}px` }">
      <div class="rows" :style="{ transform: `translateY(${items[0]?.start ?? 0}px)` }">
        <div v-for="virtual in items" :key="virtual.key" class="row">
          <span class="name" :title="virtual.index !== undefined ? entries[virtual.index].p : ''">
            {{ virtual.index !== undefined ? entries[virtual.index].n : '' }}
          </span>
          <span class="family">{{ virtual.index !== undefined ? entries[virtual.index].f ?? '—' : '' }}</span>
          <span class="category">{{ virtual.index !== undefined ? entries[virtual.index].c : '' }}</span>
          <span class="support">
            {{ virtual.index !== undefined && entries[virtual.index].u ? '需支撑' : '' }}
          </span>
          <button v-if="virtual.index !== undefined" @click="bom.add(entries[virtual.index].p, entries[virtual.index].n, entries[virtual.index].q, entries[virtual.index].c)">
            加入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useBomStore } from '@/stores/bom'
import { toast } from '@/composables/useToast'
import type { ManifestEntry } from '@/data/types'

const props = defineProps<{ entries: ManifestEntry[] }>()
const bom = useBomStore()

const scrollRef = ref<HTMLElement | null>(null)

const virtualizer = useVirtualizer({
  count: computed(() => props.entries.length),
  getScrollElement: () => scrollRef.value,
  estimateSize: () => 32,
  overscan: 12,
})

const items = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())
</script>

<style scoped>
.table-scroll {
  height: 100%;
  overflow-y: auto;
}
.spacer {
  position: relative;
}
.rows {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
.row {
  display: grid;
  grid-template-columns: 1fr 60px 110px 60px 56px;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 var(--gutter);
  border-bottom: 1px solid var(--line-soft);
}
.row:hover {
  background: var(--paper-hi);
}
.name {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.family,
.category,
.support {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
.row button {
  padding: 3px 9px;
  font-size: 10px;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
}
.row button:hover {
  color: var(--paper-hi);
  background: var(--accent);
  border-color: var(--accent);
}
</style>
```

- [ ] **Step 3: 实现部件库视图**

`electron-app/src/views/CatalogView.vue`：

```vue
<template>
  <section class="catalog">
    <header class="head">
      <span class="kicker">LIBRARY / 02</span>
      <h1>部件库</h1>
      <p>检索全部 {{ VAULT_DATA.files.length }} 个 STL。按分组、族与类别筛选，逐件加入打印清单。</p>
    </header>

    <FilterBar
      v-model:query="query"
      v-model:group="group"
      v-model:family="family"
      v-model:category="category"
    />

    <div class="meta">
      <span>{{ filtered.length }} 个结果</span>
      <span>按路径排序</span>
    </div>

    <PartTable :entries="filtered" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import FilterBar from '@/components/FilterBar.vue'
import PartTable from '@/components/PartTable.vue'
import { VAULT_DATA } from '@/data/manifest'

const query = ref('')
const group = ref('')
const family = ref('')
const category = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return VAULT_DATA.files
    .filter((entry) => {
      if (group.value && entry.g !== group.value) return false
      if (family.value && entry.f !== family.value) return false
      if (category.value && entry.c !== category.value) return false
      if (!q) return true
      return (
        entry.n.toLowerCase().includes(q) ||
        entry.p.toLowerCase().includes(q) ||
        entry.v.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => a.p.localeCompare(b.p, 'zh-CN'))
})
</script>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.head {
  padding: 18px var(--gutter) 12px;
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h1 {
  margin: 6px 0 4px;
  font-family: var(--display);
  font-size: 30px;
  letter-spacing: 0.03em;
}
.head p {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
.meta {
  display: flex;
  justify-content: space-between;
  padding: 8px var(--gutter);
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}
</style>
```

- [ ] **Step 4: 手工验证**

- 滚动 756 行流畅无卡顿
- 搜索「Box」能正确过滤
- 切换分组 / 族 / 类别组合筛选正确
- 「加入」按钮把条目加进清单

- [ ] **Step 5: 提交**

```bash
git add electron-app/src/views/CatalogView.vue electron-app/src/components/PartTable.vue electron-app/src/components/FilterBar.vue
git commit -m "feat(electron-app): 实现部件库视图（虚拟滚动 + 多条件筛选）"
```

---

## Task 13: 模板与指南视图

**Files:**
- Create: `electron-app/src/views/TemplatesView.vue`
- Create: `electron-app/src/views/GuideView.vue`

**Interfaces:**
- Consumes: `VAULT_SCENE_TEMPLATES`（Task 2）、`VAULT_GUIDE_DATA`（Task 2）、`useBomStore`（Task 6）、`useColorStore`（Task 6）、`thumbnails`（Task 2）
- Produces: 两个可用视图

- [ ] **Step 1: 实现模板视图**

`electron-app/src/views/TemplatesView.vue`：

```vue
<template>
  <section class="templates">
    <header class="head">
      <span class="kicker">SCENES / 03</span>
      <h1>场景模板</h1>
      <p>{{ VAULT_SCENE_TEMPLATES.title }} · 套用后生成对应打印清单与三色配色。</p>
    </header>

    <p class="notice">{{ VAULT_SCENE_TEMPLATES.notice }}</p>

    <div class="grid">
      <article v-for="group in VAULT_SCENE_TEMPLATES.groups" :key="group.id" class="card">
        <div class="card-head">
          <span class="id">{{ group.id }}</span>
          <h2>{{ group.name }}</h2>
        </div>
        <p class="why">{{ group.why }}</p>
        <div class="counts">
          <div><span>抽屉</span><b>{{ group.counts.drawers }}</b></div>
          <div><span>模块</span><b>{{ group.counts.modules }}</b></div>
          <div><span>箱体</span><b>{{ group.counts.cases }}</b></div>
          <div><span>件数</span><b>{{ totalQty(group) }}</b></div>
        </div>
        <button class="apply" @click="apply(group)">套用模板</button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { VAULT_SCENE_TEMPLATES } from '@/data/scene-templates'
import { useBomStore } from '@/stores/bom'
import { useColorStore } from '@/stores/color'
import { toast } from '@/composables/useToast'
import type { SceneGroup } from '@/data/types'

const bom = useBomStore()
const color = useColorStore()
const router = useRouter()

function totalQty(group: SceneGroup): number {
  return group.items.reduce((sum, item) => sum + item.q, 0)
}

function apply(group: SceneGroup): void {
  bom.applyTemplate(group)
  // 模板中的 color 字段是 1/2/3 的色序，映射到当前预设的前三色
  const preset = Object.values(color.colors)
  group.items.forEach((item) => {
    const hex = preset[(item.color - 1) % 3]
    if (hex) color.setColor(item.part, hex)
  })
  toast(`已套用模板「${group.name}」：${bom.fileCount} 个文件 / ${bom.totalQty} 件`)
  void router.push('/build')
}
</script>

<style scoped>
.templates {
  height: 100%;
  overflow-y: auto;
  padding: 18px var(--gutter) 32px;
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h1 {
  margin: 6px 0 4px;
  font-family: var(--display);
  font-size: 30px;
  letter-spacing: 0.03em;
}
.head p {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
.notice {
  margin: 14px 0 20px;
  padding: 10px 14px;
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
  background: var(--paper-dim);
  border-left: 2px solid var(--accent);
  border-radius: 2px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--paper-hi);
  border: 1px solid var(--line);
  border-radius: 3px;
}
.card-head {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.id {
  font-family: var(--mono);
  font-size: 10px;
  padding: 1px 6px;
  color: var(--paper-hi);
  background: var(--ink);
  border-radius: 2px;
}
h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.why {
  margin: 0;
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
  flex: 1;
}
.counts {
  display: flex;
  gap: 16px;
}
.counts div {
  display: grid;
  gap: 1px;
}
.counts span {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.counts b {
  font-family: var(--mono);
  font-size: 13px;
}
.apply {
  padding: 8px;
  font-size: 12px;
  color: var(--paper-hi);
  background: var(--ink);
  border: none;
  border-radius: 2px;
}
.apply:hover {
  background: var(--accent);
}
</style>
```

- [ ] **Step 2: 实现指南视图**

`electron-app/src/views/GuideView.vue`：

```vue
<template>
  <section class="guide">
    <header class="head">
      <span class="kicker">GUIDE / 04</span>
      <h1>装配指南</h1>
      <p>分步组装与零件图鉴，可跳转对应手册页。</p>
    </header>

    <div class="body">
      <nav class="sections">
        <button
          v-for="(section, key) in sections"
          :key="key"
          :class="{ 'is-active': activeSection === key }"
          @click="activeSection = key"
        >
          {{ section.name }}
        </button>
      </nav>

      <div class="content">
        <template v-if="current">
          <h2>{{ current.name }}</h2>
          <p class="doc">对应手册：{{ current.doc }} · 页码 {{ current.pages.join(' / ') }}</p>

          <ol class="steps">
            <li v-for="(step, i) in current.steps" :key="i">
              <span class="no">{{ String(i + 1).padStart(2, '0') }}</span>
              <div>
                <b>{{ step.title }}</b>
                <p>{{ step.text }}</p>
              </div>
            </li>
          </ol>
        </template>
        <p v-else class="empty">暂无内容。</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VAULT_GUIDE_DATA } from '@/data/guide-content'

interface GuideStep {
  title: string
  text: string
}

interface GuideSection {
  name: string
  doc: string
  pages: number[]
  steps: GuideStep[]
}

const sections = computed(() => (VAULT_GUIDE_DATA.assembly ?? {}) as Record<string, GuideSection>)
const activeSection = ref(Object.keys(sections.value)[0] ?? '')
const current = computed<GuideSection | null>(() => sections.value[activeSection.value] ?? null)
</script>

<style scoped>
.guide {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.head {
  padding: 18px var(--gutter) 12px;
  border-bottom: 1px solid var(--line);
}
.kicker {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--accent);
}
h1 {
  margin: 6px 0 4px;
  font-family: var(--display);
  font-size: 30px;
  letter-spacing: 0.03em;
}
.head p {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
.body {
  display: grid;
  grid-template-columns: 200px 1fr;
  flex: 1;
  min-height: 0;
}
.sections {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 12px;
  border-right: 1px solid var(--line);
  overflow-y: auto;
}
.sections button {
  padding: 8px 12px;
  font-size: 12px;
  text-align: left;
  color: var(--muted);
  background: transparent;
  border: none;
  border-radius: 2px;
}
.sections button:hover {
  background: var(--paper-hi);
}
.sections button.is-active {
  color: var(--accent);
  background: var(--paper-hi);
  font-weight: 600;
}
.content {
  padding: 18px var(--gutter);
  overflow-y: auto;
}
h2 {
  margin: 0 0 4px;
  font-family: var(--display);
  font-size: 22px;
}
.doc {
  margin: 0 0 16px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
.steps {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  padding: 12px 14px;
  background: var(--paper-hi);
  border: 1px solid var(--line-soft);
  border-radius: 2px;
}
.no {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--accent);
}
.steps b {
  display: block;
  font-size: 12px;
  margin-bottom: 3px;
}
.steps p {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--muted);
}
.empty {
  font-size: 11px;
  color: var(--muted);
}
</style>
```

- [ ] **Step 3: 手工验证**

- 模板视图显示 13 张卡片，套用后跳转构型视图且清单已填充
- 指南视图左侧切换抽屉 / 收纳箱 / 改装件，右侧步骤正确渲染

- [ ] **Step 4: 提交**

```bash
git add electron-app/src/views/TemplatesView.vue electron-app/src/views/GuideView.vue
git commit -m "feat(electron-app): 实现场景模板与装配指南视图"
```

---

## Task 14: 打包为免安装 exe

**Files:**
- Create: `electron-app/electron-builder.yml`
- Modify: `electron-app/package.json`
- Create: `electron-app/build/README.md`

**Interfaces:**
- Consumes: 前序任务的全部产物
- Produces: `electron-app/release/VAULT-USSA-1.0.0-portable.exe`

- [ ] **Step 1: 编写 builder 配置**

`electron-app/electron-builder.yml`：

```yaml
appId: com.vaultussa.configurator
productName: VAULT-USSA
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - dist-electron/**/*
asar: true
win:
  target:
    - target: portable
      arch:
        - x64
portable:
  artifactName: ${productName}-${version}-portable.exe
  unicode: true
```

- [ ] **Step 2: 确认构建产物路径一致**

`electron-app/package.json` 的 `build` 脚本需保证 `vue-tsc` 通过后再 Vite 构建；`vite-plugin-electron` 会把主进程输出到 `dist-electron/`。确认 `main` 字段指向 `dist-electron/main.js`（Task 1 已设置）。

- [ ] **Step 3: 执行打包**

```bash
cd electron-app && npm run pack
```

预期：`release/VAULT-USSA-1.0.0-portable.exe` 生成，体积约 150–200 MB。

若打包报错「找不到 dist-electron」，检查 `vite.config.ts` 中 `electron({ main: { entry: 'electron/main.ts' } })` 的输出目录与 `main` 字段是否一致。

- [ ] **Step 4: 验证便携版**

1. 把 exe 复制到一个空目录（模拟他人机器）
2. 双击运行
3. 确认：无安装过程、直接出现窗口、`LibraryGate` 正常显示
4. 选择 STL 库目录，确认 3D 预览可用
5. 关闭后重新双击，确认库路径被记住

- [ ] **Step 5: 提交**

```bash
git add electron-app/electron-builder.yml electron-app/package.json electron-app/build
git commit -m "feat(electron-app): 配置 electron-builder 免安装便携版打包"
```

---

## Task 15: 全量验收与收尾

**Files:**
- Modify: `README.md`（追加桌面版说明）
- Create: `electron-app/README.md`

**Interfaces:**
- Consumes: 全部前序任务
- Produces: 可交付的软件与使用文档

- [ ] **Step 1: 运行全部自动化测试**

```bash
cd electron-app && npm test
```

预期：`tests/data.spec.ts` 8 项、`tests/path.spec.ts` 12 项、`tests/zip.spec.ts` 9 项、`tests/geometry/*` 20 项、`tests/stores/*` 14 项，全部 PASS。

- [ ] **Step 2: 类型检查与构建**

```bash
cd electron-app && npm run build
```

预期：`vue-tsc` 无错误，Vite 构建成功。

- [ ] **Step 3: 手工验收清单**

逐项确认并记录结果：

| 项 | 验收点 |
| --- | --- |
| 启动 | 双击 exe 直接进窗，无命令行 |
| 库记忆 | 重启后自动加载上次目录 |
| 构型 | 切换族 / 档位 / 高度，3D 重算正确 |
| 装配视觉 | 与旧版同参数场景对照，堆叠位置一致 |
| 爆炸展开 | 0–100% 连续变化，方向合理 |
| 视角 | 重置 / 正视 / 俯视均正确 |
| 部件库 | 756 行滚动流畅，筛选与搜索正确 |
| 模板 | 13 组可套用，清单与配色同步 |
| 指南 | 分步内容正确渲染 |
| 单件预览 | 尺寸与三角面数据合理 |
| 配色 | 换预设与逐部位上色后 3D 立即更新 |
| 清单 | 份数、完成勾选、批次状态持久化 |
| 导出 | 大清单有进度、可取消、ZIP 结构正确 |
| 路径安全 | 手工构造 `app://stl/../config.json` 返回 403 |
| 特殊路径 | 含 `²`、空格、括号的 STL 能正常读取 |

- [ ] **Step 4: 编写使用文档**

`electron-app/README.md`：

```markdown
# VAULT / USSA 桌面版

Electron + Vue 3 重写的 STL 配置器。双击即用，无需本地服务器。

## 快速开始

1. 运行 `VAULT-USSA-1.0.0-portable.exe`
2. 首次启动选择 STL 模型库根目录（须包含 `01. DRAWERS`、`02. SUSTAINERS`、`03. MODIFICATIONS`）
3. 路径会被记住，之后每次启动自动加载

## 开发

```bash
npm install
npm run dev      # 开发模式
npm test         # 单元测试
npm run build    # 类型检查 + 构建
npm run pack     # 打包免安装 exe
```

## 与旧版差异

- 不再需要 `python -m http.server`
- 不再需要每次手动导入 STL 文件夹
- 打包导出改为流式写盘，25 GB 级清单不再爆内存
- 3D 渲染改用原生 three.js，姿态与布局算法与旧版一致

旧版 `configurator/` 仍保留在仓库中作为参照。
```

- [ ] **Step 5: 提交**

```bash
git add README.md electron-app/README.md
git commit -m "docs: 补充桌面版使用说明与验收记录"
```

---

## 自检结果

**规格覆盖检查**

| 规格章节 | 对应任务 |
| --- | --- |
| 3.1 目录结构 | Task 1 |
| 3.2 协议路由 | Task 4 |
| 3.3 路径安全校验 | Task 4 |
| 4.1 数据迁移 | Task 2 |
| 4.3 Pinia Store | Task 6 |
| 4.4 单向数据流 | Task 8（3D 订阅 store） |
| 5.1 3D 组件划分 | Task 7、8、9 |
| 5.2 姿态处理 | Task 3 |
| 5.3 量化数据 | Task 3、7 |
| 5.4 改进点 | Task 8（单件失败隔离）、Task 7（流式） |
| 5.5 缓存与并发 | Task 7 |
| 6.1 窗口配置 | Task 1、4 |
| 6.2 preload 暴露面 | Task 4、5 |
| 6.3 库目录管理 | Task 4 |
| 6.4 流式 ZIP | Task 5、11 |
| 6.5 打包 | Task 14 |
| 7.1 设计变量 | Task 10 |
| 7.2 视图与组件 | Task 10、11、12、13 |
| 7.3 虚拟滚动 | Task 12 |
| 8 错误处理 | Task 4（库）、8（单件）、11（导出） |
| 9 测试策略 | 各任务的 TDD 步骤 + Task 15 |

**类型一致性检查**

- `QuantizedMesh` 在 Task 3 定义，Task 7、8、9 使用同一字段（`positions` / `minimum` / `maximum`）
- `Canonical` 在 Task 3 定义，Task 7 `LoadedPart.canonical`、Task 8 布局输入均引用同一类型
- `LayoutInput` / `Placed` 在 Task 3 定义，Task 8 直接复用
- `BomItem` 在 Task 6 定义，Task 11 的 `BomItemRow` 引用同一类型
- `ExportProgress` 在 Task 5 定义，Task 11 从 `@/env` 引用
- `stlUrl` / `resolveWithinRoot` 在 Task 4 定义，Task 7、5 复用

**占位符检查**：无 TBD / TODO / 「稍后补充」类内容。

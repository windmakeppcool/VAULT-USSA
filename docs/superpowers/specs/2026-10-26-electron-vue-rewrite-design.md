# VAULT / USSA 配置器 —— Electron + Vue 全量重写设计

- 日期：2026-10-26
- 状态：设计已确认，待实施
- 目标：把现有纯静态配置器改造为可分发、双击即用的 Electron 桌面应用，前端使用 Vue 3 全量重写，3D 渲染改用原生 three.js

---

## 1. 背景与目标

### 1.1 现状

现有 `configurator/` 是一个无构建步骤的静态站点（HTML / CSS / 原生 JS），共约 13,400 行：

| 文件 | 行数 | 职责 |
| --- | ---: | --- |
| `app.js` | 2,487 | 构型、部件库、清单、导入、打包下载、配色工作台 |
| `assembly.js` | 1,487 | 组合 3D 装配视图 |
| `preview.js` | 684 | 单件 3D 预览 |
| `manuals.js` | 499 | 手册查看与页码跳转 |
| `guide.js` | 362 | 装配指南 |
| `local-files.js` | 82 | 浏览器内本地 STL 导入 |
| 4 个 CSS | 4,135 | 工业仪表盘风格 |
| `data/*.js` | ~3,800 | 清单索引、姿态、模板、配色、指南内容 |

使用方式要求用户自行启动 HTTP 服务器（`python -m http.server`），且每次刷新都要重新手动导入 25 GB 的 STL 文件夹。

### 1.2 目标

1. **免安装可分发**：打成单个免安装 exe，双击即用，无需 Node、无需命令行、无需本地服务器
2. **STL 库持久化**：首次选择目录后写入配置，重启自动加载，不再反复导入
3. **流式导出**：25 GB 级清单不再整块读入内存，改为流式写盘并提供进度与取消
4. **前端重写**：Vue 3 + TypeScript + Vite，3D 改用原生 three.js（摆脱 750 KB 的压缩黑盒）
5. **不降低能力**：现有全部功能（构型、部件库、模板、指南、手册、清单、配色工作台）一次性重写到位

### 1.3 非目标（明确不做）

- 多语言框架（现有中英双语 PDF 文件名映射保留，但不引入 i18n 库）
- 主题切换（浅色工业风是唯一主题）
- 自动更新、代码签名证书（免安装便携版不需要）
- 多套 STL 库并存管理（只维护一个当前库路径）
- 保留旧版 `configurator/` 的运行入口（保留目录作为参照，完成后可删除）

---

## 2. 关键技术判断

### 2.1 为什么用自定义协议而不是内置 HTTP 服务器

| 方案 | 改动量 | 用户另选盘位 | 端口占用 | 结论 |
| --- | --- | --- | --- | --- |
| 内置 `node:http` 服务 | 最小 | 别扭，需动态映射 | 有（可能被防火墙拦） | 否 |
| IPC 重写取数层 | 最大（`Response` 流式 API 全要重写） | 可以 | 无 | 否 |
| **自定义协议 `app://`** | 小（只换 URL 前缀） | 原生支持 | 无 | **采用** |

自定义协议的优势：渲染进程仍然用标准 `fetch`，浏览器原生的分块读取、进度事件、`AbortController` 全部可用，同时主进程完全掌控文件访问与安全校验。

注册时必须声明：

```ts
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    stream: true,      // 25 GB 大文件分块读的关键
  },
}]);
```

### 2.2 关于 `vault-3d.js` 的澄清

`configurator/data/vault-3d.js`（52 KB，743 条）**不是几何数据**，而是「STL 路径 → 缩略图 ID（如 `m0065`）」的映射，用于回退显示预览图。

真正的几何数据在运行时从 STL 文件解析。因此重写**不涉及迁移几何资产**。

### 2.3 旧 3D 引擎实际做的事（必须全部复刻）

`vendor/vault-stl.min.js` 不是纯 three.js，而是在其上叠加了项目特有逻辑，这些逻辑才是重写的重点：

1. **姿态校正**：`vault-orientations.js` 提供 743 件（共 756 件）的 3×3 旋转矩阵（行主序 9 元素），矩阵转四元数 → 应用旋转 → 重算 AABB 得到真实占位尺寸。缺姿态的 13 件（XL Roof Cut 系列）按 `category` 规则兜底：`box` 不旋转；`module` 若 Y 轴最矮则绕 X 轴旋转 90°
2. **PCA 主轴分析 + 最小面积矩形搜索**：对无姿态件，用协方差矩阵幂迭代找最薄轴，再以 0.5° 步长扫描 90° 求最小包围矩形，使面内两轴贴合部件真实的宽/深方向
3. **布局堆叠**：按 `category` 分组，模块居中横排、盒体堆叠、顶盖置顶、面板贴前、底板贴底、背板贴后，件间留 `gap` 间隙
4. **顶点量化传输**：STL 解析后顶点按 65535 归一化为 `Uint16Array`（配合 `minimum` / `maximum` 范围还原），内存占用减半
5. **缓存与并发**：`MAX_CACHE_BYTES` 限制缓存总量，`CONCURRENCY` 控制并发加载数，带进度回调
6. **爆炸展开**：沿各部件法向偏移
7. **拾取与染色**：raycast 命中部件 → 高亮 / 按部位上色

**重写策略：先移植、再重构。** 先把旧算法逐行翻译成 TypeScript 纯函数并用单测锁定行为，跑通后再考虑优化。不追求一次写出「更优雅」的版本——布局算法中有大量魔数（gap、居中公式、堆叠顺序），脱离原实现无法凭直觉重建。

---

## 3. 总体架构

### 3.1 目录结构

```
E:\Projects\VAULT-USSA\
├── configurator/              ← 旧版，原样保留作为参照
├── electron-app/              ← 新工程
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── electron-builder.yml
│   ├── electron/
│   │   ├── main.ts            窗口 + 自定义协议路由
│   │   ├── preload.ts         contextBridge 暴露 IPC
│   │   ├── stl-library.ts     库根目录探测 / 路径安全校验
│   │   └── zip-export.ts      流式打包写盘
│   └── src/
│       ├── main.ts            Vue 挂载
│       ├── App.vue
│       ├── router/
│       ├── stores/            Pinia：库 / 清单 / 构型 / 配色
│       ├── composables/
│       ├── components/
│       │   ├── three/         3D 组件
│       │   └── ...
│       ├── views/             构型 / 部件库 / 模板 / 指南
│       ├── data/              迁移后的类型化数据
│       └── styles/            设计变量与全局样式
```

### 3.2 协议路由

主进程注册 `app://` 协议，两类路径分流：

| 请求 | 映射到 | 用途 |
| --- | --- | --- |
| `app://ui/...` | `dist/` 打包产物 | 加载 Vue 应用 |
| `app://stl/01. DRAWERS/...` | `<库根目录>` + 相对路径 | 读 STL、缩略图、手册 PDF |

前端所有取数统一为 `fetch('app://stl/' + encodePath(path))`。

### 3.3 路径安全校验

URL 来自渲染进程，必须校验：

```ts
const resolved = path.resolve(root, decodedPath);
const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
if (!resolved.startsWith(rootWithSep)) {
  return new Response('Forbidden', { status: 403 });
}
```

同时拒绝包含 `..` 段的原始路径，双重防护。

### 3.4 技术栈

- Vue 3（`<script setup>`）+ TypeScript
- Vite（构建与开发服务器）
- Pinia（状态）
- Vue Router（4 个视图）
- three.js（npm 版，含 `STLLoader` / `OrbitControls`）
- `@tanstack/vue-virtual`（756 行部件表虚拟滚动）
- `electron-builder`（portable 单 exe）
- Vitest（单元测试）

**不引入 Element Plus 等 UI 组件库。** 现有设计高度定制（纸色底 `#e9e4d6`、墨黑 `#14140f`、强调橙 `#e1461c`、Barlow Condensed 标题字），套用组件库需写大量覆盖样式，得不偿失。

---

## 4. 数据层

### 4.1 数据资产迁移

以下均为纯数据，与框架无关，原样迁移：

| 源文件 | 内容 | 目标 |
| --- | --- | --- |
| `data/vault-manifest.js` | 756 条 STL 索引，字段 `p,n,s,g,f,z,h,c,v,k,q,u` | `src/data/manifest.ts`，附带 TS 类型 |
| `data/vault-orientations.js` | 743 条 9 元素旋转矩阵 | `src/data/orientations.ts`（`Record<string, number[]>`） |
| `data/vault-3d.js` | 743 条 STL 路径 → 缩略图 ID | `src/data/thumbnails.ts` |
| `data/scene-templates.js` | 13 组模板，`groups[].items[]`（`p,q,part,partName,color,support,ref`） | `src/data/scene-templates.ts` |
| `data/palettes.js` | 10 个色板 + 5 套预设（键为部位名 `module`/`facade`/`handle` 等） | `src/data/palettes.ts` |
| `data/guide-content.js` | 组装步骤、手册页码、小件图鉴 | `src/data/guide-content.ts` |
| `assets/previews/*.webp` | 部件缩略图 | `public/previews/` |
| `assets/manuals/**/*.jpg` | 手册页图片 | `public/manuals/` |

迁移脚本把 `window.XXX = {...}` 转成 `export const XXX = {...} as const`，**保留全部原始键名与中文字符串，不做任何重命名**——STL 路径匹配的准确性完全依赖于此。

### 4.2 manifest 字段语义

```ts
interface ManifestEntry {
  p: string;        // 相对路径，如 "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 1F.stl"
  n: string;        // 显示名
  s: number;        // 字节数
  g: 'drawers' | 'sustainers' | 'mods';
  f: string | null; // 尺寸族 S/M/L/XL/L²/XL²
  z: string | null; // 档位 3–7
  h: string | null; // 高度 1F/2F/4F
  c: string;        // 类别，如 box/module/roof/facade/baseplate
  v: string;        // 变体名
  k: string | null;
  q: number;        // 默认份数
  u: boolean;       // 是否需要支撑
}
```

分组计数：`drawers` 433、`sustainers` 225、`mods` 98，合计 756。

### 4.3 Pinia Store 划分（4 个）

**`useLibraryStore`** — STL 库根目录

- 状态：`rootPath: string | null`、`status: 'idle' | 'scanning' | 'ready' | 'missing'`、`missingDirs: string[]`
- 启动时向主进程取已保存路径，有则 `ready`；无则 `idle` 并引导选择
- 取代旧版「导入文件夹」——路径记住后重启即用

**`useBomStore`** — 打印清单（核心）

- 状态：`items: BomItem[]`
  ```ts
  interface BomItem {
    path: string;
    name: string;
    qty: number;
    done: boolean;
    batchStatus: 'pending' | 'printed' | 'assembled';
    colorKey: string;
  }
  ```
- 派生：`fileCount`、`totalQty`、`totalBytes`、`progress`
- 持久化到 `localStorage`，沿用现有 key 语义，保证旧用户数据不丢

**`useConfigStore`** — 构型选择

- 状态：`mode: 'drawer' | 'sustainer' | 'mod'`、`family`、`size`、`height`
- 派生：`matchedParts`（按 manifest 过滤）
- 变更时触发装配视图重算

**`useColorStore`** — 配色

- 状态：`colors: Record<PartKey, string>`、`activePreset`、`brushColor`、`dyeMode`
- 保存 / 导入 / 导出的配色方案列表

### 4.4 数据流原则

单向：`store → 派生状态 → 组件渲染`。

3D 视图只订阅 store，不反向写入。涂色通过 store action 修改颜色，3D 组件 `watch` 后更新材质——避免双向绑定导致的循环更新。

---

## 5. 3D 渲染重写

### 5.1 组件与模块划分

```
components/three/
├── ThreeCanvas.vue        通用底座：renderer / camera / controls / resize / contextlost
├── AssemblyView.vue       组合装配
├── SinglePreview.vue      单件预览
composables/
├── useStlLoader.ts        fetch → parse → 缓存（含并发与内存上限）
├── useOrientation.ts      姿态矩阵 → 四元数 → AABB（纯函数，可单测）
├── useLayout.ts           堆叠布局（纯函数，可单测）
lib/three/
├── dequantize.ts          量化顶点还原
├── pca.ts                 PCA 主轴 + 最小面积矩形
└── zip-crc.ts             CRC32 表
```

### 5.2 姿态处理

```ts
function orientationFor(path: string): number[] | null
function quatFromMatrix3(m: number[]): [number, number, number, number]
function rotatedBoxSize(local: [number, number, number], m: number[]): [number, number, number]
```

兜底规则（缺姿态时）：

- `category === 'box'` → 恒等四元数，尺寸取本地 AABB
- `category === 'module'` → 若 `local[1]` 为最小边，绕 X 轴旋转 90°（四元数 `[√½, 0, 0, √½]`），尺寸重排
- 其余 → 走 PCA 主轴分析

### 5.3 量化数据

保留 `Uint16Array` 量化方案（相对 `Float32Array` 省一半内存，全库浏览时必要）：

```ts
function dequantize(entry, i, out) {
  const size = [
    entry.maximum[0] - entry.minimum[0],
    entry.maximum[1] - entry.minimum[1],
    entry.maximum[2] - entry.minimum[2],
  ];
  for (let a = 0; a < 3; a++) {
    out[a] = entry.minimum[a] + (entry.positions[i * 3 + a] / 65535) * size[a];
  }
  return out;
}
```

### 5.4 相对旧版的改进

- **流式解析**：借助协议 `stream: true`，配合 `THREE.LoadingManager` 拿到进度，不再整块 `arrayBuffer()`
- **显存监测**：用 `renderer.info` 监控显存，超限自动降级（旧版只有三角面上限一个粗暴判断）
- **单件失败隔离**：某件加载失败时该部件用线框占位并标注「缺失」，其余照常渲染（旧版整组失败）

### 5.5 缓存与并发

沿用旧参数语义：

- `MAX_CACHE_BYTES`：缓存总量上限，超出按插入顺序释放未在加载中的条目
- `CONCURRENCY`：并发加载数
- 进度回调：`(done / total) * 100` 与当前文件名

---

## 6. Electron 主进程与导出

### 6.1 窗口配置

- 初始尺寸 `800 × 900`，记住上次尺寸与位置
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`

### 6.2 preload 暴露面

仅 5 个方法，最小化攻击面：

```ts
contextBridge.exposeInMainWorld('vaultApi', {
  selectLibraryRoot,   // 打开目录选择框，校验并保存
  getLibraryRoot,      // 读取已保存路径与校验结果
  exportZip,           // 流式导出，返回 jobId
  cancelExport,        // 取消导出
  openManual,          // 用系统默认阅读器打开 PDF
});
```

进度通过 `ipcRenderer.on('export:progress')` 单向推送。

### 6.3 库根目录管理

1. 首次启动：`dialog.showOpenDialog` 选择包含 `01. DRAWERS` 的目录
2. 校验：检查 `01. DRAWERS`、`02. SUSTAINERS`、`03. MODIFICATIONS` 是否存在，缺哪个在界面明确列出
3. 保存：写入 `app.getPath('userData')/config.json`
4. 启动时读取；路径失效则回到「选择目录」状态，不弹出错误框打断
5. 库路径非敏感信息，明文存储即可（`safeStorage` 不必要）

### 6.4 流式 ZIP 导出

旧实现把所有 STL 读进内存再拼 ZIP，25 GB 场景必然崩溃。新方案：

1. 渲染进程把清单（相对路径列表）交给主进程
2. 主进程逐个 `fs.createReadStream` 读取，边读边算 CRC32 边写 ZIP 本地头 + 数据
3. 全部写完后补中央目录记录与 EOCD
4. 全程 `fs.createWriteStream` 落盘，内存只占单个文件缓冲
5. 通过 IPC 推送进度：`{ done, total, bytes, currentFile }`
6. 支持取消（`AbortController` + 清理半成品文件）

**沿用 store 模式（不压缩）**：STL 已接近熵上限，zlib 压缩收益极低而耗时显著。ZIP 结构沿用现有手写实现（本地文件头 + 中央目录 + EOCD），仅把缓冲目标从 `Blob` 换成 `WriteStream`。

ZIP 内每种文件只放 1 份，实际打印数量以清单「件数」为准（与旧行为一致）。

### 6.5 打包

- `electron-builder` 的 `portable` target（单免安装 exe）
- `asar: true`，three.js 打进 asar
- 不需要安装包、不需要管理员权限、不写注册表
- 体积预期约 150–200 MB（Electron 运行时）

---

## 7. UI 重写

### 7.1 设计变量

从现有 `styles.css` 提取，转成 CSS 自定义属性放 `src/styles/tokens.css`：

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--paper` | `#e9e4d6` | 主背景 |
| `--paper-hi` | `#f4efe2` | 高亮背景 |
| `--paper-dim` | `#dcd5c3` | 次级背景 |
| `--ink` | `#14140f` | 主文字 |
| `--muted` | `#6f6a5a` | 次要文字 |
| `--line` | `#c3bba8` | 分隔线 |
| `--accent` | `#e1461c` | 强调橙 |
| `--stage` | `#131310` | 3D 舞台 |
| `--display` | Barlow Condensed | 标题 |
| `--mono` | IBM Plex Mono | 数字 / 代码 |
| `--body` | Noto Sans SC | 正文 |
| `--ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 动效 |

### 7.2 视图与组件

| 视图 | 主要组件 | 旧实现来源 |
| --- | --- | --- |
| 构型 BUILD | `AssemblyView` `ConfigPanel` `ColorStudio` | `assembly.js` + 配色段 |
| 部件库 PARTS | `PartTable`（虚拟滚动）`FilterBar` | `app.js` catalog 段 |
| 模板 SCENES | `TemplateGrid` | `scene-templates.js` |
| 指南 GUIDE | `GuideSteps` `ManualViewer` `PartFigures` | `guide.js` + `manuals.js` |
| 全局 | `BomDrawer` `ToastHost` `LibraryGate` | `app.js` BOM 段 |

**`LibraryGate`** 是新组件：库未配置时挡住主界面，引导用户选择目录。这是桌面版独有的改进——浏览器版只能反复手动导入。

### 7.3 性能

756 行部件表不虚拟化会卡顿。用 `@tanstack/vue-virtual` 只渲染可视行。

---

## 8. 错误处理

明确三层：

1. **库不可用**：路径失效 → `LibraryGate` 提示重新选择，不弹窗、不白屏
2. **单件加载失败**：3D 视图中该部件用线框占位并标注「缺失」，其余照常渲染
3. **导出失败**：磁盘满 / 权限不足 / 路径不可写 → 明确提示具体文件与原因，支持重试

---

## 9. 测试策略

### 9.1 单元测试（Vitest）

纯函数优先，这些最容易测也最该测：

- 姿态矩阵 → 四元数转换
- 旋转后 AABB 计算
- PCA 主轴分析与最小面积矩形
- 堆叠布局（锁定旧行为）
- CRC32 与 ZIP 头生成
- 路径穿越校验

### 9.2 集成测试

- 协议 handler：用临时目录造几个假 STL，验证正常读取与 403 拒绝

### 9.3 手工验收（明确列为手工项）

- 3D 交互：旋转、缩放、爆炸展开、拾取染色
- 真实 25 GB STL 库的浏览与预览流畅度
- 大清单流式导出（含取消与异常中断）

自动化成本过高，不强行覆盖——但必须在交付前真实执行。

---

## 10. 实施顺序

1. **脚手架**：Vite + Vue + TS 工程，Electron 主进程最小可运行窗口
2. **数据迁移**：把 6 个 `data/*.js` 转为类型化 TS 模块，复制静态资源
3. **协议与库管理**：`app://` 路由、路径校验、库根目录选择与持久化
4. **3D 重写**：姿态 → 量化 → 布局 → 装配视图 → 单件预览
5. **BOM 与导出**：清单 store、持久化、流式 ZIP
6. **各视图**：构型 / 部件库 / 模板 / 指南 / 手册
7. **样式统一**：设计变量提取，组件样式对齐旧版视觉
8. **打包**：`electron-builder` portable，验证免安装运行

---

## 11. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 布局算法含大量魔数，重建后视觉不一致 | 高 | 先逐行移植 + 单测锁定，再考虑重构；用旧版同参数场景做视觉对照 |
| `assembly.js` 1487 行一次性重写范围过大 | 中 | 拆成姿态 / 布局 / 加载 / 交互四个纯模块分别验证 |
| 25 GB 库的文件枚举性能 | 中 | 不做全量 stat 扫描，只按 manifest 的 756 条路径按需读取 |
| 路径含空格、`²`、中文句点 | 中 | URL 编码统一走 `encodeURIComponent` 按段处理；测试覆盖 `L²` 路径 |
| 旧用户 `localStorage` 数据迁移 | 低 | 沿用旧 key 语义并在读取时校验字段，失败回退默认 |
| `sandbox: true` 与 preload 的兼容 | 低 | preload 只用 `contextBridge` + `ipcRenderer`，不 require Node 模块 |

---

## 12. 验收标准

**功能**

- 双击 exe 启动，无需任何命令行操作
- 首次启动引导选择 STL 库，重启后自动加载
- 756 件全部可检索、可加入清单
- 组合装配视图与旧版视觉一致（同参数场景对照）
- 单件预览可正常读取与显示
- 流式导出 25 GB 清单不崩溃，有进度与取消
- 13 组模板套用后清单与配色正确
- 指南与手册页码跳转正常

**非回归**

- STL 路径匹配准确（含 `L²`、空格、括号、`Heawyweight` 等原始拼写）
- 打印标记（`(Turn On Supports)`、`Part 1/2`、`x3–x7`、`Tyre (TPU)`）正确呈现
- 清单份数、完成勾选、批次状态、进度统计与旧版一致

**性能**

- 库已配置状态下冷启动到可交互 < 3 秒
- 部件库列表滚动 60 fps
- 装配视图加载 20 件左右组合可接受（与旧版相当）

**视觉**

- 纸色工业风、等宽数字、橙强调色延续
- 4 个视图切换无布局跳动

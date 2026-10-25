# VAULT / USSA —— 模块化抽屉系统

基于 **Gridfinity** 网格体系的可堆叠抽屉 / 收纳箱 / 改装件模型库，附带一个纯前端的 **STL 配置器**：自由组合规格与部件、实时 3D 预览、生成打印清单，并一键打包下载 STL。

> **重要：本仓库不包含任何 STL 文件。**
> 全部 756 个 STL 约 25 GB，无法随仓库分发。克隆后请按「[STL 手动导入](#stl-手动导入)」把模型放回本地目录，或直接在配置器网页中导入本地文件夹。
> 仓库本身约 38 MB，只包含配置器代码、清单索引、装配 PDF 与命名图。

---

## 目录结构

| 路径 | 内容 | STL 数量 | 体积 |
| --- | --- | ---: | ---: |
| `01. DRAWERS/` | 抽屉本体：盒体、模块、顶盖、面板、滑轨、分隔、五金小件 | 433 | 16.64 GB |
| `02. SUSTAINERS/` | 抽屉外套 / 收纳箱：模块化箱体、盖、铰链、锁、分隔、提手 | 225 | 6.11 GB |
| `03. MODIFICATIONS/` | 改装件：底座、背板、脚、挂墙、轮组、提手、洞洞板转接 | 98 | 2.24 GB |
| `configurator/` | 前端配置器（HTML / CSS / JS，无构建步骤） | — | ≈ 6 MB |
| `01_Instructions Manual.pdf` | 总说明手册 | — | 4.5 MB |
| `02_Drawer Assembly.pdf` | 抽屉装配说明 | — | 1.7 MB |
| `03_Sustainers Assembly.pdf` | 收纳箱装配说明 | — | 1.6 MB |
| `04_Modifications.pdf` | 改装件说明 | — | 4.0 MB |
| `05_Mounting Instructions.pdf` | 安装（挂墙 / 固定）说明 | — | 2.6 MB |
| `01. DRAWERS/Drawers Naming.png` 等 | 部件命名示意图（抽屉 / 收纳箱 / 改装件各一张） | — | — |
| `agent.md` | 工程说明与命名约定（面向维护者 / Agent） | — | — |

统计口径：756 个 STL，约 25 GB（按毫米解释尺寸）。

```
01. DRAWERS/
├── 01. S Families/          S3–S7：Boxes / Gridfinity Baseplate / Modules / Roofs
├── 02. M Families/          M3–M7
├── 03. L Families/          L3–L7
├── 04. L² Families/         L3²–L7²（仅模块）
├── 05. XL Families/         XL3–XL7（含 Back Panel 与 Part 1/2 拆分盒体）
├── 06. XL² Families/        XL3²–XL7²（仅模块）
├── 07. Universal/           跨规格通用件：齿条、分隔、滑轨、锁扣、小件
└── Drawers Naming.png

02. SUSTAINERS/
├── 01. S Families/ … 04. XL Families/
├── 05. Universal/           底板、分隔、面板、铰链、锁、连杆
└── Sustainer Naming.png

03. MODIFICATIONS/
├── Backbone/  Base/  Feet/  Wall Mounts/  Wheels/
├── Stationary Handle/  Pull-out Handle/  Pegboard Attachment/
└── XL Mods Naming.png
```

---

## 配置器功能

打开 [configurator/index.html](configurator/index.html)（需通过本地服务器访问，见下文）。

- **构型**：按「抽屉 / 收纳箱 / 改装件」三类，选择规格族（S/M/L/XL/L²/XL²）、档位与高度，自动列出匹配部件。
- **组合预览**：实时 3D 装配视图，支持爆炸展开、正视 / 俯视 / 重置视角。
- **部件库**：检索全部 756 个 STL，按分组、族、类别筛选，逐件加入清单。
- **场景模板**：13 组真实组合，套用后直接生成对应打印清单与三色配色。
- **装配指南**：分步组装说明，可跳转到对应 PDF 手册页。
- **打印清单**：数量调整、完成勾选、批次状态、方案保存 / 读取 / 删除、导出 CSV、复制相对路径。
- **打包下载**：把清单中的 STL 打包成一个 ZIP 下载（保留原始目录结构，每种 1 份）。
- **本地 STL 导入**：仓库不含 STL 时，在浏览器中选择本地模型文件夹，下载与预览都改为读取本地文件（不上传）。
- **3D 预览**：单件 STL 预览（尺寸 / 三角面统计），组合失败时可单件查看。
- **配色工作台**：按部位上色、配色方案保存 / 导入导出 JSON、复制配色清单。

---

## 快速开始

### 1. 克隆仓库

```bash
git clone <你的仓库地址> VAULT-USSA
cd VAULT-USSA
```

### 2. 准备 STL（二选一）

**方式 A：放回目录（本地开发推荐）**

把 STL 按原目录结构放回仓库根目录，例如：

```
VAULT-USSA/
├── 01. DRAWERS/01. S Families/S3/...
├── 02. SUSTAINERS/...
└── 03. MODIFICATIONS/...
```

配置器会直接从这些目录读取，无需额外操作。

**方式 B：网页内导入（GitHub Pages / 无 STL 仓库推荐）**

1. 启动本地服务器并打开配置器（见下一步）。
2. 点击右上角「打印清单」打开侧栏。
3. 点击「导入 STL 文件夹」，选择**包含 `01. DRAWERS`、`02. SUSTAINERS`、`03. MODIFICATIONS` 的根文件夹**。
4. 状态变为「已导入 N 个 STL · 下载与预览优先读取本地文件」即可正常预览与打包下载。

> 导入只读取本机文件，不会上传任何内容；受浏览器安全限制，刷新页面后需要重新导入。

### 3. 启动本地服务器

配置器使用 `fetch` 读取 STL 与数据，必须通过 HTTP 访问，**不能直接双击 `index.html`**（`file://` 会被浏览器跨域策略拦截）。

```bash
# 在仓库根目录执行
python -m http.server 8080
```

然后打开：

```
http://localhost:8080/configurator/
```

其他等价方式：`npx serve .`、`php -S localhost:8080`、VS Code Live Server 等。

---

## STL 手动导入

### 匹配规则

导入时会用文件名与相对路径和配置器内置的清单（[configurator/data/vault-manifest.js](configurator/data/vault-manifest.js)）做匹配：

- 选择文件夹时，浏览器提供的相对路径会逐级剥离前缀，直到命中清单中的路径；
  例如选择 `VAULT-USSA` 根目录时，`VAULT-USSA/01. DRAWERS/07. Universal/Label.stl` → `01. DRAWERS/07. Universal/Label.stl`。
- 选择单个文件时，仅当该文件名在清单中唯一时才会计入。
- 匹配失败通常是因为选错了层级：请选择**包含三个顶层类别目录的根文件夹**，而不是只选其中的 `07. Universal` 之类子目录。
- 同名文件较多（如 `L1F.stl` 同时存在于两种洞洞板目录）时，单文件导入无法确定归属，请使用文件夹导入。

### 导入状态

- 打印清单顶部显示已导入数量；未导入时下载会提示「缺少 xxx.stl，请先用『导入 STL 文件夹』选择本地模型库」。
- 单件 3D 预览弹窗在读取失败时也提供「选择本地 STL 文件」按钮，选中的文件会记入本次会话的本地库。

---

## 打印清单与打包下载

- 「打包下载 STL」会把清单中的文件打包为 `VAULT_USSA_STL_YYYYMMDD.zip`，压缩包内保留 `01. DRAWERS/...` 原始目录结构，方便直接解压到切片工程。
- ZIP 采用 store 模式（不压缩）：STL 已接近熵上限，压缩收益很低，打包速度更快。
- ZIP 内**每种文件只放 1 份**；实际打印数量以清单中的「件数」为准。
- 单个条目右侧的下载按钮用于单独下载该 STL。
- 大批量清单会占用较多内存，建议按抽屉 / 箱体分批下载。

---

## 3D 预览说明

- 需要浏览器支持 **WebGL 2**。
- 单件预览上限约 1200 万三角面；超过后可保存副本并用切片软件打开。
- 组合预览会按类别自动堆叠，超大组合会省略部分小件并提示。
- 组合预览需要能读取 STL：要么文件在服务器目录中，要么已导入本地文件夹。

---

## 部署到 GitHub Pages

1. 推送到 GitHub 后，进入仓库 **Settings → Pages**。
2. Source 选择 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`。
3. 访问 `https://<用户名>.github.io/<仓库名>/configurator/`。

由于仓库不含 STL，线上页面首次打开时组合预览与下载都不可用，需要先按「方式 B」导入本地 STL 文件夹。若静态资源被 Jekyll 处理导致异常，可在仓库根目录添加空的 `.nojekyll` 文件。

---

## 命名规则摘要

完整规则见 [agent.md](agent.md)，三张命名图是部件命名的权威图示。

- **尺寸族**：`S` / `M` / `L` / `XL`，以及双宽变体 `L²` / `XL²`；族后的数字 `3`–`7` 为规格档位。
- **高度**：`1F` / `2F` / `4F` 表示层数；面板按 `S1F`、`S2F`、`S4F` 等方式命名。
- **部件角色**：`Box` 盒体、`Module` 模块、`Roof` 顶盖、`Facade` 前面板、`Baseplate` 底板、`Runner` 滑轨、`Backbone` 背板骨架、`Latch` / `Key` 锁扣等。
- **打印标记**：
  - `(Turn On Supports)`：切片时必须开启支撑，括号内文字不可清理。
  - `Part 1` / `Part 2`：为规避打印尺寸拆分的部件，需分别打印后拼合；`Whole` 为整体参考件。
  - `x3`–`x7`：配套数量 / 规格提示。
  - `Tyre (TPU)`：轮胎需用 TPU，其余轮组件用硬质材料。
- **原始拼写与空格必须保留**：`Heawyweight`、`L²`、`Roof` / `Roofs` 混用、多余空格等均为既有约定，引用路径时需精确匹配。

---

## 数据与维护

`configurator/` 为无构建的静态站点：

```
configurator/
├── index.html                入口
├── app.js                    构型 / 部件库 / 清单 / 导入 / 打包下载
├── assembly.js               组合 3D 装配视图
├── preview.js                单件 3D 预览弹窗
├── local-files.js            本地 STL 库（手动导入）
├── guide.js / manuals.js     指南与手册查看
├── styles.css / preview.css / guide.css / manuals.css
├── data/vault-manifest.js     756 个 STL 的索引（路径、名称、尺寸、类别）
├── data/vault-orientations.js 组合预览姿态数据
├── data/vault-3d.js           组合预览用数据
├── data/scene-templates.js    场景模板
├── data/palettes.js           配色预设
├── assets/previews/           部件缩略图
├── assets/manuals/            手册页图片
├── vendor/vault-stl.min.js    STL 解析与渲染引擎
└── tools/                     Python 数据生成脚本
```

维护约定：

- STL 是最终交付物，只读；需要变更几何时从建模源文件重新导出，不在仓库内改写 STL。
- 增删 STL 后需重新生成索引（脚本需要本地 STL 文件，因此请在完整模型库上执行）：

  ```bash
  python configurator/tools/build_manifest.py
  ```

- 其他脚本：`import_manuals.py`（手册页图片）、`import_orientations.py`（预览姿态）、`import_scenes.py`（场景模板）、`import_reference.py`（参考组合）。
- 所有路径含空格、中文句点与 `²` 等字符，脚本请按 UTF-8 读写，PowerShell 中路径需加引号。

---

## 常见问题

**Q：页面提示「VAULT 数据未加载」？**
确认 `configurator/data/vault-manifest.js` 存在且未被浏览器拦截；用 HTTP 服务器打开页面。

**Q：3D 预览 / 打包下载提示文件缺失？**
仓库不含 STL。把 STL 放回目录，或在打印清单中「导入 STL 文件夹」；线上 Pages 场景必须使用导入。

**Q：导入后提示「没有匹配到清单中的 STL」？**
选择包含 `01. DRAWERS`、`02. SUSTAINERS`、`03. MODIFICATIONS` 的根文件夹；只选子目录或子文件无法匹配完整路径。

**Q：刷新页面后导入的 STL 不见了？**
浏览器不会持久保存本地文件句柄，这是安全限制；重新导入即可。

**Q：打包下载很慢或失败？**
文件总量过大时浏览器内存压力较高，建议按一套抽屉 / 一个收纳箱分批下载。

**Q：打印清单和配色方案保存在哪里？**
保存在浏览器 `localStorage`，不会上传；清理浏览器数据会丢失。

---

## 参考

- 装配与安装步骤以根目录 5 份 PDF 为准。
- 部件命名以 `Drawers Naming.png`、`Sustainer Naming.png`、`XL Mods Naming.png` 为准。
- 更多工程约定见 [agent.md](agent.md)。

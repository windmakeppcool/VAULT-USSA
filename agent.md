# VAULT USSA —— 工程说明（Agent 指南）

## 1. 工程定位

本工程是 **VAULT USSA 模块化抽屉系统的 3D 打印模型库**，不是软件项目。

- 工程内只有 STL 模型、装配说明 PDF 和命名示意图，**没有源代码、依赖、构建脚本或测试**。
- 目标产出物是可直接送入切片软件（Bambu Studio / PrusaSlicer / OrcaSlicer 等）的 STL 文件。
- 系统以 **Gridfinity** 网格为底层尺寸体系，抽屉可叠加、组合，并可通过多种底座/背板/轮组/挂墙件改造成不同形态。
- 全部内容以"部件"为单位组织，靠 **目录层级 + 文件名** 表达规格与用途，文件名本身就是接口约定。

## 2. 顶层结构

| 路径 | 内容 | STL 数量 | 体积 |
| --- | --- | ---: | ---: |
| `01. DRAWERS/` | 抽屉本体：盒体、模块、顶盖、面板、滑轨、分隔、五金小件 | 400 | ≈14.8 GB |
| `02. SUSTAINERS/` | 抽屉外套/收纳箱：模块化箱体、盖、铰链、锁、分隔、提手 | 225 | ≈5.69 GB |
| `03. MODIFICATIONS/` | 改装件：底座、背板、脚、挂墙、轮组、提手、洞洞板转接 | 98 | ≈2.21 GB |
| `01_Instructions Manual.pdf` | 总说明手册 | — | — |
| `02_Drawer Assembly.pdf` | 抽屉装配说明 | — | — |
| `03_Sustainers Assembly.pdf` | 外套箱装配说明 | — | — |
| `04_Modifications.pdf` | 改装件说明 | — | — |
| `05_Mounting Instructions.pdf` | 安装（挂墙/固定）说明 | — | — |

统计口径：共 737 个文件、723 个 STL、约 22.74 GB（含 PDF 与 PNG）。

## 3. 命名规则

### 3.1 尺寸族（Family）

- `S` / `M` / `L` / `XL`：由浅到深（或由小到大）的四档规格族。
- `L²` / `XL²`：`L` / `XL` 的双宽（加宽）变体，目录名含上标字符 `²`。
- 族名后的数字 `3`–`7`：同一族内的规格档位，例如 `S3`…`S7`、`XL3`…`XL7`。
- 抽屉与外套都按族分目录；`L²`、`XL²` 只在抽屉侧存在，且仅有 Module。

### 3.2 高度（F）

- `1F` / `2F` / `4F` 表示层数/高度档：1 层、2 层、4 层。
- 目录名可交叉印证：`01. DRAWERS/07. Universal/Grid Dividers/` 下存在
  `34.5MM TALL (full height of 1F drawers)` 与 `82.5MM TALL (full height of 2F drawers)`。
- 面板按高度区分：`S1F`、`S2F`、`S4F`（`L1F`/`L2F`/`L4F` 等同理），**不存在独立的 1F/2F 族目录**。

### 3.3 部件角色

- `Box`：抽屉外壳盒体。
- `Module`：抽屉内部模块；外套侧分为 `Flat Module`、`Dividers Module`、`Sealed Module`。
- `Roof`：顶盖。抽屉侧有多种形态：`Bowl Roof`、`Grid Roof`、`Table Roof`、`Under Table Mount Roof`、`Heawyweight Roof`（原命名拼写如此）。
- `Facade`：前面板。
- `Baseplate`：Gridfinity 底板，部分带 `With 1 Handle` / `With 2 Handles` / `No Handles` 变体。
- `Runner Guides` / `Runner Slides` / `Runner Stopper`：滑轨导向、滑块、限位。
- `Rails`：齿条导轨（`S/M/L/XL Rails`）。
- `Backbone`：抽屉背板骨架；`Base`：整体底座。
- `Latch`、`Key`、`Hidden Key`、`Key Cap`、`Springs`、`Label`：锁扣与标识小件。

### 3.4 打印相关标记

- `(Turn On Supports)` / `(Turn on Supports)`：切片时必须开启支撑。**括号内文字是有效信息，不可清理。**
- `Part 1` / `Part 2`：为规避打印尺寸而拆分的部件，需分别打印后拼合。
- `Whole`：拆分件的整体参考模型（通常不直接打印，或用于核对装配）。
- `x3`–`x7`：配套数量/规格提示，例如 `10-S, x3.stl`、`x3 Runner Guides.stl`。
- `Tyre (TPU)`：轮胎需用 TPU 打印，其余轮组件为硬质材料。

## 4. `01. DRAWERS/` 结构

```
01. DRAWERS/
├── 01. S Families/          S3–S7，每个含 Boxes / Gridfinity Baseplate / Modules / Roofs
├── 02. M Families/          M3–M7
├── 03. L Families/          L3–L7
├── 04. L² Families/         L3²–L7²，仅 Module 1F/2F/4F
├── 05. XL Families/         XL3–XL7，含 Back Panel（XL3–XL5）与 Part 1/2 拆分盒体（XL6–XL7）
├── 06. XL² Families/        XL3²–XL7²，仅 Module 1F
├── 07. Universal/           跨规格通用件
└── Drawers Naming.png       抽屉爆炸图/命名示意
```

`07. Universal/` 内容：

- `Geared Rails/`：`S/M/L/XL Rails` 四种齿条。
- `Grid Dividers/`：按 `20MM TALL`、`34.5MM TALL`、`82.5MM TALL` 三档高度分组，文件名为格宽编号（`5`–`32`，含 `10-S, x3`、`18-M, x5`、`26-L, x7`、`32-XL` 等标注）。
- `Runners/`：`x3`–`x7` 与 `XL3`–`XL7` 的 Guides/Slides，另有 `Runner Stopper`。
- `L² Accessories/`：`x3`–`x7` 的第一/第二配件。
- `Manual Supports/`：`x3`–`x7` 手动支撑件。
- 单件：`Top Handle (Turn On Supports)`、`Latch`、`Label`、`Springs`、`Key (Turn On Supports)`、`Hidden Key (...)`、`Hidden Key Part 2 (...)`、`Key Cap`、`Facade Cap`、`Heawyweight Roof Handle`、`Heawyweight Roof Insert`。

## 5. `02. SUSTAINERS/` 结构

```
02. SUSTAINERS/
├── 01. S Families/    S3–S7：Facades + Modules + Roofs
├── 02. M Families/    M3–M7
├── 03. L Families/    L3–L7
├── 04. XL Families/   XL3–XL7（仅 1F 模块）
├── 05. Universal/     通用底板/分隔/面板/铰链/锁/连杆
└── Sustainer Naming.png
```

- 每个箱体族目录下：`Modules/`（1F/2F/4F × Flat / Dividers / Sealed）与 `Roofs/`（整体式或 Part 1/2 分体式，大尺寸附 `Connector For Split Roof`）。
- `05. Universal/Baseplates/`：按 `01. S`、`02. M`、`03. L`、`04. XL` 分组的 Gridfinity 底板。
- `05. Universal/Dividers/`：S/M 按高度分单个文件；L 分为 `L Depth Dividers`（含族+高度）、`L Width Dividers`、`L Seal Dividers`；XL 有 `XL Depth Dividers` 与独立的 Seal/Width Divider。
- `05. Universal/Hinges/`：`S-M 1F Hinge`、`S-M 2-4F Hinge`、`L-XL 1F Hinge`、`L 2-4F Hinge` 及各规格 `Hinge Top`。
- `05. Universal/Locks/`：`LOCK HOLDER`、`LOCK INNER PART`、`LOCK OUTER PART 1F`、`LOCK OUTER PART 2-4F`、`1 SET OF PINS FOR 1 LOCK`。
- `05. Universal/Rods/`：`S-M Rods`、`L-XL Rods`。
- `05. Universal/Facades/`：`S1F/S2F/S4F`、`M1F/M2F/M4F`、`L1F/L2F/L4F`。

## 6. `03. MODIFICATIONS/` 结构

| 子目录 | 内容 |
| --- | --- |
| `Backbone/` | `S1F/S2F/M1F/M2F/L1F/L2F/XL1F Backbone`、`Universal 1F/2F Backbone`、`Connector for Modules 1F/2F`、`S/M/L/XL Pull-out Handle Lock`、`Handle Lock Knob Part 1/2` |
| `Base/` | 按 `S`、`M`、`L`、`XL` 分组，族 3–7；6/7 为 `Part 1/2 + Whole`，另有 `Base Connector` |
| `Feet/` | `S/M/L/XL Feet` |
| `Wall Mounts/` | `S/M/L/XL` 的 `1F/2F/4F Wall Mount` 与 `Wall Mount Second Part` |
| `Wheels/` | `Disk`、`Tyre (TPU)`、`Bushing`、`Cover`、`Jig` |
| `Stationary Handle/` | `S/M/L/XL Stationary Handle` |
| `Pull-out Handle/` | `S/M/L/XL Pull-out Handle` |
| `Pegboard Attachment/` | `IKEA Skadis Pegboard/` 与 `USSA Pegboard/`，各含 `S1F/S2F/M1F/M2F/L1F/L2F/XL1F` |

跨目录引用：`Backbone` 与 `Base` 通过 `Connector for Modules`、`Base Connector` 组合，装配顺序见 `04_Modifications.pdf`。

## 7. 面向 Agent 的工作约定

1. **二进制资产优先只读**：STL 是最终交付物，不做内容修改；需要变更几何时，应由建模源文件重新导出，而不是在仓库内改写 STL。
2. **保持命名与层级**：文件名/目录名是用户选型的唯一索引，也是切片工程与装配文档的引用键。不要"规范化"大小写、空格、`²`、`Heawyweight` 等原始拼写，不要合并 `Roof` / `Roofs` 这类不一致目录。
3. **增补新件时**：沿用 `序号. 类别/族/规格/部件角色/文件名` 的既有模式；同时具备 `Part 1/Part 2` 时保留 `Whole` 参考件；需要支撑的件在文件名末尾加 `(Turn On Supports)`。
4. **路径处理**：目录含空格、中文句点、`²` 等字符。PowerShell 中一律使用引号包裹路径；脚本需按 UTF-8 读写。
5. **不要引入代码脚手架**：本工程无 `package.json`、构建、测试、Lint 流程，不需要为"工程完整性"添加。
6. **校验方式**：只能做静态核对——目录结构、文件命名、数量、拆分件配对（`Part 1/2/Whole`）、族×规格×高度矩阵是否缺项。几何正确性需在切片软件中人工验证。
7. **文档引用**：装配与安装步骤以根目录 5 份 PDF 为准；`Drawers Naming.png`、`Sustainer Naming.png`、`XL Mods Naming.png` 是部件命名的权威图示。
8. **单位与尺寸**：STL 本身不含单位，按惯例以毫米解释。修改或新增模型时保持与既有件的比例一致，不要缩放导入件。

## 8. 快速定位

- 查某族抽屉的全部零件：`01. DRAWERS/0x. <族> Families/<族+编号>/`
- 查通用滑轨/齿条/分隔：`01. DRAWERS/07. Universal/`
- 查箱体外壳/盖/铰链/锁：`02. SUSTAINERS/`
- 查安装方式（桌面、挂墙、带轮、洞洞板）：`03. MODIFICATIONS/` + `05_Mounting Instructions.pdf`
- 查装配顺序：`02_Drawer Assembly.pdf`、`03_Sustainers Assembly.pdf`、`04_Modifications.pdf`

## 9. 已知的不一致（保留，勿擅自修复）

- `Roof` 与 `Roofs` 目录混用：箱体侧 `S4`、`S7`、`M4`、`L4` 为单数 `Roof/`，其余为 `Roofs/`。
- `Heawyweight` 为原始拼写（应为 Heavyweight），出现在顶盖与提手件名中。
- 部分文件名存在多余空格（如 `M3 1F Module .stl` 的扩展名前空格、`XL3  Roof.stl` 的双空格），属于既有命名，引用时需精确匹配。
- 目录中 `L4F' Facade.stl` 含多余单引号。

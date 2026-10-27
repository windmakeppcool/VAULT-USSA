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
npm run pack     # 打包免安装 exe（输出到 release/）
```

## 与旧版差异

- 不再需要 `python -m http.server`
- 不再需要每次手动导入 STL 文件夹，库路径持久化
- 打包导出改为流式写盘并支持 ZIP64，25 GB 级清单不再爆内存
- 3D 渲染改用原生 three.js，STL 解析在 Web Worker 中进行
- 旧版 `configurator/` 保留在仓库中作为参照

## 目录

- `electron/` — 主进程（窗口、`app://` 协议、库管理、流式 ZIP、手册打开）
- `src/` — 渲染进程（Vue 视图、Pinia store、three.js 组件、几何算法）
- `resources/pdf/` — 随包分发的 5 份装配手册

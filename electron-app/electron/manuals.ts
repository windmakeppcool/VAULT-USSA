import { app, shell } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * 用系统默认阅读器打开打包的手册 PDF。
 *
 * 开发环境读取 `electron-app/resources/pdf/`；打包后该目录经
 * electron-builder 的 `extraResources` 复制到 `process.resourcesPath/pdf/`。
 */
export async function openManual(pdfName: string): Promise<void> {
  // PDF 均位于同一扁平目录，取 basename 避免 `../` 逃逸出资源目录
  const safeName = path.basename(pdfName)
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'pdf')
    : path.join(app.getAppPath(), 'resources', 'pdf')
  const target = path.join(base, safeName)
  if (!existsSync(target)) throw new Error(`手册文件不存在：${safeName}`)
  const error = await shell.openPath(target)
  if (error) throw new Error(error)
}

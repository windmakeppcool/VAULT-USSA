import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerAppSchemePrivileges, registerAppProtocol } from './protocol'
import { getLibraryState, selectLibraryRoot, readConfig, writeConfig } from './stl-library'
import { exportZip, cancelExport } from './zip-export'
import { openManual } from './manuals'

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
      preload: path.join(dirname, 'preload.mjs'),
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
  ipcMain.handle('export:start', (event, relPaths: unknown, jobId: string) => {
    if (!Array.isArray(relPaths)) throw new Error('导出清单格式错误')
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('窗口已关闭')
    return exportZip(win, relPaths as string[], jobId)
  })
  ipcMain.on('export:cancel', (_event, jobId: string) => cancelExport(jobId))
  ipcMain.handle('manual:open', (_event, name: string) => openManual(name))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

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

import { dialog, BrowserWindow } from 'electron'
import { createReadStream, createWriteStream, statSync, unlinkSync } from 'node:fs'
import { resolveWithinRoot } from '../src/lib/path'
import { loadSavedRoot } from './stl-library'
import {
  buildCentralHeader,
  buildEocd,
  buildLocalHeader,
  crc32,
  zipDosStamp,
} from '../src/lib/zip/crc32'
import type { ExportProgress } from '../src/types/api'

/** 进行中的导出任务，按 jobId 索引，便于取消 */
const jobs = new Map<string, AbortController>()

/**
 * 读取单个文件的全部内容。
 * CRC 必须先于本地文件头写出，因此无法真正边读边写；但内存中
 * 同时只驻留一个文件（单件上限 72 MB），不会整库累积。
 */
async function readWholeFile(file: string): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  const stream = createReadStream(file)
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
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
  // 提前挂好错误监听：写盘失败时不能留下无人处理的 'error' 事件
  let streamError: Error | null = null
  const finished = new Promise<void>((resolve) => {
    out.once('finish', resolve)
    // 持续监听而非 once：销毁后的重复写入还可能再触发 error，不能被漏掉
    out.on('error', (error: Error) => {
      streamError = error
      resolve()
    })
  })
  // 关闭句柄之后再删文件，避免 Windows 上 unlink 因占用而失败
  const closed = new Promise<void>((resolve) => out.once('close', () => resolve()))

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
      if (streamError) throw streamError

      const rel = relPaths[i]
      const file = resolveWithinRoot(root, rel)
      if (!file) throw new Error(`非法路径：${rel}`)
      // ZIP 条目名统一使用正斜杠，避免部分解压工具把反斜杠当成普通字符
      const entryName = rel.replace(/\\/g, '/')

      // 先确认文件存在，给出比读流更明确的错误
      try {
        statSync(file)
      } catch {
        throw new Error(`缺少文件：${rel}`)
      }

      emit({ done: i, currentFile: rel })

      // 逐件读入以计算 CRC（CRC 必须先于本地头写出）
      const data = await readWholeFile(file)
      const crc = crc32(data)
      const nameBytes = new TextEncoder().encode(entryName)

      // 以实际读取到的长度为准，避免 stat 与读取之间文件被替换导致头部不一致
      const size = data.length
      const local = buildLocalHeader({ name: nameBytes, crc, size, stamp })
      out.write(local)
      out.write(data)
      central.push(buildCentralHeader({ name: nameBytes, crc, size, stamp, offset }))

      offset += local.length + data.length
      bytes += data.length
    }

    if (streamError) throw streamError

    const centralOffset = offset
    let centralSize = 0
    for (const header of central) {
      out.write(header)
      centralSize += header.length
    }
    out.write(buildEocd({ count: central.length, centralSize, centralOffset }))
    out.end()
    await finished
    if (streamError) throw streamError

    emit({ done: relPaths.length, state: 'done' })
    return { canceled: false, savedTo: target.filePath }
  } catch (error) {
    out.destroy()
    await closed
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

/** 请求取消某个导出任务；实际清理在下一次循环检查时完成 */
export function cancelExport(jobId: string): void {
  jobs.get(jobId)?.abort()
}

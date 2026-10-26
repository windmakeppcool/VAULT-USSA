import { dialog, BrowserWindow } from 'electron'
import { createReadStream, createWriteStream, renameSync, statSync, unlinkSync } from 'node:fs'
import type { WriteStream } from 'node:fs'
import { once } from 'node:events'
import { resolveWithinRoot } from '../src/lib/path'
import { loadSavedRoot } from './stl-library'
import {
  buildCentralHeader,
  buildEocd,
  buildLocalHeader,
  buildZip64Eocd,
  buildZip64Locator,
  crc32,
  zipDosStamp,
} from '../src/lib/zip/crc32'
import type { ExportProgress } from '../src/types/api'

/** 进行中的导出任务，按 jobId 索引，便于取消 */
const jobs = new Map<string, AbortController>()

/** 32 位字段上限，超过即需要 ZIP64 */
const U32_MAX = 0xffffffff

/**
 * 写入一个块，遵守可写流背压：缓冲区满时等待 drain，
 * 避免 25 GB 导出时内部队列无界增长。
 */
async function writeChunk(stream: WriteStream, chunk: Uint8Array): Promise<void> {
  if (!stream.write(chunk)) await once(stream, 'drain')
}

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

  // 先写同目录临时文件，全部成功后再原子替换，避免中途失败毁掉用户已有文件
  const tempPath = target.filePath + '.part'
  const out = createWriteStream(tempPath)
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
  // 供失败/取消时的进度载荷复用最后一个已知进度，而不是重置为 0
  let lastDone = 0
  let lastFile = ''

  const emit = (patch: Partial<ExportProgress>) => {
    if (win.isDestroyed()) return
    win.webContents.send('export:progress', {
      jobId,
      done: lastDone,
      total: relPaths.length,
      bytes,
      currentFile: lastFile,
      state: 'running',
      ...patch,
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

      lastDone = i
      lastFile = rel
      emit({})

      // 逐件读入以计算 CRC（CRC 必须先于本地头写出）
      const data = await readWholeFile(file)
      const crc = crc32(data)
      const nameBytes = new TextEncoder().encode(entryName)

      // 以实际读取到的长度为准，避免 stat 与读取之间文件被替换导致头部不一致
      const size = data.length
      const local = buildLocalHeader({ name: nameBytes, crc, size, stamp })
      await writeChunk(out, local)
      await writeChunk(out, data)
      central.push(buildCentralHeader({ name: nameBytes, crc, size, stamp, offset }))

      offset += local.length + data.length
      bytes += data.length
    }

    // 循环结束后、写中央目录之前再检查一次取消
    if (controller.signal.aborted) throw new Error('canceled')
    if (streamError) throw streamError

    const centralOffset = offset
    let centralSize = 0
    for (const header of central) {
      await writeChunk(out, header)
      centralSize += header.length
    }

    // 条目数与单件大小都不会溢出，只有中央目录偏移/大小需要 ZIP64
    if (centralOffset >= U32_MAX || centralSize >= U32_MAX) {
      const zip64EocdOffset = centralOffset + centralSize
      await writeChunk(
        out,
        buildZip64Eocd({
          count: central.length,
          centralSize,
          centralOffset,
          zip64EocdOffset,
        }),
      )
      await writeChunk(out, buildZip64Locator(zip64EocdOffset))
      await writeChunk(
        out,
        buildEocd({ count: central.length, centralSize, centralOffset, zip64: true }),
      )
    } else {
      await writeChunk(out, buildEocd({ count: central.length, centralSize, centralOffset }))
    }

    out.end()
    await finished
    if (streamError) throw streamError

    // 全部写入成功，用临时文件原子替换目标文件
    renameSync(tempPath, target.filePath)

    lastDone = relPaths.length
    emit({ done: relPaths.length, state: 'done' })
    return { canceled: false, savedTo: target.filePath }
  } catch (error) {
    out.destroy()
    await closed
    try {
      // 只删临时文件，绝不触碰用户原有文件
      unlinkSync(tempPath)
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

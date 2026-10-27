import { stlUrl } from '@/lib/path'
import { canonicalize, type Canonical, type QuantizedMesh } from '@/lib/geometry/orientation'
import type { Vec3 } from '@/lib/geometry/vector'
import { VAULT_DATA } from '@/data/manifest'

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

export interface LoadOptions {
  /** 跳过 72 MiB 上限（单件预览用） */
  allowLarge?: boolean
  /** 不写入缓存（大文件避免挤占缓存） */
  skipCache?: boolean
}

/** 清单里的原始文件体积，模块顶层建一次，用于下载前预判 oversized */
const SIZE_BY_PATH = new Map(VAULT_DATA.files.map((f) => [f.p, f.s]))

const cache = new Map<string, LoadedPart>()
const pending = new Map<string, Promise<LoadedPart>>()
let cacheBytes = 0

interface ParseResult {
  positions: Uint16Array
  minimum: Vec3
  maximum: Vec3
  triangles: number
}

interface WorkerResponse {
  id: number
  ok: boolean
  positions?: Uint16Array
  minimum?: Vec3
  maximum?: Vec3
  triangles?: number
  error?: string
}

let worker: Worker | null = null
let nextRequestId = 1
const parseWaiters = new Map<
  number,
  { resolve: (v: ParseResult) => void; reject: (e: Error) => void }
>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/stl-worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data
      const waiter = parseWaiters.get(data.id)
      if (!waiter) return
      parseWaiters.delete(data.id)
      if (data.ok && data.positions && data.minimum && data.maximum && typeof data.triangles === 'number') {
        waiter.resolve({
          positions: data.positions,
          minimum: data.minimum,
          maximum: data.maximum,
          triangles: data.triangles,
        })
      } else {
        waiter.reject(new Error(data.error ?? 'STL 解析失败'))
      }
    }
    worker.onerror = () => {
      for (const waiter of parseWaiters.values()) waiter.reject(new Error('STL 解析 Worker 异常'))
      parseWaiters.clear()
      // Worker 已不可用：终止并置空，下次 getWorker() 会重建，
      // 否则后续 postMessage 投递到死 worker 永不回包，pending 永远清不掉
      worker?.terminate()
      worker = null
    }
  }
  return worker
}

/**
 * 把 buffer 交给 Worker 解析。注意 transfer 列表会转移 buffer 所有权，
 * 转移后主线程不可再读取同一个 buffer。
 */
function parseInWorker(buffer: ArrayBuffer): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++
    parseWaiters.set(id, { resolve, reject })
    try {
      getWorker().postMessage({ id, buffer }, [buffer])
    } catch (error) {
      parseWaiters.delete(id)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

function trimCache(): void {
  if (cacheBytes <= MAX_CACHE_BYTES) return
  for (const key of Array.from(cache.keys())) {
    if (cacheBytes <= MAX_CACHE_BYTES) break
    // 在途条目尚未完成，淘汰它会让并发加载重复计数
    if (pending.has(key)) continue
    const entry = cache.get(key)
    if (!entry) continue
    cacheBytes -= entry.bytes
    cache.delete(key)
  }
}

async function fetchOne(
  path: string,
  category: string,
  opts?: LoadOptions,
): Promise<LoadedPart> {
  const allowLarge = opts?.allowLarge === true
  const skipCache = opts?.skipCache === true

  // 用清单体积在下载前预判，避免白下载超大文件（单件预览显式放行）
  const declared = SIZE_BY_PATH.get(path)
  if (!allowLarge && declared !== undefined && declared > MAX_PART_BYTES) throw new Error('oversized')

  const response = await fetch(stlUrl(path))
  if (!response.ok) {
    throw new Error(response.status === 404 ? `缺少文件：${path}` : `读取失败（${response.status}）：${path}`)
  }
  const buffer = await response.arrayBuffer()
  // 清单体积可能缺失或不准确，下载后再兜底检查一次
  if (!allowLarge && buffer.byteLength > MAX_PART_BYTES) throw new Error('oversized')

  const parsed = await parseInWorker(buffer)

  // 并发竞态下同一路径可能已被另一实例写入，避免重复记账
  const existing = cache.get(path)
  if (existing) return existing

  const quantized: QuantizedMesh = {
    positions: parsed.positions,
    minimum: parsed.minimum,
    maximum: parsed.maximum,
  }

  const part: LoadedPart = {
    path,
    quantized,
    canonical: canonicalize(quantized, category, path),
    triangles: parsed.triangles,
    bytes: quantized.positions.byteLength,
  }
  // 单件预览的大文件不写缓存，避免把 180 MiB 预算挤占掉
  if (!skipCache) {
    cache.set(path, part)
    cacheBytes += part.bytes
    trimCache()
  }
  return part
}

export function useStlLoader() {
  function load(path: string, category: string, opts?: LoadOptions): Promise<LoadedPart> {
    const cached = cache.get(path)
    if (cached) return Promise.resolve(cached)
    const inflight = pending.get(path)
    if (inflight) return inflight
    const job = fetchOne(path, category, opts).finally(() => pending.delete(path))
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
              // 进度回调由外部提供，抛错不应中断 pump 导致外层永不 resolve
              try {
                onProgress?.(done, list.length, item.path)
              } catch {
                // 忽略回调自身的异常
              }
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

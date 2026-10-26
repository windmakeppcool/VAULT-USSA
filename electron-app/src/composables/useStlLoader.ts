import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { BufferGeometry } from 'three'
import { stlUrl } from '@/lib/path'
import { canonicalize, type Canonical, type QuantizedMesh } from '@/lib/geometry/orientation'
import type { Vec3 } from '@/lib/geometry/vector'

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

const loader = new STLLoader()
const cache = new Map<string, LoadedPart>()
let cacheBytes = 0

/** 顶点按 65535 归一化为 Uint16，内存占用减半 */
function quantize(geometry: BufferGeometry): QuantizedMesh {
  const attr = geometry.getAttribute('position')
  const count = attr.count
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      const v = attr.getComponent(i, a)
      if (v < min[a]) min[a] = v
      if (v > max[a]) max[a] = v
    }
  }
  const span: Vec3 = [max[0] - min[0] || 1, max[1] - min[1] || 1, max[2] - min[2] || 1]
  const positions = new Uint16Array(count * 3)
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      const v = attr.getComponent(i, a)
      positions[i * 3 + a] = Math.round(((v - min[a]) / span[a]) * 65535)
    }
  }
  return { positions, minimum: min, maximum: max }
}

function trimCache(): void {
  if (cacheBytes <= MAX_CACHE_BYTES) return
  for (const key of Array.from(cache.keys())) {
    if (cacheBytes <= MAX_CACHE_BYTES) break
    const entry = cache.get(key)
    if (!entry) continue
    cacheBytes -= entry.bytes
    cache.delete(key)
  }
}

async function fetchOne(path: string, category: string): Promise<LoadedPart> {
  const response = await fetch(stlUrl(path))
  if (!response.ok) {
    throw new Error(response.status === 404 ? `缺少文件：${path}` : `读取失败（${response.status}）：${path}`)
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_PART_BYTES) throw new Error('oversized')

  const geometry = loader.parse(buffer)
  const quantized = quantize(geometry)
  geometry.dispose()

  const part: LoadedPart = {
    path,
    quantized,
    canonical: canonicalize(quantized, category, path),
    triangles: quantized.positions.length / 9,
    bytes: quantized.positions.byteLength,
  }
  cache.set(path, part)
  cacheBytes += part.bytes
  trimCache()
  return part
}

export function useStlLoader() {
  const pending = new Map<string, Promise<LoadedPart>>()

  function load(path: string, category: string): Promise<LoadedPart> {
    const cached = cache.get(path)
    if (cached) return Promise.resolve(cached)
    const inflight = pending.get(path)
    if (inflight) return inflight
    const job = fetchOne(path, category).finally(() => pending.delete(path))
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
              onProgress?.(done, list.length, item.path)
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

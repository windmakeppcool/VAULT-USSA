import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

/**
 * STL 解析 Worker。
 *
 * 大模型（接近 72 MB）在主线程同步解析会阻塞 UI，因此在 Worker 中完成：
 * 解析 → 统计包围盒 → 顶点按 65535 归一化为 Uint16（内存减半）。
 * 结果通过 transfer 把 positions 的底层 buffer 零拷贝交还主线程。
 */

interface ParseRequest {
  id: number
  buffer: ArrayBuffer
}

interface ParseResponse {
  id: number
  ok: boolean
  positions?: Uint16Array
  minimum?: [number, number, number]
  maximum?: [number, number, number]
  triangles?: number
  error?: string
}

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { id, buffer } = event.data
  try {
    const loader = new STLLoader()
    const geometry = loader.parse(buffer)
    const attr = geometry.getAttribute('position')
    const count = attr.count

    const min: [number, number, number] = [Infinity, Infinity, Infinity]
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < count; i++) {
      for (let a = 0; a < 3; a++) {
        const v = attr.getComponent(i, a)
        if (v < min[a]) min[a] = v
        if (v > max[a]) max[a] = v
      }
    }
    const span: [number, number, number] = [
      max[0] - min[0] || 1,
      max[1] - min[1] || 1,
      max[2] - min[2] || 1,
    ]
    const positions = new Uint16Array(count * 3)
    for (let i = 0; i < count; i++) {
      for (let a = 0; a < 3; a++) {
        const v = attr.getComponent(i, a)
        positions[i * 3 + a] = Math.round(((v - min[a]) / span[a]) * 65535)
      }
    }
    geometry.dispose()

    const response: ParseResponse = {
      id,
      ok: true,
      positions,
      minimum: min,
      maximum: max,
      triangles: count / 3,
    }
    ;(self as unknown as Worker).postMessage(response, [positions.buffer as ArrayBuffer])
  } catch (error) {
    const response: ParseResponse = { id, ok: false, error: (error as Error).message }
    ;(self as unknown as Worker).postMessage(response)
  }
}

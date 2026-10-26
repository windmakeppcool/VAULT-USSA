import { protocol, net } from 'electron'
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { resolveWithinRoot } from '../src/lib/path'
import { loadSavedRoot } from './stl-library'

export const APP_SCHEME = 'app'

/** 必须在 app.whenReady() 之前调用 */
export function registerAppSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ])
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.stl': 'model/stl',
}

function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

function streamFile(file: string, status = 200): Response {
  const info = statSync(file)
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream
  return new Response(body, {
    status,
    headers: {
      'content-type': mimeFor(file),
      'content-length': String(info.size),
      'cache-control': 'no-store',
    },
  })
}

/**
 * 注册协议 handler。必须在 app.whenReady() 之后调用。
 * @param uiRoot 打包产物目录（生产环境为 dist/）
 * @param devUrl 开发环境 Vite 地址；存在时 UI 请求直接转发
 */
export function registerAppProtocol(uiRoot: string, devUrl?: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    const host = url.hostname
    const rawPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''))

    if (host === 'ui') {
      if (devUrl) return net.fetch(devUrl + url.pathname + url.search)
      const file = path.join(uiRoot, rawPath || 'index.html')
      if (!file.startsWith(path.resolve(uiRoot))) {
        return new Response('Forbidden', { status: 403 })
      }
      try {
        return streamFile(file)
      } catch {
        // SPA 路由回退
        return streamFile(path.join(uiRoot, 'index.html'))
      }
    }

    if (host === 'stl') {
      const root = loadSavedRoot()
      if (!root) return new Response('Library not configured', { status: 409 })
      const resolved = resolveWithinRoot(root, rawPath)
      if (!resolved) return new Response('Forbidden', { status: 403 })
      try {
        return streamFile(resolved)
      } catch {
        return new Response('Not found', { status: 404 })
      }
    }

    return new Response('Not found', { status: 404 })
  })
}

import path from 'node:path'

/** 逐段编码，保留 `/` 分隔符 */
export function encodeStlPath(relPath: string): string {
  return relPath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function stlUrl(relPath: string): string {
  return `app://stl/${encodeStlPath(relPath)}`
}

/** candidate 是否等于 root 或位于其下（按路径段比较，避免前缀误判） */
export function isInsideRoot(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * 把相对路径解析为根目录下的绝对路径。
 * 拒绝空串、绝对路径、以及解析后逃出根目录的输入。
 */
export function resolveWithinRoot(root: string, relPath: string): string | null {
  if (!relPath || !root) return null
  const normalized = relPath.replace(/\\/g, '/')
  if (path.isAbsolute(normalized)) return null
  if (normalized.split('/').some((seg) => seg === '..')) return null
  const resolved = path.resolve(root, normalized)
  return isInsideRoot(root, resolved) ? resolved : null
}

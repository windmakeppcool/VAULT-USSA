/**
 * 路径工具（纯字符串实现，不依赖 node:path）。
 *
 * 该模块同时被主进程（electron/protocol.ts）与渲染进程（useStlLoader）使用，
 * 因此不能 import 任何 Node 内置模块，否则 Vite 的浏览器构建会失败。
 */

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

/** 统一为正斜杠并去掉末尾的分隔符，便于按段比较 */
function normalizeForCompare(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '')
}

/**
 * 根据根路径的形态选择拼接分隔符：
 * Windows 盘符（`D:/...` 或 `D:\...`）使用反斜杠，其余使用正斜杠。
 * 这样在 Windows 上返回值与 path.join 保持一致，同时渲染进程也能安全调用。
 */
function separatorFor(root: string): string {
  return /^[A-Za-z]:[\\/]/.test(root) ? '\\' : '/'
}

/** candidate 是否等于 root 或位于其下（按路径段比较，避免前缀误判） */
export function isInsideRoot(root: string, candidate: string): boolean {
  if (!root || !candidate) return false
  // Windows 盘符大小写不敏感（D: 与 d: 视为同一根），统一转小写后比较
  const normalizedRoot = normalizeForCompare(root).toLowerCase()
  const normalizedCandidate = normalizeForCompare(candidate).toLowerCase()
  if (normalizedRoot === normalizedCandidate) return true
  const prefix = normalizedRoot.endsWith('/') ? normalizedRoot : `${normalizedRoot}/`
  return normalizedCandidate.startsWith(prefix)
}

/**
 * 把相对路径解析为根目录下的绝对路径。
 * 拒绝空串、绝对路径（`/` 开头或 `X:` 开头）、以及含 `..` 段的输入。
 * 返回值为根目录与相对路径的简单拼接，fs 在 Windows 下也能正确处理正斜杠。
 */
export function resolveWithinRoot(root: string, relPath: string): string | null {
  if (!root || !relPath) return null

  const normalized = relPath.replace(/\\/g, '/')

  // 绝对路径：POSIX 的 `/...`、Windows 盘符 `X:...`、UNC 的 `//server/...`
  if (normalized.startsWith('/')) return null
  if (/^[A-Za-z]:/.test(normalized)) return null

  // 按段判断，避免把 ..foo 这类以两个点开头的合法名称误判为越界
  if (normalized.split('/').some((segment) => segment === '..')) return null

  const rootNormalized = normalizeForCompare(root)
  const segments = normalized.split('/').filter((segment) => segment !== '' && segment !== '.')
  const joined = segments.length > 0 ? `${rootNormalized}/${segments.join('/')}` : rootNormalized

  // 双保险：拼接结果仍必须位于根目录内
  if (!isInsideRoot(root, joined)) return null

  // 转换回平台分隔符（Windows 反斜杠，其他平台正斜杠）
  return joined.split('/').join(separatorFor(root))
}

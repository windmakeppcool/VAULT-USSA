/**
 * Node 25 默认启用 Web Storage，其内置的 `localStorage` 在未指定
 * `--localstorage-file` 时只返回一个没有任何方法的空对象。
 * vitest 2.x 的 happy-dom 环境为避免覆盖既有全局，会跳过 `localStorage`
 * （见 vitest 的 getWindowKeys 既有全局过滤逻辑），于是测试里拿到的是
 * Node 那个不可用的实现，`localStorage.clear()` 因此报错。
 *
 * 这里只在现有实现不可用时安装一个内存版 Storage；
 * 在 Node 20/22 等没有该内置全局的环境下，happy-dom 提供的实现会保留。
 */
class MemoryStorage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    const value = this.store.get(key)
    return value === undefined ? null : value
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

function installStorageIfBroken(name: 'localStorage' | 'sessionStorage'): void {
  const current = (globalThis as Record<string, unknown>)[name] as
    | { clear?: unknown; getItem?: unknown }
    | undefined
  if (typeof current?.clear === 'function' && typeof current?.getItem === 'function') return
  Object.defineProperty(globalThis, name, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
}

installStorageIfBroken('localStorage')
installStorageIfBroken('sessionStorage')

export {}

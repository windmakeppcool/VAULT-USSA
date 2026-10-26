import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { encodeStlPath, stlUrl, isInsideRoot, resolveWithinRoot } from '@/lib/path'

const ROOT = process.platform === 'win32' ? 'D:\\Models\\VAULT' : '/models/vault'

describe('路径编码', () => {
  it('逐段编码但保留分隔符', () => {
    expect(encodeStlPath('01. DRAWERS/S3 Box 1F.stl')).toBe('01.%20DRAWERS/S3%20Box%201F.stl')
  })

  it('编码中文与特殊字符', () => {
    expect(encodeStlPath('04. L² Families/a b.stl')).toBe('04.%20L%C2%B2%20Families/a%20b.stl')
  })

  it('不把分隔符编码成 %2F', () => {
    expect(encodeStlPath('a/b/c.stl')).not.toContain('%2F')
  })

  it('stlUrl 生成 app://stl/ 前缀', () => {
    expect(stlUrl('01. DRAWERS/x.stl')).toBe('app://stl/01.%20DRAWERS/x.stl')
  })
})

describe('根目录包含判定', () => {
  it('根目录内的文件返回 true', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, '01. DRAWERS', 'a.stl'))).toBe(true)
  })

  it('根目录自身返回 true', () => {
    expect(isInsideRoot(ROOT, ROOT)).toBe(true)
  })

  it('父目录返回 false', () => {
    expect(isInsideRoot(ROOT, path.dirname(ROOT))).toBe(false)
  })

  it('穿越到根目录之外返回 false', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, '..', 'secret.txt'))).toBe(false)
  })

  it('前缀相同时不误判（VAULT2 不是 VAULT 的子目录）', () => {
    const sibling = ROOT + '2'
    expect(isInsideRoot(ROOT, path.join(sibling, 'a.stl'))).toBe(false)
  })
})

describe('resolveWithinRoot', () => {
  it('合法相对路径解析为绝对路径', () => {
    const resolved = resolveWithinRoot(ROOT, '01. DRAWERS/a.stl')
    expect(resolved).toBe(path.join(ROOT, '01. DRAWERS', 'a.stl'))
  })

  it('含 .. 的路径返回 null', () => {
    expect(resolveWithinRoot(ROOT, '../secret.txt')).toBeNull()
  })

  it('绝对路径返回 null', () => {
    expect(resolveWithinRoot(ROOT, path.join(ROOT, 'a.stl'))).toBeNull()
  })

  it('空路径返回 null', () => {
    expect(resolveWithinRoot(ROOT, '')).toBeNull()
  })

  it('反斜杠穿越返回 null', () => {
    expect(resolveWithinRoot(ROOT, '..\\secret.txt')).toBeNull()
  })

  it('URL 编码的穿越在解码后被拒绝（与 protocol.ts 的调用顺序一致）', () => {
    // protocol.ts 先 decodeURIComponent 再交给 resolveWithinRoot
    const decoded = decodeURIComponent('%2e%2e%2fsecret.txt')
    expect(decoded).toBe('../secret.txt')
    expect(resolveWithinRoot(ROOT, decoded)).toBeNull()
  })
})

describe('以两个点开头的合法名称', () => {
  it('..foo 这类子目录不应被判为越界', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, '..foo', 'a.stl'))).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { crc32, zipDosStamp, buildLocalHeader, buildCentralHeader, buildEocd } from '@/lib/zip/crc32'

describe('CRC32', () => {
  it('空数据的校验值为 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it('"123456789" 的校验值为 0xCBF43926', () => {
    const bytes = new TextEncoder().encode('123456789')
    expect(crc32(bytes) >>> 0).toBe(0xcbf43926)
  })

  it('结果始终是无符号 32 位', () => {
    const bytes = new TextEncoder().encode('hello world')
    const value = crc32(bytes)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('DOS 时间戳', () => {
  it('2026-10-26 12:00:00 编码符合 ZIP 规范', () => {
    const stamp = zipDosStamp(new Date(2026, 9, 26, 12, 0, 0))
    expect(stamp.time).toBe((12 << 11) | (0 << 5) | 0)
    expect(stamp.date).toBe(((2026 - 1980) << 9) | ((9 + 1) << 5) | 26)
  })
})

describe('ZIP 头结构', () => {
  const name = new TextEncoder().encode('a/b.stl')
  const opts = { name, crc: 0x12345678, size: 100, offset: 0, stamp: zipDosStamp(new Date(2026, 9, 26)) }

  it('本地文件头签名为 0x04034b50', () => {
    const header = buildLocalHeader(opts)
    expect(new DataView(header.buffer).getUint32(0, true)).toBe(0x04034b50)
  })

  it('本地文件头长度为 30 字节加文件名长度', () => {
    expect(buildLocalHeader(opts)).toHaveLength(30 + name.length)
  })

  it('中央目录头签名为 0x02014b50', () => {
    const header = buildCentralHeader(opts)
    expect(new DataView(header.buffer).getUint32(0, true)).toBe(0x02014b50)
  })

  it('EOCD 签名为 0x06054b50 且长度为 22 字节', () => {
    const eocd = buildEocd({ count: 3, centralSize: 120, centralOffset: 500 })
    expect(eocd).toHaveLength(22)
    expect(new DataView(eocd.buffer).getUint32(0, true)).toBe(0x06054b50)
    expect(new DataView(eocd.buffer).getUint16(10, true)).toBe(3)
  })
})

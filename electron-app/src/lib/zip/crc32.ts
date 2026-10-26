/**
 * CRC32 与 ZIP 头构造（store 模式）。
 *
 * ZIP 采用不压缩的 store 模式：STL 数据已接近熵上限，压缩无收益，
 * 也省去 zlib 依赖。这里只负责计算校验值并生成三类头部：
 * 本地文件头、中央目录头、中央目录结束记录（EOCD）。
 */

/** 标准 CRC32 查找表，多项式 0xedb88320 */
const TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

/** 计算 CRC32：初值 0xffffffff，末尾异或，结果始终为无符号 32 位 */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** 把 Date 编码为 ZIP 的 DOS 时间戳（秒精度为 2 秒） */
export function zipDosStamp(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

export interface LocalHeaderOptions {
  name: Uint8Array
  crc: number
  size: number
  stamp: { time: number; date: number }
}

/** 本地文件头：30 字节固定字段 + 文件名 */
export function buildLocalHeader(o: LocalHeaderOptions): Uint8Array {
  const buf = new Uint8Array(30 + o.name.length)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true) // 解压所需版本
  view.setUint16(6, 0x0800, true) // UTF-8 文件名标志
  view.setUint16(8, 0, true) // store，不压缩
  view.setUint16(10, o.stamp.time, true)
  view.setUint16(12, o.stamp.date, true)
  view.setUint32(14, o.crc, true)
  view.setUint32(18, o.size, true)
  view.setUint32(22, o.size, true)
  view.setUint16(26, o.name.length, true)
  view.setUint16(28, 0, true)
  buf.set(o.name, 30)
  return buf
}

export interface CentralHeaderOptions extends LocalHeaderOptions {
  offset: number
}

/** 中央目录头：46 字节固定字段 + 文件名 */
export function buildCentralHeader(o: CentralHeaderOptions): Uint8Array {
  const buf = new Uint8Array(46 + o.name.length)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint16(8, 0x0800, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, o.stamp.time, true)
  view.setUint16(14, o.stamp.date, true)
  view.setUint32(16, o.crc, true)
  view.setUint32(20, o.size, true)
  view.setUint32(24, o.size, true)
  view.setUint16(28, o.name.length, true)
  view.setUint32(42, o.offset, true)
  buf.set(o.name, 46)
  return buf
}

export interface EocdOptions {
  count: number
  centralSize: number
  centralOffset: number
}

/** 中央目录结束记录：固定 22 字节（无注释） */
export function buildEocd(o: EocdOptions): Uint8Array {
  const buf = new Uint8Array(22)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, o.count, true)
  view.setUint16(10, o.count, true)
  view.setUint32(12, o.centralSize, true)
  view.setUint32(16, o.centralOffset, true)
  return buf
}

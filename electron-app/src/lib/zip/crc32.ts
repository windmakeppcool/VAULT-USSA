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
  /** 为 true 时强制写 ZIP64 extra；缺省按 offset 是否越过 4 GiB 自动判断 */
  zip64Offset?: boolean
}

/** 4 GiB 占位值：超过它的 32 位字段必须改写为它并附带 ZIP64 extra */
const U32_MAX = 0xffffffff

/**
 * 中央目录头：46 字节固定字段 + 文件名（+ 可选 12 字节 ZIP64 extra）。
 * 条目数不会超过 65535、单件大小也不会超过 4 GiB，因此只需要在
 * offset 越界时追加 ZIP64 extra。
 */
export function buildCentralHeader(o: CentralHeaderOptions): Uint8Array {
  const zip64 = o.zip64Offset ?? o.offset >= U32_MAX
  const buf = new Uint8Array(46 + o.name.length + (zip64 ? 12 : 0))
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, zip64 ? 45 : 20, true) // 支持 ZIP64 的版本
  view.setUint16(6, zip64 ? 45 : 20, true) // 解压所需版本
  view.setUint16(8, 0x0800, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, o.stamp.time, true)
  view.setUint16(14, o.stamp.date, true)
  view.setUint32(16, o.crc, true)
  view.setUint32(20, o.size, true)
  view.setUint32(24, o.size, true)
  view.setUint16(28, o.name.length, true)
  view.setUint16(30, zip64 ? 12 : 0, true) // extra field 长度
  view.setUint32(42, zip64 ? U32_MAX : o.offset, true)
  buf.set(o.name, 46)
  if (zip64) {
    // ZIP64 extra：ID=0x0001，数据长度 8，内容为 64 位本地头偏移
    const extraStart = 46 + o.name.length
    view.setUint16(extraStart, 0x0001, true)
    view.setUint16(extraStart + 2, 8, true)
    view.setBigUint64(extraStart + 4, BigInt(o.offset), true)
  }
  return buf
}

export interface EocdOptions {
  count: number
  centralSize: number
  centralOffset: number
  /** 为 true 时 32 位计数字段写满占位值，促使解压器改读 ZIP64 EOCD */
  zip64?: boolean
}

/** 中央目录结束记录：固定 22 字节（无注释） */
export function buildEocd(o: EocdOptions): Uint8Array {
  const buf = new Uint8Array(22)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x06054b50, true)
  if (o.zip64) {
    view.setUint16(8, 0xffff, true)
    view.setUint16(10, 0xffff, true)
    view.setUint32(12, U32_MAX, true)
    view.setUint32(16, U32_MAX, true)
  } else {
    view.setUint16(8, o.count, true)
    view.setUint16(10, o.count, true)
    view.setUint32(12, o.centralSize, true)
    view.setUint32(16, o.centralOffset, true)
  }
  return buf
}

export interface Zip64EocdOptions {
  /** 条目数 */
  count: number
  /** 中央目录字节数 */
  centralSize: number
  /** 中央目录起始偏移（64 位） */
  centralOffset: number
  /** ZIP64 EOCD record 自身的偏移 */
  zip64EocdOffset: number
}

/** ZIP64 中央目录结束记录：固定 56 字节 */
export function buildZip64Eocd(o: Zip64EocdOptions): Uint8Array {
  const buf = new Uint8Array(56)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x06064b50, true)
  view.setBigUint64(4, 44n, true) // 本记录剩余字节数（56 - 12）
  view.setUint16(12, 45, true) // version made by
  view.setUint16(14, 45, true) // version needed
  view.setUint32(16, 0, true) // 当前磁盘号
  view.setUint32(20, 0, true) // 中央目录起始磁盘号
  view.setBigUint64(24, BigInt(o.count), true)
  view.setBigUint64(32, BigInt(o.count), true)
  view.setBigUint64(40, BigInt(o.centralSize), true)
  view.setBigUint64(48, BigInt(o.centralOffset), true)
  return buf
}

/** ZIP64 EOCD locator：固定 20 字节，指向 ZIP64 EOCD record */
export function buildZip64Locator(zip64EocdOffset: number): Uint8Array {
  const buf = new Uint8Array(20)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x07064b50, true)
  view.setUint32(4, 0, true) // ZIP64 EOCD 所在磁盘
  view.setBigUint64(8, BigInt(zip64EocdOffset), true)
  view.setUint32(16, 1, true) // 总磁盘数
  return buf
}

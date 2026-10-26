import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBomStore } from '@/stores/bom'
import { VAULT_DATA } from '@/data/manifest'

describe('打印清单 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('初始为空', () => {
    const bom = useBomStore()
    expect(bom.items).toEqual([])
    expect(bom.fileCount).toBe(0)
    expect(bom.totalQty).toBe(0)
  })

  it('加入同一条目时累加份数而不是新增行', () => {
    const bom = useBomStore()
    bom.add('01. DRAWERS/a.stl', 'A', 2)
    bom.add('01. DRAWERS/a.stl', 'A', 3)
    expect(bom.items).toHaveLength(1)
    expect(bom.items[0].qty).toBe(5)
  })

  it('份数下限为 1', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.setQty('a.stl', 0)
    expect(bom.items[0].qty).toBe(1)
  })

  it('fileCount 统计文件数、totalQty 统计件数', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 2)
    bom.add('b.stl', 'B', 3)
    expect(bom.fileCount).toBe(2)
    expect(bom.totalQty).toBe(5)
  })

  it('progress 按完成项占比计算', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.add('b.stl', 'B', 1)
    expect(bom.progress).toBe(0)
    bom.toggleDone('a.stl')
    expect(bom.progress).toBe(50)
  })

  it('remove 删除指定条目', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.add('b.stl', 'B', 1)
    bom.remove('a.stl')
    expect(bom.items.map((i) => i.path)).toEqual(['b.stl'])
  })

  it('clear 清空全部', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 1)
    bom.clear()
    expect(bom.items).toHaveLength(0)
  })

  it('applyTemplate 用模板条目替换清单', () => {
    const bom = useBomStore()
    bom.add('old.stl', 'Old', 1)
    bom.applyTemplate({
      id: 'A01',
      name: '测试模板',
      why: '',
      depth: 3,
      width: 'L',
      roof: 'table',
      counts: { drawers: 1, modules: 1, cases: 0 },
      items: [
        { p: 'x.stl', q: 2, part: 'box', partName: '抽屉盒', color: 1, support: false, ref: 'm1' },
      ],
    })
    expect(bom.items).toHaveLength(1)
    expect(bom.items[0]).toMatchObject({ path: 'x.stl', qty: 2 })
  })

  it('状态写入 localStorage 后可恢复', () => {
    const bom = useBomStore()
    bom.add('a.stl', 'A', 4)
    const snapshot = localStorage.getItem(bom.storageKey)
    expect(snapshot).toBeTruthy()
    expect(JSON.parse(snapshot!).items[0].qty).toBe(4)
  })

  it('totalBytes 按份数累加清单体积', () => {
    const bom = useBomStore()
    const entry = VAULT_DATA.files[0]
    bom.add(entry.p, entry.n, 3)
    expect(bom.totalBytes).toBe(entry.s * 3)
  })

  it('新 key 不存在时从旧版 vault-ussat-config-v1 迁移清单', () => {
    localStorage.clear()
    localStorage.setItem('vault-ussat-config-v1', JSON.stringify({
      bom: [{ p: '01. DRAWERS/x.stl', q: 2, g: '抽屉', done: true }],
    }))
    setActivePinia(createPinia())
    const bom = useBomStore()
    expect(bom.items).toHaveLength(1)
    expect(bom.items[0]).toMatchObject({ path: '01. DRAWERS/x.stl', qty: 2, done: true })
  })
})

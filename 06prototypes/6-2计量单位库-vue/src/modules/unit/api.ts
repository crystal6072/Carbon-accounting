import { UNIT_MOCK } from './mock'
import type { UnitDraft, UnitItem, UnitStatus } from './types'

/**
 * 模拟接口层：数据驻留在内存中，接口签名与真实 REST 一致，
 * 接入后端时仅需替换本文件的实现。
 */

const delay = (ms = 260) => new Promise<void>((resolve) => setTimeout(resolve, ms))

let store: UnitItem[] = UNIT_MOCK.map((item) => ({ ...item }))
let seed = 100

const nextId = () => {
  seed += 1
  return `U9${seed}`
}

const now = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`
}

const CURRENT_USER = '张伟'

/** 同步读取当前全量数据（供表单唯一性校验复用） */
export const peekUnits = (): UnitItem[] => store

/** 列表查询 */
export const fetchUnitList = async (): Promise<UnitItem[]> => {
  await delay()
  return store.map((item) => ({ ...item }))
}

/** 详情 */
export const fetchUnitById = async (id: string): Promise<UnitItem | null> => {
  await delay(200)
  const found = store.find((item) => item.id === id)
  return found ? { ...found } : null
}

/** 新增 */
export const createUnit = async (draft: UnitDraft): Promise<UnitItem> => {
  await delay()
  const item: UnitItem = {
    id: nextId(),
    ...draft,
    baseUnitSymbol: draft.baseUnitId
      ? (store.find((u) => u.id === draft.baseUnitId)?.symbol ?? null)
      : null,
    createdBy: CURRENT_USER,
    createdAt: now(),
    updatedBy: CURRENT_USER,
    updatedAt: now(),
  }
  store = [item, ...store]
  return { ...item }
}

/** 编辑 */
export const updateUnit = async (id: string, draft: UnitDraft): Promise<UnitItem> => {
  await delay()
  store = store.map((item) =>
    item.id === id
      ? {
          ...item,
          ...draft,
          baseUnitSymbol: draft.baseUnitId
            ? (store.find((u) => u.id === draft.baseUnitId)?.symbol ?? null)
            : null,
          updatedBy: CURRENT_USER,
          updatedAt: now(),
        }
      : item,
  )
  const updated = store.find((item) => item.id === id)
  if (!updated) throw new Error('单位不存在或已被删除')
  return { ...updated }
}

/** 启用 / 禁用（单个或批量） */
export const updateUnitStatus = async (ids: string[], status: UnitStatus): Promise<string[]> => {
  await delay()
  const done: string[] = []
  store = store.map((item) => {
    if (ids.includes(item.id) && !item.isBase) {
      done.push(item.id)
      return { ...item, status, updatedBy: CURRENT_USER, updatedAt: now() }
    }
    return item
  })
  return done
}

/** 批量删除：基准单位受保护，返回实际删除条数 */
export const removeUnits = async (ids: string[]): Promise<string[]> => {
  await delay()
  const removable = store.filter((item) => ids.includes(item.id) && !item.isBase).map((i) => i.id)
  store = store.filter((item) => !removable.includes(item.id))
  return removable
}

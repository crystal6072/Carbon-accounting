import type { TagTone, TreeNodeData } from '@/shared/components'
import type { EnableStatus, IndustryItem, IndustryLevel } from '@/types'

/* ===================== 行业树（左树 + 右表，交互对齐「产品分类」） ===================== */

/** 行业树根节点 id（虚拟节点） */
export const INDUSTRY_ROOT_ID = 'all'
export const INDUSTRY_ROOT_NAME = '全部行业'

/** 行业层级：仅一级 / 二级 */
export const INDUSTRY_MAX_LEVEL: IndustryLevel = 2

export const levelText = (level: number) => ['', '一级行业', '二级行业'][level] ?? `${level} 级行业`

export const levelTone: Record<IndustryLevel, TagTone> = {
  1: 'info',
  2: 'default',
}

/* ===================== 使用状态（启用 / 禁用） ===================== */

export const useStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const useStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'default',
}

/* ===================== 排序与树构建 ===================== */

/** 排序号为空时排在同级末尾（排序号为选填） */
function sortBySortNo(items: IndustryItem[]): IndustryItem[] {
  return [...items].sort(
    (a, b) => (a.sortNo ?? Number.MAX_SAFE_INTEGER) - (b.sortNo ?? Number.MAX_SAFE_INTEGER),
  )
}

/** 由平铺列表构建「全部行业 → 一级 / 二级」树 */
export function buildIndustryTree(list: IndustryItem[]): TreeNodeData[] {
  const byParent = new Map<string, IndustryItem[]>()
  list.forEach((item) => {
    const key = item.parentId ?? INDUSTRY_ROOT_ID
    const arr = byParent.get(key) ?? []
    arr.push(item)
    byParent.set(key, arr)
  })

  const build = (parentKey: string): TreeNodeData[] =>
    sortBySortNo(byParent.get(parentKey) ?? []).map((item) => {
      const children = build(item.id)
      return {
        id: item.id,
        name: item.name,
        extra: children.length ? String(children.length) : undefined,
        children: children.length ? children : undefined,
      }
    })

  return [{ id: INDUSTRY_ROOT_ID, name: INDUSTRY_ROOT_NAME, children: build(INDUSTRY_ROOT_ID) }]
}

/** 取某节点下的直接子级（选中「全部行业」时 = 一级行业） */
export function getDirectChildren(list: IndustryItem[], parentId: string | null): IndustryItem[] {
  return sortBySortNo(list.filter((item) => item.parentId === parentId))
}

/** 收集某节点的所有子孙 id（用于编辑时禁止把上级选到自己或其后代） */
export function collectDescendantIds(list: IndustryItem[], id: string): string[] {
  const ids: string[] = []
  const walk = (parentId: string) => {
    list
      .filter((item) => item.parentId === parentId)
      .forEach((child) => {
        ids.push(child.id)
        walk(child.id)
      })
  }
  walk(id)
  return ids
}

/** 上级行业名称（一级行业展示 `-`） */
export function parentNameOf(list: IndustryItem[], parentId: string | null): string {
  if (!parentId) return '-'
  return list.find((item) => item.id === parentId)?.name ?? '-'
}

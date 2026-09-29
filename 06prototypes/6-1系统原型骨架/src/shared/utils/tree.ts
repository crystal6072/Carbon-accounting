import type { TreeNodeData } from '@/shared/components'
import type { CategoryItem } from '@/types'

/** 分类树根节点 id（虚拟节点） */
export const ROOT_ID = 'all'

function sortBySortNo(items: CategoryItem[]): CategoryItem[] {
  return [...items].sort(
    (a, b) => (a.sortNo ?? Number.MAX_SAFE_INTEGER) - (b.sortNo ?? Number.MAX_SAFE_INTEGER),
  )
}

/** 由平铺分类列表构建「全部分类 → 一/二/三级」树 */
export function buildCategoryTree(list: CategoryItem[]): TreeNodeData[] {
  const byParent = new Map<string, CategoryItem[]>()
  list.forEach((item) => {
    const key = item.parentId ?? ROOT_ID
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

  return [{ id: ROOT_ID, name: '全部分类', children: build(ROOT_ID) }]
}

/**
 * 取某节点下的直接子级。
 * 【待确认 §5 树表联动口径】当前 Demo 采用「选中节点 → 展示其直接子级」。
 */
export function getDirectChildren(list: CategoryItem[], parentId: string | null): CategoryItem[] {
  return sortBySortNo(list.filter((item) => item.parentId === parentId))
}

/** 收集某节点的所有子孙 id（用于编辑时禁止把上级选到自己或后代） */
export function collectDescendantIds(list: CategoryItem[], id: string): string[] {
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

/** 层级显示文案：1 → 一级分类 */
export function levelText(level: number): string {
  return ['', '一级分类', '二级分类', '三级分类'][level] ?? `${level} 级分类`
}

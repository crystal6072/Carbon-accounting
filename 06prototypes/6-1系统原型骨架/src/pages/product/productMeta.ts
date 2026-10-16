import type { TagTone } from '@/shared/components'
import type { FlowItemType, ProductUseStatus, TreeOption } from '@/types'

/** 递归过滤掉已禁用分类节点（K-06：产品信息库不展示已禁用分类） */
export function filterEnabledCategories(nodes: TreeOption[]): TreeOption[] {
  return nodes
    .filter((node) => !node.disabled)
    .map((node) => ({
      ...node,
      children: node.children ? filterEnabledCategories(node.children) : undefined,
    }))
}

/** 使用状态文案与色板（**产品级**） */
export const useStatusText: Record<ProductUseStatus, string> = {
  on: '上架',
  off: '下架',
}
export const useStatusTone: Record<ProductUseStatus, TagTone> = {
  on: 'success',
  off: 'default',
}

/** 投入产出项类型文案（与工序共用流类型枚举） */
export const flowTypeText: Record<FlowItemType, string> = {
  material: '原辅料',
  energy: '能源',
  resource: '自然资源输入',
  semi: '中间品',
  product: '产品',
  byproduct: '副产品',
  emission: '排放物',
}

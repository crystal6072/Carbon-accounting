import type { TagTone } from '@/shared/components'
import type { EnableStatus, MaterialType } from '@/types'

/**
 * 物料类型文案（**单一层级，不再分一 / 二级**，见《物料库功能批注》§1.2 / §1.5）：
 * 原辅料 / 中间产品 / 产品 / 副产品 / 废弃物/排放物 / 自然资源。
 * 与「数据字典 · 物料类型」字典项一一对应。
 */
export const materialTypeText: Record<MaterialType, string> = {
  raw_aux: '原辅料',
  semi: '中间产品',
  product: '产品',
  byproduct: '副产品',
  waste: '废弃物/排放物',
  natural: '自然资源',
}

export const materialTypeTone: Record<MaterialType, TagTone> = {
  raw_aux: 'info',
  semi: 'default',
  product: 'success',
  byproduct: 'default',
  waste: 'error',
  natural: 'info',
}

/** 物料类型固定顺序 */
export const materialTypeOrder: MaterialType[] = ['raw_aux', 'semi', 'product', 'byproduct', 'waste', 'natural']

/** 使用状态文案与色板（统一用「启用 / 禁用」，与计量单位库、工序一致；【待确认 Q03】） */
export const useStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const useStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'default',
}

/* ============ 行操作可用性 ============ */

/**
 * 删除入口可用性：**仅「已禁用」的物料可删除**（启用态按规范隐藏入口）。
 * 物料不设引用状态控制，编辑与启用 / 禁用对所有物料开放。
 */
export const canDeleteMaterial = (item: { status: EnableStatus }) => item.status === 'disabled'

/** 适用行业展示：空数组统一展示 `-` */
export const industriesText = (industries: string[]) => (industries.length > 0 ? industries.join('、') : '-')

import type { TagTone } from '@/shared/components'
import type { EnableStatus, MaterialFlowType, MaterialSubCategory } from '@/types'

/**
 * 物料类型（一级）文案：**与工序的投入产出流枚举（FlowItemType）同源**
 * 能源由能源库（A1-2）承载，故物料库不含「能源」。
 */
export const materialFlowTypeText: Record<MaterialFlowType, string> = {
  material: '原辅料',
  resource: '自然资源输入',
  semi: '中间品',
  product: '产品',
  byproduct: '副产品',
  emission: '排放物',
}

export const materialFlowTypeTone: Record<MaterialFlowType, TagTone> = {
  material: 'info',
  resource: 'info',
  semi: 'default',
  product: 'success',
  byproduct: 'default',
  emission: 'error',
}

/** 一级类型固定顺序：投入项（原辅料 / 自然资源输入）→ 产出项（中间品 / 产品 / 副产品 / 排放物） */
export const materialFlowTypeOrder: MaterialFlowType[] = [
  'material',
  'resource',
  'semi',
  'product',
  'byproduct',
  'emission',
]

/** 一级类型在工序侧的挂接位置（物料按此被工序的投入项 / 产出项选用） */
export const materialFlowTypeAttachText: Record<MaterialFlowType, string> = {
  material: '工序投入项 · 流类型 = 原辅料',
  resource: '工序投入项 · 流类型 = 自然资源输入',
  semi: '工序产出项 · 流类型 = 中间品',
  product: '工序产出项 · 流类型 = 产品',
  byproduct: '工序产出项 · 流类型 = 副产品',
  emission: '工序产出项 · 流类型 = 排放物',
}

/** 物料类型（二级 · 仅当一级 = 原辅料时维护） */
export const materialSubCategoryText: Record<MaterialSubCategory, string> = {
  raw: '原料',
  auxiliary: '辅料',
  packaging: '包装材料',
}

export const materialSubCategoryTip: Record<MaterialSubCategory, string> = {
  raw: '进入工序的原材料',
  auxiliary: '用量较小的辅助材料',
  packaging: '用于包装的材料',
}

export const materialSubCategoryOrder: MaterialSubCategory[] = ['raw', 'auxiliary', 'packaging']

/** 物料类型完整文案：`原辅料 · 原料`；非原辅料仅展示一级 */
export const materialTypeText = (item: {
  flowType: MaterialFlowType
  subCategory: MaterialSubCategory | null
}) =>
  item.subCategory
    ? `${materialFlowTypeText[item.flowType]} · ${materialSubCategoryText[item.subCategory]}`
    : materialFlowTypeText[item.flowType]

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

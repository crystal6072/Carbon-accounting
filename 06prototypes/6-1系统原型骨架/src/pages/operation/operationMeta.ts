import type { TagTone } from '@/shared/components'
import type { EmissionCategory, EnableStatus, FlowItemType, OperationType } from '@/types'

/** 工序类型文案与色板（主工序 / 辅助工序 / 处置工序，已确认 Q08） */
export const operationTypeText: Record<OperationType, string> = {
  main: '主工序',
  auxiliary: '辅助工序',
  disposal: '处置工序',
}

export const operationTypeTone: Record<OperationType, TagTone> = {
  main: 'info',
  auxiliary: 'default',
  disposal: 'warning',
}

/** 分组 / 排序固定顺序 */
export const operationTypeOrder: OperationType[] = ['main', 'auxiliary', 'disposal']

/** 使用状态文案与色板（启用 / 禁用） */
export const useStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const useStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'default',
}

/**
 * 流类型文案（产品库与工序共用枚举）
 * - 投入项：原辅料 / 能源 / 自然资源输入
 * - 产出项：中间品 / 产品 / 副产品 / 排放物
 */
export const flowTypeText: Record<FlowItemType, string> = {
  material: '原辅料',
  energy: '能源',
  resource: '自然资源输入',
  semi: '中间品',
  product: '产品',
  byproduct: '副产品',
  emission: '排放物',
}

export const flowTypeTone: Record<FlowItemType, TagTone> = {
  material: 'info',
  energy: 'warning',
  resource: 'info',
  semi: 'default',
  product: 'success',
  byproduct: 'default',
  emission: 'error',
}

/** 投入项可选流类型（D03） */
export const inputFlowTypes: FlowItemType[] = ['material', 'energy', 'resource']

/** 产出项可选流类型（D03） */
export const outputFlowTypes: FlowItemType[] = ['semi', 'product', 'byproduct', 'emission']

/** 排放物类别文案与顺序（仅流类型 = 排放物 时使用） */
export const emissionCategoryText: Record<EmissionCategory, string> = {
  gas: '废气',
  wastewater: '废水',
  residue: '废渣',
}

export const emissionCategoryOrder: EmissionCategory[] = ['gas', 'wastewater', 'residue']

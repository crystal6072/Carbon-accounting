import type { TagTone } from '@/shared/components'
import type { EnableStatus, EnergyType } from '@/types'

/**
 * 能源类型文案与色板：**粗粒度枚举（燃料 / 电力 / 热力）**，
 * 对齐《能源字段清单》§5.1 与业务 PRD §4.1（【待确认 Q01】推荐口径）；
 * 具体品名放「能源名称」，类型枚举内不再混入品名。
 */
export const energyTypeText: Record<EnergyType, string> = {
  fuel: '燃料',
  electricity: '电力',
  heat: '热力',
}

export const energyTypeTone: Record<EnergyType, TagTone> = {
  fuel: 'info',
  electricity: 'success',
  heat: 'warning',
}

/** 能源类型固定顺序：燃料 → 电力 → 热力 */
export const energyTypeOrder: EnergyType[] = ['fuel', 'electricity', 'heat']

/** 能源类型口径说明（表单辅助说明） */
export const energyTypeTip: Record<EnergyType, string> = {
  fuel: '通过燃烧释放能量的能源，如柴油 / 天然气 / 汽油 / 煤炭 / 生物质燃料',
  electricity: '电能，如外购电力 / 自发电',
  heat: '热能，如蒸汽 / 热水 / 外购热力',
}

/** 使用状态文案与色板（统一用「启用 / 禁用」，与物料库、工序一致；【待确认 Q03】） */
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
 * 删除入口可用性：**仅「已禁用」的能源可删除**（启用态按规范隐藏入口）。
 * 能源不设引用状态控制，编辑与启用 / 禁用对所有能源开放。
 */
export const canDeleteEnergy = (item: { status: EnableStatus }) => item.status === 'disabled'

/** 适用行业展示：空数组统一展示 `-` */
export const industriesText = (industries: string[]) => (industries.length > 0 ? industries.join('、') : '-')

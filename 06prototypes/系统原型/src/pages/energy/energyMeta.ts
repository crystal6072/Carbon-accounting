import type { TagTone } from '@/shared/components'
import type { EnableStatus, EnergyType } from '@/types'

/**
 * 能源类型文案与色板：**5 类枚举（电力 / 热力·蒸汽 / 化石燃料 / 生物质燃料 / 其他）**，
 * 对齐《能源库功能批注》§1.2；具体品名放「能源名称」，类型枚举内不再混入品名。
 */
export const energyTypeText: Record<EnergyType, string> = {
  electricity: '电力',
  heat: '热力/蒸汽',
  fossil: '化石燃料',
  biomass: '生物质燃料',
  other: '其他',
}

export const energyTypeTone: Record<EnergyType, TagTone> = {
  electricity: 'success',
  heat: 'warning',
  fossil: 'info',
  biomass: 'default',
  other: 'default',
}

/** 能源类型固定顺序：电力 → 热力/蒸汽 → 化石燃料 → 生物质燃料 → 其他 */
export const energyTypeOrder: EnergyType[] = ['electricity', 'heat', 'fossil', 'biomass', 'other']

/** 能源类型口径说明（表单辅助说明） */
export const energyTypeTip: Record<EnergyType, string> = {
  electricity: '电能，如外购电力 / 自发电',
  heat: '热能，如蒸汽 / 热水 / 外购热力',
  fossil: '化石来源燃料，如煤炭 / 天然气 / 柴油 / 汽油',
  biomass: '生物质燃料，如薪柴 / 秸秆 / 生物柴油 / 生物质颗粒',
  other: '无法归入上述类别的其他能源',
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

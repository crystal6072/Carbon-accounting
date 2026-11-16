import type { PcfBiocarbon } from '@/types'

/** 生物碳核算空值（参数与生物碳值均未填） */
export const EMPTY_BIOCARBON: PcfBiocarbon = {
  mass: null,
  carbonRate: null,
  moisture: null,
  life: null,
  incinerationRatio: null,
  sequestration: null,
  annualSequestration: null,
  release: null,
  netStorage: null,
}

/** 文本 → 数值（空串 / 非法值返回 null） */
export const toBiocarbonNumber = (text: string): number | null => {
  if (text.trim() === '') return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** 数值展示：最多 4 位小数，去掉末尾多余的 0 */
export const formatBiocarbon = (value: number | null, digits = 4): string => {
  if (value == null || !Number.isFinite(value)) return '-'
  const text = value.toFixed(digits).replace(/\.?0+$/, '')
  return text === '' || text === '-' ? '0' : text
}

export type BiocarbonValues = Pick<
  PcfBiocarbon,
  'sequestration' | 'annualSequestration' | 'release' | 'netStorage'
>

/** 生物碳净储量计算公式（弹窗与面板统一展示口径） */
export const BIOCARBON_NET_FORMULA = '生物碳净储量 = 初始碳固存 CS − 废弃焚烧释放 = CS × (1 − 焚烧比例%)'

/**
 * 按参数折算生物碳计算结果：
 * - 初始碳固存 CS = 44/12 × cf × M ÷ (100 + ω) × 100（kgCO₂e）；
 * - 年均持续固存 = CS ÷ 产品设计寿命（kgCO₂e/年）；
 * - 废弃焚烧释放 = CS × 焚烧比例%（kgCO₂e；未填焚烧比例按 0 计）；
 * - 生物碳净储量 = CS − 废弃焚烧释放（kgCO₂e）。
 * 参数不完整时对应结果返回 null（界面展示「-」）。
 */
export function calcBiocarbonValues(value: PcfBiocarbon): BiocarbonValues {
  const { mass, carbonRate, moisture, life, incinerationRatio } = value
  const hasMass = mass != null && Number.isFinite(mass) && mass > 0
  const cs =
    hasMass && carbonRate != null && Number.isFinite(carbonRate) && moisture != null && Number.isFinite(moisture)
      ? ((44 / 12) * carbonRate * mass * 100) / (100 + moisture)
      : null
  const annual = cs != null && life != null && Number.isFinite(life) && life > 0 ? cs / life : null
  const release =
    cs != null && incinerationRatio != null && Number.isFinite(incinerationRatio)
      ? cs * (incinerationRatio / 100)
      : null
  const netStorage = cs != null ? cs - (release ?? 0) : null
  return { sequestration: cs, annualSequestration: annual, release, netStorage }
}

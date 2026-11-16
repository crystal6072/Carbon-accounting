import type { PcfCaliberKey } from '@/types'
import type {
  DqrLevel,
  DqrLevelDistribution,
  ItemDistributionRow,
  PedigreeScore,
  PedigreeScoreKey,
  QualityAssessmentItem,
  QualityResult,
  QualityStatus,
} from '@/types/quality'

/** 评价状态文案（字段清单 §8.1） */
export const QUALITY_STATUS_TEXT: Record<QualityStatus, string> = {
  unfinished: '未完成',
  stale: '待更新',
  completed: '已完成',
}

/** 评价状态 Tag 主题色 */
export const QUALITY_STATUS_THEME: Record<QualityStatus, 'default' | 'warning' | 'success'> = {
  unfinished: 'default',
  stale: 'warning',
  completed: 'success',
}

/**
 * DQR 分档阈值（业务 PRD §9 Q1，原型可配置），仅内部派生、界面不展示等级。
 * 五档区间：[1.0,1.5) / [1.5,2.0) / [2.0,3.0) / [3.0,4.0) / [4.0,5.0]
 */
export function dqrLevelOf(dqr: number): DqrLevel {
  if (dqr < 1.5) return 'excellent'
  if (dqr < 2.0) return 'good'
  if (dqr < 3.0) return 'fair'
  if (dqr < 4.0) return 'poor'
  return 'veryPoor'
}

/** DQR 分值格式化（保留 1 位小数） */
export function formatDqr(dqr: number | null | undefined): string {
  if (dqr == null) return '-'
  return dqr.toFixed(1)
}

/**
 * 口径拆分比例（相对总量；原型演示口径，工程上应来自核算结果分口径明细）。
 * 编辑模式写回与查看模式派生共用，避免页面与 mock 各写一套。
 */
export const CALIBER_EMISSION_RATIO: Record<PcfCaliberKey, number> = {
  total: 1,
  fossil: 0.7,
  biogenic: 0.22,
  luluc: 0.08,
}

/** 把某口径下的排放量换算到目标口径：先还原到总量基准，再按目标比例缩放 */
export function convertCaliberEmission(emission: number, from: PcfCaliberKey, to: PcfCaliberKey): number {
  const fromRatio = CALIBER_EMISSION_RATIO[from] ?? 1
  const toRatio = CALIBER_EMISSION_RATIO[to] ?? 1
  if (!emission || fromRatio === toRatio) return emission
  return Math.round((emission / fromRatio) * toRatio * 1000) / 1000
}

/** 单数据项 DQR = 三项算术平均（业务 PRD §6.2 Q01） */
export function dqrOf(score: PedigreeScore): number {
  const sum = PEDIGREE_KEYS.reduce((acc, key) => acc + score[key], 0)
  return Math.round((sum / PEDIGREE_KEYS.length) * 10) / 10
}

/**
 * 谱系矩阵三项定义（口径与竞品一致：时间代表性 TiR / 技术代表性 TeR / 地理代表性 GeR）。
 * 顺序即界面展示顺序，key 与 `PedigreeScore` 字段一一对应。
 * `rubric` 为每个维度 1–5 分的逐级判定标准（竞品原文口径），评分矩阵常驻展示。
 * 完整性 C 已移出定量评分，定性覆盖范围中的「完整性」描述仍保留在步骤①。
 */
export const PEDIGREE_DIMS: Array<{
  key: PedigreeScoreKey
  label: string
  rubric: [string, string, string, string, string]
}> = [
  {
    key: 'temporal',
    label: '时间代表性 TiR',
    rubric: [
      '产品碳足迹的基准年在数据集有效期内；产品碳足迹的基准年与数据集最新发布年/基准年相差≤3年',
      '产品碳足迹的基准年与数据集有效期相差<2年；产品碳足迹的基准年与数据集最新发布年/基准年相差≤4年',
      '产品碳足迹的基准年与数据集有效期相差≤3年；产品碳足迹的基准年与数据集最新发布年/基准年相差≤5年',
      '产品碳足迹的基准年与数据集有效期相差≤4年；产品碳足迹的基准年与数据集最新发布年/基准年相差≤6年',
      '产品碳足迹的基准年与数据集有效期相差>4年；产品碳足迹的基准年与数据集最新发布年/基准年相差>6年',
    ],
  },
  {
    key: 'technological',
    label: '技术代表性 TeR',
    rubric: [
      '核算过程技术与数据集代表的技术一致',
      '核算过程技术包含在数据集组合技术中，但在生产工艺上存在一定差异',
      '核算过程技术包含在数据集组合技术中，但在生产工艺上差异显著',
      '核算过程技术与数据集代表的技术相似',
      '核算过程技术与数据集代表的技术不同',
    ],
  },
  {
    key: 'geographical',
    label: '地理代表性 GeR',
    rubric: [
      '核算过程在数据集代表的国家省市或区域内，如中国华东、中国华南等',
      '核算过程在数据集代表的国家',
      '核算过程在数据集代表的地理区域之一，如代表全球平均的数据集',
      '核算过程与数据集所代表的地理区域在能源结构上相似',
      '核算过程不满足上述情况',
    ],
  },
]

/** 三项键集合（顺序与 PEDIGREE_DIMS 一致） */
export const PEDIGREE_KEYS: PedigreeScoreKey[] = PEDIGREE_DIMS.map((dim) => dim.key)

/** 从完整评分中提取纯维度分值（剔除 scoreSource），用于单项重新评分 */
export function pickDims(score: Omit<PedigreeScore, 'scoreSource'>): Omit<PedigreeScore, 'scoreSource'> {
  const dims = {} as Omit<PedigreeScore, 'scoreSource'>
  PEDIGREE_KEYS.forEach((key) => {
    dims[key] = score[key]
  })
  return dims
}

/** 三项默认分值（用于单项首次评分时的基线） */
export function defaultDims(value = 3): Omit<PedigreeScore, 'scoreSource'> {
  const dims = {} as Omit<PedigreeScore, 'scoreSource'>
  PEDIGREE_KEYS.forEach((key) => {
    dims[key] = value
  })
  return dims
}

/** 空等级分布 */
export function emptyLevelDistribution(): DqrLevelDistribution {
  return { excellent: 0, good: 0, fair: 0, poor: 0, veryPoor: 0 }
}

/**
 * 由评价数据项派生评价结果（业务 PRD §6.2 / §6.5）。
 * - 整体 DQR：按贡献率加权平均；总贡献为 0 时退化为算术平均。
 * - 分布：等级 / 阶段（贡献率加权）/ 数据项（DQR 降序）/ 类别（活动数据 vs 因子）。
 */
export function computeResult(items: QualityAssessmentItem[]): QualityResult {
  const scored = items.filter((item) => item.score && item.dqr != null)

  if (scored.length === 0) {
    return {
      overallDqr: null,
      overallLevel: null,
      levelDistribution: emptyLevelDistribution(),
      stageDistribution: [],
      itemDistribution: [],
      categoryDistribution: { activity: { dqr: null, count: 0 }, factor: { dqr: null, count: 0 } },
      conclusion: '',
      generatedAt: null,
    }
  }

  const totalContribution = scored.reduce((acc, item) => acc + (item.contribution || 0), 0)
  const useWeighted = totalContribution > 0

  const overallDqr = useWeighted
    ? Math.round(
        (scored.reduce((acc, item) => acc + (item.dqr ?? 0) * (item.contribution || 0), 0) / totalContribution) * 10,
      ) / 10
    : Math.round((scored.reduce((acc, item) => acc + (item.dqr ?? 0), 0) / scored.length) * 10) / 10

  const levelDistribution = emptyLevelDistribution()
  scored.forEach((item) => {
    if (item.level) levelDistribution[item.level] += 1
  })

  /* 按阶段分布（贡献率加权） */
  const stageMap = new Map<string, { dqrSum: number; contribution: number; itemCount: number }>()
  scored.forEach((item) => {
    const cur = stageMap.get(item.stage) ?? { dqrSum: 0, contribution: 0, itemCount: 0 }
    cur.dqrSum += (item.dqr ?? 0) * (item.contribution || 0)
    cur.contribution += item.contribution || 0
    cur.itemCount += 1
    stageMap.set(item.stage, cur)
  })
  const stageDistribution = Array.from(stageMap.entries()).map(([stage, v]) => ({
    stage,
    dqr: v.contribution > 0 ? Math.round((v.dqrSum / v.contribution) * 10) / 10 : 0,
    level: v.contribution > 0 ? dqrLevelOf(v.dqrSum / v.contribution) : ('fair' as DqrLevel),
    contribution: Math.round(v.contribution * 10) / 10,
    itemCount: v.itemCount,
  }))

  /* 按数据项分布（DQR 降序） */
  const itemDistribution: ItemDistributionRow[] = scored
    .map((item) => ({
      dataItemId: item.dataItemId,
      name: item.name,
      dqr: item.dqr ?? 0,
      level: item.level ?? 'fair',
      contribution: Math.round((item.contribution || 0) * 10) / 10,
    }))
    .sort((a, b) => b.dqr - a.dqr)

  /* 按类别分布：活动数据（含因子）整体 DQR 均值（本期单套评分，拆分类别为演示口径） */
  const withFactor = scored.filter((item) => item.factorName)
  const categoryDistribution = {
    activity: {
      dqr:
        scored.length > 0
          ? Math.round((scored.reduce((acc, item) => acc + (item.dqr ?? 0), 0) / scored.length) * 10) / 10
          : null,
      count: scored.length,
    },
    factor: {
      dqr:
        withFactor.length > 0
          ? Math.round((withFactor.reduce((acc, item) => acc + (item.dqr ?? 0), 0) / withFactor.length) * 10) / 10
          : null,
      count: withFactor.length,
    },
  }

  const overallLevel = dqrLevelOf(overallDqr)
  const conclusion = buildDefaultConclusion(overallDqr, itemDistribution)

  return {
    overallDqr,
    overallLevel,
    levelDistribution,
    stageDistribution,
    itemDistribution,
    categoryDistribution,
    conclusion,
    generatedAt: formatNow(),
  }
}

/** 默认结论文案（字段清单 §6）：呈现 DQR 数值与主要贡献数据项 */
function buildDefaultConclusion(overallDqr: number, rows: ItemDistributionRow[]): string {
  const top = rows.reduce<ItemDistributionRow | null>(
    (max, row) => (!max || row.contribution > max.contribution ? row : max),
    null,
  )
  if (top) {
    return `数据质量整体 DQR ${overallDqr.toFixed(1)}，主要贡献数据项为「${top.name}」（贡献率 ${top.contribution}%）。`
  }
  return `数据质量整体 DQR ${overallDqr.toFixed(1)}。`
}

export function formatNow(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}:${pad(now.getSeconds())}`
}

export function formatDateOnly(date: number): string {
  const d = new Date(date)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

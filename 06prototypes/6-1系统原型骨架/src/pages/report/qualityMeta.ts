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

/** DQR 等级文案（字段清单 §8.2） */
export const DQR_LEVEL_TEXT: Record<DqrLevel, string> = {
  excellent: '优',
  good: '良',
  fair: '中',
  poor: '差',
  veryPoor: '极差',
}

/** DQR 等级 Tag 主题色 */
export const DQR_LEVEL_THEME: Record<DqrLevel, 'success' | 'success' | 'warning' | 'warning' | 'danger'> = {
  excellent: 'success',
  good: 'success',
  fair: 'warning',
  poor: 'warning',
  veryPoor: 'danger',
}

/**
 * DQR 等级阈值（业务 PRD §9 Q1，原型可配置）。
 * 优 [1.0,1.5) / 良 [1.5,2.0) / 中 [2.0,3.0) / 差 [3.0,4.0) / 极差 [4.0,5.0]
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

/** 不确定度格式化（保留 1 位小数 + %） */
export function formatUncertainty(value: number | null | undefined): string {
  if (value == null) return '-'
  return `±${value.toFixed(1)}%`
}

/** 单数据项 DQR = 十维算术平均（业务 PRD §6.2 Q01） */
export function dqrOf(score: PedigreeScore): number {
  const sum = PEDIGREE_KEYS.reduce((acc, key) => acc + score[key], 0)
  return Math.round((sum / PEDIGREE_KEYS.length) * 10) / 10
}

/**
 * 谱系不确定度系数表（业务 PRD §9 Q2，原型可配置）：分数 → 相对不确定度（%）。
 * 1 分=3% / 2 分=8% / 3 分=15% / 4 分=30% / 5 分=60%（ILCD/ecoinvent 谱系矩阵工程近似）。
 */
const UNCERTAINTY_BY_SCORE: Record<number, number> = {
  1: 3,
  2: 8,
  3: 15,
  4: 30,
  5: 60,
}

/** 单数据项相对不确定度 = sqrt(Σ u_dim²)（业务 PRD §6.3 Q02） */
export function uncertaintyOf(score: PedigreeScore): number {
  const squared = PEDIGREE_KEYS.reduce((acc, key) => acc + (UNCERTAINTY_BY_SCORE[score[key]] ?? 15) ** 2, 0)
  return Math.round(Math.sqrt(squared) * 10) / 10
}

/**
 * 谱系矩阵十维定义（数据质量定量评价指标维度 a~j）。
 * 顺序即界面展示顺序，key 与 `PedigreeScore` 字段一一对应。
 */
export const PEDIGREE_DIMS: Array<{
  key: PedigreeScoreKey
  label: string
  tips: string
}> = [
  {
    key: 'temporal',
    label: '时间覆盖范围',
    tips: 'a) 数据的年份和所收集数据的最小时间长度（1 与核算期一致/最新 → 5 相差 > 15 年）',
  },
  {
    key: 'geographical',
    label: '地理覆盖范围',
    tips: 'b) 为产品碳足迹研究目的所收集的单元过程数据的地理位置（1 一致 → 5 完全不同）',
  },
  {
    key: 'technological',
    label: '技术覆盖范围',
    tips: 'c) 具体的技术或技术组合（1 完全一致 → 5 完全不同）',
  },
  { key: 'precision', label: '精度', tips: 'd) 对每个数据值可变性的度量（例如方差）（1 实测低方差 → 5 估计高方差）' },
  { key: 'completeness', label: '完整性', tips: 'e) 测量或测算的流所占的比例（1 充分覆盖 → 5 严重不足）' },
  {
    key: 'representativeness',
    label: '代表性',
    tips: 'f) 反映实际关注人群对数据集（时间/地理/技术覆盖等）关注程度的真实情况（1 高度代表 → 5 不代表）',
  },
  {
    key: 'consistency',
    label: '一致性',
    tips: 'g) 研究方法学能否在敏感性分析的不同组成部分中统一应用（1 完全统一 → 5 不统一）',
  },
  {
    key: 'reproducibility',
    label: '再现性',
    tips: 'h) 其他独立从业人员采用同一方法学和数值信息重现相同研究结果的程度（1 可重现 → 5 不可重现）',
  },
  { key: 'dataSource', label: '数据来源', tips: 'i) 数据来源的可靠性与获取方式（1 实测/一次数据 → 5 无来源估计）' },
  {
    key: 'informationUncertainty',
    label: '信息不确定性',
    tips: 'j) 信息本身的不确定性程度（1 低 → 5 高）',
  },
]

/** 谱系十维键集合（顺序与 PEDIGREE_DIMS 一致） */
export const PEDIGREE_KEYS: PedigreeScoreKey[] = PEDIGREE_DIMS.map((dim) => dim.key)

/** 从完整评分中提取纯维度分值（剔除 scoreSource），用于单项重新评分 */
export function pickDims(score: Omit<PedigreeScore, 'scoreSource'>): Omit<PedigreeScore, 'scoreSource'> {
  const dims = {} as Omit<PedigreeScore, 'scoreSource'>
  PEDIGREE_KEYS.forEach((key) => {
    dims[key] = score[key]
  })
  return dims
}

/** 十维默认分值（用于单项首次评分时的基线） */
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
 * 由评价数据项派生评价结果（业务 PRD §6.2 / §6.3 / §6.5）。
 * - 整体 DQR：按贡献率加权平均；总贡献为 0 时退化为算术平均。
 * - 整体不确定度：贡献率平方和开方传播。
 * - 分布：等级 / 阶段（贡献率加权）/ 数据项（DQR 降序）/ 类别（活动数据 vs 因子）。
 * - 关键来源：按 贡献率 × 不确定度 降序取 Top3。
 */
export function computeResult(items: QualityAssessmentItem[]): QualityResult {
  const scored = items.filter((item) => item.score && item.dqr != null)

  if (scored.length === 0) {
    return {
      overallDqr: null,
      overallLevel: null,
      overallUncertainty: null,
      levelDistribution: emptyLevelDistribution(),
      stageDistribution: [],
      itemDistribution: [],
      categoryDistribution: { activity: { dqr: null, count: 0 }, factor: { dqr: null, count: 0 } },
      keySources: [],
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

  const overallUncertainty = useWeighted
    ? Math.round(
        Math.sqrt(
          scored.reduce((acc, item) => acc + ((item.contribution || 0) * (item.uncertainty ?? 0)) ** 2, 0),
        ) * 10,
      ) / 10
    : Math.round(
        Math.sqrt(scored.reduce((acc, item) => acc + (item.uncertainty ?? 0) ** 2, 0) / scored.length) * 10,
      ) / 10

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
      uncertainty: item.uncertainty ?? 0,
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

  /* 关键不确定度来源：贡献率 × 不确定度 降序 Top3 */
  const keySources = itemDistribution
    .map((row) => ({ ...row, weight: row.contribution * row.uncertainty }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ weight: _w, ...rest }) => rest)

  const conclusion = buildDefaultConclusion(overallDqr, overallLevel, keySources)

  return {
    overallDqr,
    overallLevel,
    overallUncertainty,
    levelDistribution,
    stageDistribution,
    itemDistribution,
    categoryDistribution,
    keySources,
    conclusion,
    generatedAt: formatNow(),
  }
}

/** 默认结论文案（字段清单 §6） */
function buildDefaultConclusion(
  overallDqr: number,
  level: DqrLevel | null,
  keySources: ItemDistributionRow[],
): string {
  const top = keySources[0]
  if (top) {
    return `数据质量整体为「${level ? DQR_LEVEL_TEXT[level] : '-'}」（DQR ${overallDqr.toFixed(1)}），不确定度主要来自「${top.name}」（贡献率 ${top.contribution}%、不确定度 ±${top.uncertainty}%）。`
  }
  return `数据质量整体为「${level ? DQR_LEVEL_TEXT[level] : '-'}」（DQR ${overallDqr.toFixed(1)}）。`
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

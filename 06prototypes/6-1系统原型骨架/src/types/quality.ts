import type { PcfCaliberKey, PcfDataItemDirection, PcfDataItemType, PcfEmissionType } from './index'

/**
 * 数据质量评价（报告管理）类型定义。
 * 字段口径见《数据质量评价字段清单》（`02prd/02-2前台业务功能/06报告管理/数据质量评价字段清单.md`），
 * 业务规则见《数据质量评价业务PRD》R-083 ~ R-100。
 *
 * 结构：数据质量评价 1 ── 1 定性覆盖范围（时间 / 地理 / 技术 / 完整性 / 代表性 / 一致性 / 再现性 / 数据来源 / 信息的不确定性）
 *                      └── N 评价数据项（复制核算项目阶段数据项）── 1 谱系评分（四项 1–5）
 *                      └── 1 评价结果（整体 DQR + 等级 + 不确定度 + 分布）
 */

/** 评价状态（字段清单 §8.1） */
export type QualityStatus = 'unfinished' | 'stale' | 'completed'

/** DQR 等级（字段清单 §8.2） */
export type DqrLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'veryPoor'

/** 评分来源（字段清单 §8.4） */
export type ScoreSource = 'manual' | 'batch'

/**
 * 谱系评分（四项，每维 1–5，1 最优），口径与竞品一致（TiR / TeR / GeR / C）：
 * a 时间代表性 TiR / b 技术代表性 TeR / c 地理代表性 GeR / d 完整性 C。
 */
export interface PedigreeScore {
  /** a) 时间代表性 TiR：基准年 / 有效期与数据集年份的相差程度 */
  temporal: number
  /** b) 技术代表性 TeR：核算过程技术与数据集代表技术的一致性 */
  technological: number
  /** c) 地理代表性 GeR：核算地域与数据集代表地理范围的一致性 */
  geographical: number
  /** d) 完整性 C：核算过程所需数据的覆盖程度 */
  completeness: number
  /** 评分来源（手工 / 批量） */
  scoreSource: ScoreSource
}

/** 谱系评分维度键（不含评分来源） */
export type PedigreeScoreKey = Exclude<keyof PedigreeScore, 'scoreSource'>

/** 评价数据项（字段清单 §4）：创建评价时复制核算项目阶段数据项 */
export interface QualityAssessmentItem {
  dataItemId: string
  /** 数据项名称（界面「数据名称」） */
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  direction: PcfDataItemDirection
  /** 数量（只读） */
  quantity: number | null
  unit: string
  /** 所属一级阶段（分布用） */
  stage: string
  /** 最末级阶段路径（界面「生命周期二级阶段」列） */
  stagePath: string
  /** 匹配因子名称 */
  factorName: string
  factorValue: number | null
  factorUnit: string
  /** 背景数据来源（库 + 版本 + 名称） */
  factorSource: string
  /** 是否有数据凭证 */
  hasVoucher: boolean
  /** 数据获取方式（可选，依赖核算项目字段是否落地；见业务 PRD §9 Q5） */
  dataSource: string
  /** 该数据项排放量（来自核算结果明细） */
  emission: number
  /** 贡献率（%） */
  contribution: number
  /** 四项谱系评分（未评分 = null） */
  score: PedigreeScore | null
  /** 数据项 DQR 分值（派生） */
  dqr: number | null
  /** 数据项 DQR 等级（派生） */
  level: DqrLevel | null
  /** 相对不确定度（%，派生） */
  uncertainty: number | null
}

/** 定性覆盖范围（字段清单 §3），共 9 个定性维度 */
export interface QualitativeCoverage {
  /** 时间覆盖范围 */
  temporalCoverage: string
  /** 地理覆盖范围 */
  geographicalCoverage: string
  /** 技术覆盖范围 */
  technologicalCoverage: string
  /** 完整性 */
  completeness: string
  /** 代表性 */
  representativeness: string
  /** 一致性 */
  consistency: string
  /** 再现性 */
  reproducibility: string
  /** 数据来源 */
  dataSource: string
  /** 信息的不确定性 */
  informationUncertainty: string
  /** 是否已确认（步骤① → ②） */
  confirmed: boolean
  confirmedBy: string | null
  confirmedAt: string | null
}

/** 定性覆盖范围可编辑文本（步骤① 表单字段，剔除确认元信息） */
export type QualitativeTexts = Omit<QualitativeCoverage, 'confirmed' | 'confirmedBy' | 'confirmedAt'>

/** DQR 等级分布（评价结果 §6） */
export interface DqrLevelDistribution {
  excellent: number
  good: number
  fair: number
  poor: number
  veryPoor: number
}

/** 按阶段分布行 */
export interface StageDistributionRow {
  stage: string
  dqr: number
  level: DqrLevel
  contribution: number
  itemCount: number
}

/** 按数据项分布行（DQR 降序） */
export interface ItemDistributionRow {
  dataItemId: string
  name: string
  dqr: number
  level: DqrLevel
  contribution: number
  uncertainty: number
}

/** 评价结果（字段清单 §6） */
export interface QualityResult {
  overallDqr: number | null
  overallLevel: DqrLevel | null
  overallUncertainty: number | null
  levelDistribution: DqrLevelDistribution
  stageDistribution: StageDistributionRow[]
  itemDistribution: ItemDistributionRow[]
  categoryDistribution: {
    activity: { dqr: number | null; count: number }
    factor: { dqr: number | null; count: number }
  }
  /** 关键不确定度来源（TopN，按贡献率 × 不确定度） */
  keySources: ItemDistributionRow[]
  /** 结论文案（可编辑、选填） */
  conclusion: string
  generatedAt: string | null
}

/** 数据质量评价（主对象，字段清单 §2） */
export interface QualityAssessment {
  id: string
  /** 评价编号 `PCF-DQ-YYYYMMDDNNN` */
  assessmentNo: string
  sourceProjectId: string
  sourceProjectName: string
  sourceProjectNo: string
  sourceDeleted: boolean
  productName: string
  productSpec: string
  /** 系统边界（展示文本） */
  systemBoundary: string
  /** 声明 / 功能单位 */
  functionalUnit: string
  statisticalPeriod: string
  /** 影响评价方法（如 `IPCC 2021`） */
  lciaMethod: string
  /** 基准结果是否含 GWP 分项（决定口径切换控件是否可用） */
  hasGwpSplit: boolean
  /** 基准锁定的核算结果版本 */
  baselineVersion: number
  baselineEmission: number
  baselineCalculatedAt: string
  /** 当前口径（带出，不参与 DQR 计算） */
  caliber: PcfCaliberKey
  status: QualityStatus
  itemCount: number
  overallDqr: number | null
  overallLevel: DqrLevel | null
  overallUncertainty: number | null
  resultUpdatedAt: string
  qualitative: QualitativeCoverage
  items: QualityAssessmentItem[]
  result: QualityResult
  createdAt: string
  createdBy: string
}

/** 新增弹窗候选项目（字段清单 §2 来源核算项目投影） */
export interface QualityProjectOption {
  id: string
  name: string
  code: string
  productName: string
  productSpec: string
  boundary: string
  functionalUnit: string
  statisticalPeriod: string
  baselineEmission: number
  baselineVersion: number
  baselineCalculatedAt: string
  hasGwpSplit: boolean
  items: QualityAssessmentItem[]
}

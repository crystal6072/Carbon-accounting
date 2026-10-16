import type { PcfCaliberKey, PcfDataItemDirection, PcfDataItemType, PcfEmissionType } from './index'

/**
 * 数据质量评价（报告管理）类型定义。
 * 字段口径见《数据质量评价字段清单》（`02prd/02-2前台业务功能/06报告管理/数据质量评价字段清单.md`），
 * 业务规则见《数据质量评价业务PRD》R-083 ~ R-100。
 *
 * 结构：数据质量评价 1 ── 1 定性覆盖范围（时间 / 地理 / 技术）
 *                      └── N 评价数据项（复制核算项目阶段数据项）── 1 谱系评分（十维 1–5）
 *                      └── 1 评价结果（整体 DQR + 等级 + 不确定度 + 分布）
 */

/** 评价状态（字段清单 §8.1） */
export type QualityStatus = 'unfinished' | 'stale' | 'completed'

/** DQR 等级（字段清单 §8.2） */
export type DqrLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'veryPoor'

/** 评分来源（字段清单 §8.4） */
export type ScoreSource = 'manual' | 'batch'

/**
 * 谱系评分（十维，每维 1–5，1 最优）。
 * 维度口径（对应数据质量定量评价指标维度 a~j）：
 * a 时间覆盖范围 / b 地理覆盖范围 / c 技术覆盖范围 / d 精度 / e 完整性 /
 * f 代表性 / g 一致性 / h 再现性 / i 数据来源 / j 信息的不确定性。
 */
export interface PedigreeScore {
  /** a) 时间覆盖范围：数据年份与所收集数据的最小时间长度 */
  temporal: number
  /** b) 地理覆盖范围：单元过程数据的地理位置 */
  geographical: number
  /** c) 技术覆盖范围：具体的技术或技术组合 */
  technological: number
  /** d) 精度：对每个数据值可变性的度量（例如方差） */
  precision: number
  /** e) 完整性：测量或测算的流所占的比例 */
  completeness: number
  /** f) 代表性：对实际关注人群（时间/地理/技术覆盖等）关注程度的真实情况 */
  representativeness: number
  /** g) 一致性：研究方法学能否在敏感性分析不同组成部分中统一应用 */
  consistency: number
  /** h) 再现性：其他独立从业人员用同一方法学和数值信息重现相同研究结果的程度 */
  reproducibility: number
  /** i) 数据来源 */
  dataSource: number
  /** j) 信息的不确定性 */
  informationUncertainty: number
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
  /** 十维评分（未评分 = null） */
  score: PedigreeScore | null
  /** 数据项 DQR 分值（派生） */
  dqr: number | null
  /** 数据项 DQR 等级（派生） */
  level: DqrLevel | null
  /** 相对不确定度（%，派生） */
  uncertainty: number | null
}

/** 定性覆盖范围（字段清单 §3） */
export interface QualitativeCoverage {
  /** 时间覆盖范围 */
  temporalCoverage: string
  /** 地理覆盖范围 */
  geographicalCoverage: string
  /** 技术覆盖范围 */
  technologicalCoverage: string
  /** 是否已确认（步骤① → ②） */
  confirmed: boolean
  confirmedBy: string | null
  confirmedAt: string | null
}

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

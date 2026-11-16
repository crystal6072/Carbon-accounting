/**
 * 行业数据集（台账）类型定义。
 * 字段口径：《行业数据集字段清单》§2–§4（D01–D16 / S01–S10）。
 */

/** 记录来源：平台核算自动入账 / 手工补录 / 企业上报审核入库 */
export type RecordSource = 'project' | 'manual' | 'report'

/** 记录状态：有效 / 已替代（同项目出现新结果版本）/ 作废（软删除） */
export type RecordStatus = 'active' | 'superseded' | 'void'

/** 系统边界（引用数据字典） */
export type Boundary = 'gate' | 'grave'

/** 阶段覆盖标记（派生） */
export type StageComplete = 'full' | 'partial' | 'missing'

/** 台账阶段数值（内嵌子表） */
export interface RecordStageValue {
  stageCode: string
  stageName: string
  stageLevel: 1 | 2
  parentStageCode?: string
  /** kgCO₂e / 声明单位，4 位小数 */
  stageEmission: number
  /** 占比 %，1 位小数（派生） */
  stageShare: number
}

/** 台账行：一行 = 一次核算结果（入库即快照，D06） */
export interface CarbonRecord {
  id: string
  /** 记录编号 CR-{年度}-{4位流水}（D01） */
  recordNo: string
  recordSource: RecordSource
  /** 来源核算项目（自动入账必填） */
  sourceProjectId?: string
  sourceProjectNo?: string
  /** 该项目第 N 次核算结果（与 sourceProjectId 联合幂等，D02） */
  resultVersion?: number
  /** 数据域：仅本组织可见（D14） */
  orgId: string
  productName: string
  productCode?: string
  /** 检索标签：产品类别（含完整路径，R-005 父含子） */
  categoryCode: string
  categoryName: string
  categoryPath: string
  /** 检索标签：工艺（多选；custom = 自由标签，外部补录数据无工艺库编码，Q04） */
  processes: { name: string; custom?: boolean }[]
  industryCode: string
  industryName: string
  industryPath: string
  /** 区域（Q01：数据字典「区域」；缺失为空，列表标「未填」可补填） */
  regionName: string
  boundary: Boundary
  periodStart: string
  periodEnd: string
  unitValue: number
  unitCode: string
  caliber: 'total'
  gwpVersion: string
  /** 核算标准（标准号 + 名称，来源核算项目「目标与范围」快照） */
  standardNo?: string
  standardName?: string
  /**
   * 总碳足迹的排放分子单位（gCO₂e / kgCO₂e …）：**沿用核算结果的单位，不做换算**。
   * 缺省按 kgCO₂e 兼容既有数据；与 unitCode（声明单位）共同构成数值口径。
   */
  emissionUnit?: string
  /** 总碳足迹（单位取 emissionUnit / unitCode） */
  totalEmission: number
  stageValues: RecordStageValue[]
  /** 核算结果中的活动数据条数（上报时隐藏，仅用于展示说明） */
  hiddenActivityCount?: number
  status: RecordStatus
  /** 手工补录必填来源说明（D11） */
  sourceNote?: string
  /** 企业上报审核入库：来源上报单 id（重报通过后更新同一条，不新增） */
  sourceReportId?: string
  /** 企业上报审核入库：脱敏后的企业标签（如「某华东地区企业」） */
  orgLabel?: string
  /** 企业上报补充的数据质量说明 */
  dataQualityNote?: string
  attachments: { name: string }[]
  voidReason?: string
  createdBy: string
  createdAt: string
  remark?: string
}

/** 直方图分箱 */
export interface HistogramBin {
  start: number
  end: number
  count: number
}

/** 描述统计结果（S01–S10） */
export interface DatasetStats {
  n: number
  mean: number
  median: number
  p25: number
  p75: number
  p90: number
  min: number
  max: number
  /** 样本标准差（n-1）；n<5 为 undefined（S05） */
  stdDev?: number
  /** 变异系数 %；n<5 或 mean=0 为 undefined */
  cv?: number
  iqr: number
  /** 1.5×IQR 离群值（标记不剔除，S06） */
  outliers: number[]
  histogram: HistogramBin[]
}

/** 分组统计（按区域 / 工艺 / 年度） */
export interface GroupStat {
  key: string
  n: number
  mean: number
  median: number
}

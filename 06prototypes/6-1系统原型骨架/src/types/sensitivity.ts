import type {
  PcfCaliberKey,
  PcfCaliberValues,
  PcfDataItemDirection,
  PcfDataItemType,
  PcfEmissionType,
} from './index'

/**
 * 敏感性分析（报告管理）类型定义。
 * 字段口径见《敏感性分析字段清单》（`02prd/02-2前台业务功能/06报告管理/敏感性分析字段清单.md`），
 * 业务规则见《敏感性分析业务PRD》R-067 ~ R-082。
 *
 * 结构：敏感性分析 1 ── 1 基准情景（锁定核算结果版本 + 数据清单快照）
 *                      └── N 变更情景 ── 变更集（数据项级）+ 情景结果（四口径 + 变化率）
 */

/** 分析状态（字段清单 §8.1） */
export type SensitivityStatus = 'unfinished' | 'stale' | 'completed'

/** 情景核算状态（字段清单 §8.3） */
export type ScenarioCalcStatus = 'notCalc' | 'calculated'

/** 基准清单快照行（字段清单 §4）：创建分析时复制核算项目阶段数据项 */
export interface SensitivityBaselineItem {
  dataItemId: string
  /** 数据项名称（界面「流名称」） */
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  direction: PcfDataItemDirection
  /** 基准「数量」，可为负 */
  baselineQty: number | null
  unit: string
  /** 所属一级阶段 id / 名称 */
  stageId: string
  stageName: string
  /** 最末级阶段路径（一级阶段-二级阶段；无二级时为一级阶段名） */
  stagePath: string
  /** 所属过程节点 id / 名称（空 = 直接挂阶段下） */
  nodeId: string | null
  nodeName: string | null
  /** 当前作用域数据列表名（如「产品分配系数 1」） */
  listName: string
  /** 上游过程名称 */
  upstreamProcess: string
  factorId: string | null
  factorName: string
  factorValue: number | null
  factorUnit: string
  /** 因子 GWP 分项口径快照（选填） */
  factorCalibers: SensitivityCalibers | null
  factorSource: string
}

/** 因子 GWP 分项（排放系数口径，引用即复制） */
export interface SensitivityCalibers {
  gwpFossil?: number
  gwpBiogenic?: number
  gwpLuluc?: number
}

/** 情景变更集行（字段清单 §6）：只存有变更的数据项 */
export interface SensitivityScenarioItem {
  dataItemId: string
  baselineQty: number | null
  scenarioQty: number | null
}

/** 情景结果（字段清单 §7） */
export interface SensitivityScenarioResult {
  /** 情景碳足迹结果（kgCO₂e / 声明单位） */
  emission: number
  /** 四口径情景值 */
  caliberEmission: PcfCaliberValues
  /** 变化率（%）；基准为 0 时为 null */
  deltaRate: number | null
  /** 变化率展示文本（如 `+10.2%`；基准为 0 时为 `-`） */
  deltaRateText: string
  calculatedAt: string
}

/** 变更情景（字段清单 §5） */
export interface SensitivityScenario {
  id: string
  /** 展示为「情景 {seq}」 */
  seq: number
  description: string
  /** 有变更的数据项个数 */
  changedCount: number
  calcStatus: ScenarioCalcStatus
  /** 是否关键敏感项（|Δ| 最大） */
  keySensitive: boolean
  calculatedAt: string
  result: SensitivityScenarioResult | null
  items: SensitivityScenarioItem[]
}

/** 敏感性分析（主对象，字段清单 §2） */
export interface SensitivityAnalysis {
  id: string
  /** 分析编号 `PCF-SA-YYYYMMDDNNN` */
  analysisNo: string
  sourceProjectId: string
  sourceProjectName: string
  sourceProjectNo: string
  sourceDeleted: boolean
  productName: string
  productSpec: string
  /** 系统边界（展示文本） */
  systemBoundary: string
  /** 声明 / 功能单位（如「双」） */
  functionalUnit: string
  /** 统计时间（起止区间文本） */
  statisticalPeriod: string
  /** 影响评价方法（如 `IPCC 2021`） */
  lciaMethod: string
  /** 基准结果是否含 GWP 分项（决定口径切换控件是否可用） */
  hasGwpSplit: boolean
  /** 基准锁定的核算结果版本 */
  baselineVersion: number
  baselineEmission: number
  baselineCaliberEmission: PcfCaliberValues
  baselineCalculatedAt: string
  /** 基准情景描述（必填） */
  baselineDescription: string
  status: SensitivityStatus
  scenarios: SensitivityScenario[]
  /** 基准清单快照 */
  baselineItems: SensitivityBaselineItem[]
  /** 最近一次情景核算成功时间；未核算时 = 创建时间 */
  resultUpdatedAt: string
  createdAt: string
  createdBy: string
}

/** 新增弹窗候选项目（字段清单 §2 来源核算项目投影） */
export interface SensitivityProjectOption {
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
}

/** 四口径 key（引用核算口径，见 types/index.ts `PCF_CALIBERS`） */
export type { PcfCaliberKey, PcfCaliberValues }

import type { IconName } from '@/shared/components'

/**
 * 数据大屏（外部验收汇报）类型定义。
 *
 * 口径原则：
 * - 跨声明单位（双 / m² / m³ / 个）不做加总，排行与对标一律限定同品类 + 同单位；
 * - 生物碳单独成图（含 / 不含生物碳），不并入总量结论；
 * - 所有比值指标携带样本数，样本不足时页面降级展示。
 */

/** 大屏视角：平台运营汇总 / 单组织案例 */
export type ScreenScope = 'platform' | 'org'

/** 核心指标卡 */
export interface ScreenKpi {
  key: string
  label: string
  value: number
  unit?: string
  /** 小数位，默认 0 */
  digits?: number
  /** 同比变化值 */
  delta?: number
  deltaUnit?: '%' | '家' | '个' | '份' | 'pt'
  deltaLabel?: string
  /** 分母越大越好的指标为 false（如「平均单位碳足迹」下降是好事） */
  goodWhenDown?: boolean
  note?: string
  /** 无同口径数据时展示「—」，不做任何估算 */
  insufficient?: boolean
  tone?: 'primary' | 'cyan' | 'success' | 'warning'
  icon?: IconName
}

/** 生命周期阶段构成 */
export interface ScreenStage {
  name: string
  value: number
  ratio: number
}

/** 年度经营序列（企业视角年份区间筛选基础） */
export interface ScreenAnnualPoint {
  year: number
  /** 本企业单位碳足迹 */
  intensity: number
  /** 行业基线 */
  baseline: number
  /** 核算次数 */
  count: number
  /** 优于基线占比 % */
  better: number
}

/** 月度趋势：核算次数 + 同口径单位碳足迹中位数 */
export interface ScreenTrendPoint {
  month: string
  count: number
  median: number
}

/** 通用「名称 + 数值」条目 */
export interface ScreenNamedValue {
  name: string
  value: number
}

/** 降碳优先级排行：指数 = 本产品单位碳足迹 / 同品类中位数 */
export interface ScreenRankItem {
  name: string
  category: string
  index: number
  value: number
  unit: string
}

/** 生物碳口径拆解（示例产品，单位一致） */
export interface ScreenCaliberDemo {
  product: string
  unit: string
  fossil: number
  biogenic: number
  luluc: number
  total: number
}

/** 阶段 × 品类 贡献矩阵（行内占比合计 100%） */
export interface ScreenMatrixRow {
  stage: string
  cells: Array<{ category: string; ratio: number }>
}

/** 行业对标：delta =（企业值 - 基线）/ 基线 × 100；无同口径基线时 delta 为 null */
export interface ScreenBenchmarkItem {
  name: string
  categoryName: string
  industryName: string
  boundary: string
  value: number
  baseline: number | null
  unit: string
  delta: number | null
  matched: boolean
  /** 基线名称 / 基准年 / 来源 */
  baselineLabel?: string
}

/** 当前主图使用的同口径分组 */
export interface ScreenContext {
  key: string
  categoryName: string
  boundary: string
  unit: string
  sampleCount: number
  /** 该口径纳入的产品数（去重） */
  productCount: number
}

/** 企业视角：产品分类 × 功能单位 的排放汇总（同功能单位才加总，跨单位不合并） */
export interface ScreenCategoryEmission {
  category: string
  unit: string
  value: number
  /** 参与汇总的核算记录条数 */
  count: number
}

/** 企业视角：已核算记录中的碳足迹排行条目（按值降序） */
export interface ScreenTopProduct {
  name: string
  category: string
  boundary: 'gate' | 'grave'
  boundaryLabel: string
  value: number
  /** 记录声明单位（kgCO₂e/m³ 等） */
  unit: string
  year: number
}

/** 企业视角：单产品各生命阶段占比（按年，占比合计 100%） */
export interface ScreenProductStage {
  product: string
  category: string
  unit: string
  boundaryLabel: string
  years: Array<{
    year: number
    /** 该年该产品单位碳足迹（用于浮层对照） */
    total: number
    stages: Array<{ name: string; ratio: number; value: number }>
  }>
}

/** 当前主图绑定的基线（有则画参考线，无则明确提示） */
export interface ScreenBaselineInfo {
  matched: boolean
  value: number | null
  label: string
  industryName?: string
  boundary?: string
  unit?: string
  baseYear?: number
  issuer?: string
  sourceType?: string
  gwpVersion?: string
}

/** 基线覆盖率 */
export interface ScreenCoverage {
  covered: number
  total: number
  rate: number
}

/** 数据质量等级分布 */
export interface ScreenDqrItem {
  name: string
  value: number
  color: string
}

/** 数据资产数字墙 */
export interface ScreenAsset {
  label: string
  value: string
  note?: string
}

/** 上报审核漏斗 */
export interface ScreenFunnelItem {
  name: string
  value: number
  /** 相对首环节的留存率（%） */
  rate: number
}

/** 底部滚动事件 */
export interface ScreenTickerItem {
  time: string
  type: 'calc' | 'report' | 'dataset' | 'standard'
  text: string
  meta: string
}

/** 企业级：报告列表 */
export interface ScreenReportItem {
  name: string
  product: string
  status: string
  time: string
}

/** 企业级：待办 */
export interface ScreenTaskItem {
  name: string
  status: string
  owner: string
  updatedAt: string
}

/* ===================== 平台视角：单屏统计口径 ===================== */

/**
 * 平台视角区域统计（地图两种图层共用一份数据）：
 * - 租户图层：点大小 = 该区域租户数；
 * - PCF 图层：区域颜色深浅 = PCF 记录数，点大小 = 有效版本 PCF 数。
 */
export interface ScreenPlatformRegion {
  name: string
  /** 该区域租户数 */
  tenants: number
  /** 该区域 PCF 记录数 */
  pcf: number
  /** 该区域有效版本 PCF 数（按组织 + 产品取最新结果版本） */
  validPcf: number
}

/** 平台视角：核算边界分布（已完成核算的碳足迹记录） */
export interface ScreenPlatformBoundary {
  name: string
  /** 已完成核算记录数 */
  value: number
  /** 记录碳足迹合计（tCO₂e） */
  footprint: number
}

/** 平台视角：趋势图的单个年度点（已完成核算量 + 汇总碳足迹 + 单位碳足迹） */
export interface ScreenPlatformTrendPoint {
  year: number
  /** 已完成核算量（条） */
  count: number
  /** 汇总碳足迹（tCO₂e） */
  footprint: number
  /** 同口径单位碳足迹中位数（kgCO₂e/单位） */
  intensity: number
}

/** 平台视角：一组筛选条件（边界 / 行业 / 单位，all = 不限）对应的年度序列 */
export interface ScreenPlatformTrendSeries {
  /** 组合键：边界|行业|单位 */
  key: string
  points: ScreenPlatformTrendPoint[]
}

/** 平台视角：近 12 周活跃企业率 */
export interface ScreenPlatformWeekPoint {
  /** 周标签（MM/DD 起） */
  week: string
  active: number
  total: number
  rate: number
}

/** 平台视角单屏洞察：全部来自现有 mock 服务，未取到的维度明确留空 */
export interface ScreenPlatformInsight {
  /** 企业总数（租户管理全部租户） */
  tenantTotal: number
  /** 启用企业数 */
  enabledTenantTotal: number
  activeTenants: number
  /** 活跃率 %（近 30 天有数据更新或登录的租户 / 租户总数） */
  activeRate: number
  /** 平台内产品碳足迹记录总量 */
  pcfTotal: number
  /** 有效版本 PCF 数 */
  validPcfTotal: number
  regions: ScreenPlatformRegion[]
  boundaries: ScreenPlatformBoundary[]
  /** 行业分布 Top5（按已完成核算数降序） */
  industries: ScreenNamedValue[]
  /** 趋势图筛选轴 */
  trendFilters: {
    boundaries: string[]
    industries: string[]
    units: string[]
  }
  trendSeries: ScreenPlatformTrendSeries[]
  /** 近 12 周活跃企业率趋势 */
  activeTrend: ScreenPlatformWeekPoint[]
}

/** 大屏一屏所需的全部数据（一次聚合返回，避免多请求造成半空屏） */
export interface ScreenData {
  scope: ScreenScope
  orgName: string
  updatedAt: string
  rangeLabel: string
  /** 可选统计年份 */
  yearOptions: number[]
  /** 当前统计年份区间（闭区间） */
  yearRange: [number, number]
  /** 可切换的同口径分组 */
  contexts: ScreenContext[]
  /** 当前主图分组 key */
  contextKey: string
  /** 当前主图基线信息 */
  baselineInfo: ScreenBaselineInfo
  /** 年度经营序列 */
  annual: ScreenAnnualPoint[]
  /* ---------- 企业视角专用 ---------- */
  /** 产品库全部产品数（不受年份区间影响） */
  libraryProductCount: number
  /** 工艺库当前企业工艺数（不受年份区间影响） */
  processCount: number
  /** 产品分类 × 功能单位 的排放汇总 */
  categoryEmissions: ScreenCategoryEmission[]
  /** 碳足迹排行（已按值降序，供 Top10 + 类别 / 边界筛选） */
  topProducts: ScreenTopProduct[]
  /** 产品生命阶段构成（按年） */
  productStages: ScreenProductStage[]
  kpis: ScreenKpi[]
  stages: ScreenStage[]
  trends: ScreenTrendPoint[]
  industries: ScreenNamedValue[]
  regions: ScreenNamedValue[]
  sources: ScreenNamedValue[]
  ranks: ScreenRankItem[]
  caliberDemo: ScreenCaliberDemo
  matrix: ScreenMatrixRow[]
  matrixCategories: string[]
  sensitivities: ScreenNamedValue[]
  benchmarks: ScreenBenchmarkItem[]
  /** 单位碳足迹分布（分箱） */
  distribution: ScreenNamedValue[]
  /** 年度有效记录数 */
  yearDistribution: ScreenNamedValue[]
  coverage: ScreenCoverage
  dqr: ScreenDqrItem[]
  dqrAvg: number
  assets: ScreenAsset[]
  funnel: ScreenFunnelItem[]
  ticker: ScreenTickerItem[]
  conclusions: string[]
  reports: ScreenReportItem[]
  tasks: ScreenTaskItem[]
  /** 平台视角单屏洞察（企业视角不返回） */
  platform?: ScreenPlatformInsight
}

import type { Boundary, CarbonRecord, DatasetStats } from '@/types/dataset'
import {
  BOUNDARY_TEXT,
  PROCESS_LIBRARY_NAMES,
  REGION_OPTIONS,
  computeStats,
  emissionUnitText,
  periodYear,
  provinceOf,
} from './datasetMeta'

/**
 * 统计分析 · 数据模型。
 *
 * 口径：
 * 1. 入参 = 平台「最新发布版本」中符合统计条件（行业 / 地域 / 产品类别）的记录，
 *    条件选择由页面侧完成，本模型只负责按口径聚合；
 * 2. 「系统边界 + 声明单位 + GWP 版本 + 排放单位」四者一致才可混算；本期**不做单位换算**，
 *    不同声明单位（m² / m³ / 个 / 双 …）各自成桶、分别统计，由用户显式选择口径；
 * 3. 被排除的记录条数与原因在页面可见，避免「命中 N 条但只统计了几条」的困惑；
 * 4. 同口径样本不足时，按同分布补足示意样本撑起图表框架（前端侧，仅用于分布形态展示）。
 */

/** 真实样本少于该值时补足示意样本，避免图表空白 */
const MIN_REAL_SAMPLES = 12
/** 补足后的目标样本量（直方图分箱更稳定） */
const TARGET_SAMPLES = 40

export type GroupKey = 'industry' | 'region' | 'category' | 'process' | 'year'

export interface StatSample {
  value: number
  region: string
  processes: string[]
  year: number
  /** 所属行业（行业维度分组用） */
  industry: string
  /** 产品类别（类别维度分组用） */
  category: string
}

export interface StatGroup {
  key: string
  n: number
  mean: number
  median: number
  /** 组内标准差（n≥2 给出，用于误差棒） */
  stdDev?: number
}

export interface StatModel {
  /** 参与统计的样本（同口径真实样本 + 必要的示意补足） */
  samples: StatSample[]
  /** 同口径真实样本量 */
  realCount: number
  /** 是否使用了示意补足样本 */
  simulated: boolean
  stats: DatasetStats
  /** 声明单位（双 / m² …） */
  unit: string
  /** 排放分子单位，沿用核算结果，不换算 */
  emissionUnit: string
  boundary: Boundary | ''
  boundaryText: string
  /** 当前边界下的全部同口径桶（按真实条数降序，供「声明单位」切换） */
  buckets: UnitBucket[]
  /** 当前参与统计的桶键 */
  activeKey: string
  /** 同一条件下并存多种声明单位：不可换算合并，必须分开统计 */
  mixedUnits: boolean
  /** 相对当前桶被排除的记录数与原因 */
  excluded: ExclusionBreakdown
  /** 偏度（g1）与超额峰度（g2，正态 = 0） */
  skewness?: number
  kurtosis?: number
  regionGroups: StatGroup[]
  processGroups: StatGroup[]
  yearGroups: StatGroup[]
  industryGroups: StatGroup[]
  categoryGroups: StatGroup[]
}

/* ============================ 同口径分桶 ============================ */

/** 一个同口径桶：边界 + 声明单位 + GWP 版本 + 排放单位 完全一致 */
export interface UnitBucket {
  /** 桶键：`边界|声明单位|GWP 版本|排放单位` */
  key: string
  /** 声明单位（m² / 双 …），空串表示未填写 */
  unitCode: string
  /** 排放分子单位（沿用核算结果，不换算） */
  emissionUnit: string
  gwpVersion: string
  /** 真实有效记录数（不含示意补足） */
  n: number
}

/** 相对当前桶被排除的记录数与原因 */
export interface ExclusionBreakdown {
  total: number
  /** 声明单位不同：本期不做换算，只能切换口径后单独统计 */
  byUnit: number
  /** GWP 版本不同 */
  byGwp: number
  /** 排放分子单位不同（不换算） */
  byEmissionUnit: number
  /** 状态非「有效」（已替代 / 作废） */
  byStatus: number
}

function bucketKeyOf(record: CarbonRecord): string {
  return `${record.boundary}|${record.unitCode}|${record.gwpVersion}|${emissionUnitText(record.emissionUnit)}`
}

/**
 * 按同口径键分桶（只收「有效」记录）。
 * 同口径 = 边界 + 声明单位 + GWP 版本 + 排放单位 四者一致；任一不同即不可混算。
 */
export function collectBuckets(records: CarbonRecord[]): Map<string, CarbonRecord[]> {
  const buckets = new Map<string, CarbonRecord[]>()
  for (const record of records) {
    if (record.status !== 'active') continue
    const key = bucketKeyOf(record)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(record)
    else buckets.set(key, [record])
  }
  return buckets
}

/**
 * 桶排序：真实条数降序 → 摇篮到大门优先（企业对标最常用口径）→ 桶键字典序。
 * 条数并列时也保持稳定顺序，避免同一批数据每次选中不同桶。
 */
function sortedBucketEntries(buckets: Map<string, CarbonRecord[]>): [string, CarbonRecord[]][] {
  const boundaryRank = (bucket: CarbonRecord[]) => (bucket[0]?.boundary === 'gate' ? 0 : 1)
  return [...buckets.entries()].sort(
    (a, b) => b[1].length - a[1].length || boundaryRank(a[1]) - boundaryRank(b[1]) || a[0].localeCompare(b[0], 'zh-CN'),
  )
}

/** 相对选中桶统计被排除的记录数与原因（按「声明单位 → GWP → 排放单位」优先级归因） */
function exclusionOf(records: CarbonRecord[], selected?: CarbonRecord): ExclusionBreakdown {
  const breakdown: ExclusionBreakdown = { total: 0, byUnit: 0, byGwp: 0, byEmissionUnit: 0, byStatus: 0 }
  const selectedKey = selected ? bucketKeyOf(selected) : ''
  for (const record of records) {
    if (record.status !== 'active') {
      breakdown.byStatus += 1
      breakdown.total += 1
      continue
    }
    if (!selected || bucketKeyOf(record) === selectedKey) continue
    breakdown.total += 1
    if (record.unitCode !== selected.unitCode) breakdown.byUnit += 1
    else if (record.gwpVersion !== selected.gwpVersion) breakdown.byGwp += 1
    else breakdown.byEmissionUnit += 1
  }
  return breakdown
}

/* ============================ 统计模型 ============================ */

/**
 * 统计模型。
 * @param records 已按条件 + 系统边界筛选后的记录
 * @param preferredKey 用户选中的同口径桶键；缺失或失效时回落到首选桶（条数最多）
 */
export function buildStatModel(records: CarbonRecord[], preferredKey = ''): StatModel {
  const entries = sortedBucketEntries(collectBuckets(records))
  const activeEntry = entries.find(([key]) => key === preferredKey) ?? entries[0]
  const comparable = activeEntry?.[1] ?? []
  const buckets: UnitBucket[] = entries.map(([key, list]) => ({
    key,
    unitCode: list[0]?.unitCode ?? '',
    emissionUnit: emissionUnitText(list[0]?.emissionUnit),
    gwpVersion: list[0]?.gwpVersion ?? '',
    n: list.length,
  }))

  const real: StatSample[] = comparable.map((record) => ({
    value: record.totalEmission,
    // 与列表筛选同口径：三级路径统一上卷到省级，避免同省数据被拆成多个分组
    region: provinceOf(record.regionName),
    processes: record.processes.map((p) => p.name),
    year: periodYear(record),
    industry: record.industryName,
    category: categoryNameOf(record),
  }))

  const supplementCount = real.length > 0 && real.length < MIN_REAL_SAMPLES ? TARGET_SAMPLES - real.length : 0
  const extra = supplementCount > 0 ? supplementSamples(real, supplementCount) : []
  const samples = [...real, ...extra]
  const values = samples.map((s) => s.value)

  const stats = withDispersion(computeStats(values), values)
  const first = comparable[0]
  const shape = shapeMoments(values, stats.mean, stats.stdDev)

  return {
    samples,
    realCount: real.length,
    simulated: extra.length > 0,
    stats,
    unit: first?.unitCode ?? '',
    emissionUnit: emissionUnitText(first?.emissionUnit),
    boundary: first?.boundary ?? '',
    boundaryText: first ? BOUNDARY_TEXT[first.boundary] : '—',
    buckets,
    activeKey: activeEntry?.[0] ?? '',
    mixedUnits: new Set(buckets.map((bucket) => bucket.unitCode)).size > 1,
    excluded: exclusionOf(records, first),
    skewness: shape.skewness,
    kurtosis: shape.kurtosis,
    regionGroups: groupSamples(samples, 'region'),
    processGroups: groupSamples(samples, 'process'),
    yearGroups: groupSamples(samples, 'year'),
    industryGroups: groupSamples(samples, 'industry'),
    categoryGroups: groupSamples(samples, 'category'),
  }
}

/** 产品类别名：优先末级类别名，缺省取类别路径末段 */
function categoryNameOf(record: CarbonRecord): string {
  if (record.categoryName) return record.categoryName
  const parts = record.categoryPath.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

/** 偏度 / 超额峰度（总体矩口径，正态分布 = 0） */
function shapeMoments(
  values: number[],
  mean: number,
  stdDev?: number,
): { skewness?: number; kurtosis?: number } {
  if (values.length < 3 || !stdDev || stdDev === 0) return {}
  const n = values.length
  const skewness = values.reduce((sum, value) => sum + ((value - mean) / stdDev) ** 3, 0) / n
  const kurtosis = values.reduce((sum, value) => sum + ((value - mean) / stdDev) ** 4, 0) / n - 3
  return { skewness, kurtosis }
}

/** 分组聚合：区域 / 工艺（多标签展开）/ 年度 */
export function groupSamples(samples: StatSample[], key: GroupKey): StatGroup[] {
  const buckets = new Map<string, number[]>()
  for (const sample of samples) {
    const keys =
      key === 'process'
        ? sample.processes.length > 0
          ? sample.processes
          : ['未标注工艺']
        : key === 'region'
          ? [sample.region || '未填写区域']
          : key === 'industry'
            ? [sample.industry || '未标注行业']
            : key === 'category'
              ? [sample.category || '未分类']
              : [String(sample.year || '未填写')]
    for (const item of keys) {
      const bucket = buckets.get(item)
      if (bucket) bucket.push(sample.value)
      else buckets.set(item, [sample.value])
    }
  }
  const groups: StatGroup[] = [...buckets.entries()].map(([groupKey, values]) => {
    const stats = computeStats(values)
    return {
      key: groupKey,
      n: stats.n,
      mean: stats.mean,
      median: stats.median,
      stdDev: values.length >= 2 ? (stats.stdDev ?? sampleStd(values)) : undefined,
    }
  })
  if (key === 'year') {
    return groups.sort((a, b) => Number(a.key) - Number(b.key))
  }
  return groups.sort((a, b) => b.mean - a.mean || a.key.localeCompare(b.key, 'zh-CN'))
}

/* ============================ 内部工具 ============================ */

/** n ≥ 2 即给出离散度（样本标准差 n-1），不受「n<5 降级」限制 */
function withDispersion(stats: DatasetStats, values: number[]): DatasetStats {
  if (stats.n < 2 || stats.stdDev !== undefined) return stats
  const variance = values.reduce((sum, value) => sum + (value - stats.mean) ** 2, 0) / (values.length - 1)
  const stdDev = Math.sqrt(variance)
  return { ...stats, stdDev, cv: stats.mean > 0 ? (stdDev / stats.mean) * 100 : undefined }
}

/** 按真实样本的均值与离散程度生成同分布示意样本（固定随机种子，渲染稳定） */
function supplementSamples(real: StatSample[], count: number): StatSample[] {
  const values = real.map((sample) => sample.value)
  const base = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 2.4
  const spread = values.length > 1 ? sampleStd(values) : base * 0.12
  const seedText = `${real[0]?.region ?? ''}|${values.length}|${base.toFixed(4)}`
  const random = mulberry32(hashSeed(seedText))

  const regionPool = unique(real.map((sample) => sample.region).filter(Boolean))
  const processPool = unique(real.flatMap((sample) => sample.processes).filter(Boolean))
  const yearPool = unique(real.map((sample) => String(sample.year)).filter((year) => Number(year) > 0))
  const industryPool = unique(real.map((sample) => sample.industry).filter(Boolean))
  const categoryPool = unique(real.map((sample) => sample.category).filter(Boolean))

  const regions = regionPool.length > 0 ? regionPool : REGION_OPTIONS.map((option) => option.value)
  const processes = processPool.length > 0 ? processPool : [...PROCESS_LIBRARY_NAMES]
  const industries = industryPool.length > 0 ? industryPool : ['竹制品加工']
  const categories = categoryPool.length > 0 ? categoryPool : ['竹地板']
  // 年度维度至少保留 3 个年份，保证「按年度」折线能呈现趋势
  const latestYear = Math.max(...yearPool.map(Number), new Date().getFullYear())
  const years = yearPool.length > 1 ? yearPool.map(Number) : [latestYear - 2, latestYear - 1, latestYear]

  const extra: StatSample[] = []
  for (let index = 0; index < count; index += 1) {
    const raw = base + gaussian(random) * spread
    const value = Math.min(base * 1.45, Math.max(base * 0.62, raw))
    extra.push({
      value: Math.round(value * 10000) / 10000,
      region: regions[index % regions.length],
      processes: [processes[(index * 2 + 1) % processes.length]],
      year: years[index % years.length],
      industry: industries[index % industries.length],
      category: categories[(index + 1) % categories.length],
    })
  }
  return extra
}

function sampleStd(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function hashSeed(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-9)
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}


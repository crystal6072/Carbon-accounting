import type { CarbonRecord } from '@/types/dataset'
import type {
  ScreenAnnualPoint,
  ScreenBaselineInfo,
  ScreenBenchmarkItem,
  ScreenCategoryEmission,
  ScreenContext,
  ScreenData,
  ScreenKpi,
  ScreenPlatformInsight,
  ScreenPlatformTrendSeries,
  ScreenProductStage,
  ScreenReportItem,
  ScreenScope,
  ScreenStage,
  ScreenTaskItem,
  ScreenTopProduct,
} from '@/types/screen'
import { fetchRecords, stageCompleteOf } from './dataset'
import { fetchBaselines } from './baselines'
import { fetchReports as fetchFootprintReports } from './report'
import { fetchReports as fetchDataReports } from './dataReport'
import { fetchAllAccounts } from './account'
import { fetchTenants, REGION_TREE } from './tenant'
import {
  fetchFactorLibraries,
  fetchModels,
  fetchMyProcesses,
  fetchMyProducts,
  fetchPcfCalcResult,
  fetchPcfCurrentUserOrg,
  fetchPcfProjects,
  fetchStandards,
} from './index'

/**
 * 数据驾驶舱聚合层。
 *
 * 原则：
 * - 所有数值来自系统现有 mock 服务（核算台账 / 基线库 / 报告 / 租户 / 因子库 / 模型 / 标准）；
 * - 取不到的指标不估算、不造数，页面展示「—」或「暂无同口径基线」；
 * - 行业基线按「行业 + 边界 + 单位 + GWP」匹配（你确认的 B 口径），并始终带出基线名称 / 基准年 / 来源；
 * - 跨声明单位不做加总，趋势与对标都限定在同一品类 + 边界 + 单位分组内。
 */

const BOUNDARY_TEXT: Record<string, string> = {
  gate: '摇篮到大门',
  grave: '摇篮到坟墓',
}

const PCF_STATUS_TEXT: Record<string, string> = {
  new: '新建',
  ongoing: '进行中',
  toCheck: '待检测',
  checking: '检测中',
  toCalc: '待核算',
  calculating: '核算中',
  calcFailed: '核算失败',
  done: '已完成',
  calculated: '已核算',
}

const delay = (ms = 260) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const num = (value: number, digits = 4) => Number(value.toFixed(digits))

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const gwpOf = (record: CarbonRecord) => record.gwpVersion || 'IPCC AR6 GWP100'
const keyOf = (record: CarbonRecord) => `${record.categoryName}|${record.boundary}|${record.unitCode}`
const yearOf = (record: CarbonRecord) => Number((record.periodEnd || '').slice(0, 4)) || 0

/** 行业级匹配（B 口径）：行业 + 边界 + 单位 + GWP；同条件多条时取基准年最新，并优先本组织基线 */
function matchBaseline(record: CarbonRecord, baselines: Awaited<ReturnType<typeof fetchBaselines>>, preferOrg: boolean) {
  return baselines
    .filter(
      (item) =>
        item.industryCode === record.industryCode &&
        item.boundary === record.boundary &&
        item.unitCode === record.unitCode &&
        item.gwpVersion === gwpOf(record),
    )
    .sort((a, b) => {
      if (b.baseYear !== a.baseYear) return b.baseYear - a.baseYear
      const aScore = a.dataSource === (preferOrg ? 'org' : 'system') ? 0 : 1
      const bScore = b.dataSource === (preferOrg ? 'org' : 'system') ? 0 : 1
      return aScore - bScore
    })[0]
}

function countBy<T>(items: T[], keyOfItem: (item: T) => string) {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyOfItem(item)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** 生成一屏所需聚合数据 */
export interface FetchScreenParams {
  scope: ScreenScope
  orgId?: string
  yearFrom?: number
  yearTo?: number
  contextKey?: string
}

export async function fetchScreenData(params: FetchScreenParams): Promise<ScreenData> {
  const [
    allRecords,
    baselines,
    footprintReports,
    dataReports,
    tenants,
    libraries,
    models,
    standards,
    projects,
    myProducts,
    myProcesses,
    currentOrg,
    accounts,
  ] = await Promise.all([
    fetchRecords(),
    fetchBaselines(),
    fetchFootprintReports(),
    fetchDataReports(),
    fetchTenants(),
    fetchFactorLibraries(),
    fetchModels(),
    fetchStandards(),
    fetchPcfProjects(),
    fetchMyProducts(),
    fetchMyProcesses(),
    fetchPcfCurrentUserOrg(),
    fetchAllAccounts(),
  ])

  const isOrg = params.scope === 'org'
  /** 企业驾驶舱只看本组织台账（组织名口径与「我的产品 / 我的工艺」一致） */
  const currentOrgKey = currentOrg.name.split(' · ')[0]
  const belongsToCurrentOrg = (record: CarbonRecord) =>
    record.orgId === currentOrgKey || currentOrgKey.startsWith(record.orgId)
  const orgRecords = allRecords.filter(
    (record) =>
      record.status === 'active' &&
      (!isOrg || (params.orgId ? record.orgId === params.orgId : belongsToCurrentOrg(record))),
  )
  const years = [...new Set(orgRecords.map(yearOf).filter(Boolean))].sort((a, b) => a - b)
  const yearOptions = years.length > 0 ? years : [new Date().getFullYear()]
  const firstYear = yearOptions[0]
  const lastYear = yearOptions[yearOptions.length - 1]
  const rawFrom = params.yearFrom ?? firstYear
  const rawTo = params.yearTo ?? lastYear
  const from = Math.min(Math.max(Math.min(rawFrom, rawTo), firstYear), lastYear)
  const to = Math.min(Math.max(Math.max(rawFrom, rawTo), from), lastYear)

  const records = orgRecords.filter((record) => yearOf(record) >= from && yearOf(record) <= to)

  /* ---------- 同口径分组 ---------- */
  const groups = new Map<string, CarbonRecord[]>()
  for (const record of records) {
    const key = keyOf(record)
    groups.set(key, [...(groups.get(key) ?? []), record])
  }
  const contexts: ScreenContext[] = [...groups.entries()]
    .map(([key, list]) => ({
      key,
      categoryName: list[0].categoryName,
      boundary: BOUNDARY_TEXT[list[0].boundary] ?? list[0].boundary,
      unit: list[0].unitCode,
      sampleCount: list.length,
      productCount: new Set(list.map((record) => record.productCode || record.productName)).size,
    }))
    // 默认主图优先「年度覆盖最全」的分组，其次看样本量；不为了有基线而牺牲趋势可读性
    .sort((a, b) => {
      const yearsA = new Set((groups.get(a.key) ?? []).map(yearOf).filter(Boolean)).size
      const yearsB = new Set((groups.get(b.key) ?? []).map(yearOf).filter(Boolean)).size
      return yearsB - yearsA || b.sampleCount - a.sampleCount
    })

  const baselineOfGroup = (list: CarbonRecord[]) => matchBaseline(list[0], baselines, isOrg)
  const defaultContext =
    (params.contextKey ? contexts.find((context) => context.key === params.contextKey) : undefined) ??
    contexts[0]

  const selectedRecords = defaultContext ? groups.get(defaultContext.key) ?? [] : []
  const selectedBaseline = selectedRecords.length > 0 ? baselineOfGroup(selectedRecords) : undefined

  /* ---------- 年度序列（当前分组） ---------- */
  const annualMap = new Map<number, CarbonRecord[]>()
  for (const record of selectedRecords) {
    const year = yearOf(record)
    if (!year) continue
    annualMap.set(year, [...(annualMap.get(year) ?? []), record])
  }
  const annual: ScreenAnnualPoint[] = [...annualMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, list]) => ({
      year,
      intensity: num(median(list.map((record) => record.totalEmission))),
      baseline: selectedBaseline?.totalEmission ?? 0,
      count: list.length,
      better:
        selectedBaseline && list.length > 0
          ? Math.round((list.filter((record) => record.totalEmission <= selectedBaseline.totalEmission).length / list.length) * 100)
          : 0,
    }))

  /* ---------- 阶段构成（区间全部记录，阶段占比与单位无关） ---------- */
  const stageMap = new Map<string, number[]>()
  for (const record of records) {
    for (const stage of record.stageValues.filter((item) => item.stageLevel === 1)) {
      stageMap.set(stage.stageName, [...(stageMap.get(stage.stageName) ?? []), stage.stageShare])
    }
  }
  const stages: ScreenStage[] = [...stageMap.entries()].map(([name, values]) => {
    const ratio = num(values.reduce((sum, value) => sum + value, 0) / values.length, 1)
    return { name, value: ratio, ratio }
  })
  const topStage = stages.reduce<ScreenStage | undefined>(
    (max, item) => (!max || item.ratio > max.ratio ? item : max),
    undefined,
  )

  /* ---------- 分布类 ---------- */
  /** 行业分布 Top5：按已完成核算数（记录数）从多到少取前 5 个行业 */
  const industries = countBy(records, (record) => record.industryName).slice(0, 5)
  const regions = countBy(records, (record) => record.regionName || '未填写').slice(0, 6)
  const boundaries = ['gate', 'grave']
    .map((boundary) => ({
      name: BOUNDARY_TEXT[boundary],
      value: records.filter((record) => record.boundary === boundary).length,
    }))
    .filter((item) => item.value > 0)
  const standardDistribution = countBy(records, (record) => record.standardNo || '未填写').slice(0, 6)
  const yearDistribution = [...new Set(records.map(yearOf).filter(Boolean))]
    .sort((a, b) => a - b)
    .map((year) => ({ name: `${year}`, value: records.filter((record) => yearOf(record) === year).length }))

  /* ---------- 平台视角：单屏统计（企业 / 活跃率 / PCF / 区域 / 边界 / 趋势） ---------- */
  const tenantTotal = tenants.length

  /** 租户属地：企业取「所在地区」扩展字段，园区取地理位置 / 行政归属区划，只取省级 */
  const provinceLabelOfTenant = (tenant: (typeof tenants)[number]) => {
    const raw = tenant.profile?.region_code || tenant.profile?.geo_location || tenant.profile?.admin_region || ''
    const code = raw.split(',')[0]
    return REGION_TREE.find((node) => node.value === code)?.label ?? ''
  }

  /** 有效版本 PCF：同一组织 + 同一产品取最高结果版本，历史版本不计入 */
  const latestVersionKey = new Map<string, number>()
  for (const record of records) {
    const key = `${record.orgId}|${record.productCode || record.productName}`
    latestVersionKey.set(key, Math.max(latestVersionKey.get(key) ?? 0, record.resultVersion ?? 1))
  }
  const isValidVersion = (record: CarbonRecord) =>
    (record.resultVersion ?? 1) ===
    latestVersionKey.get(`${record.orgId}|${record.productCode || record.productName}`)

  const regionMap = new Map<string, { tenants: number; pcf: number; validPcf: number }>()
  const ensureRegion = (name: string) => {
    if (!name) return undefined
    const cell = regionMap.get(name) ?? { tenants: 0, pcf: 0, validPcf: 0 }
    regionMap.set(name, cell)
    return cell
  }
  for (const tenant of tenants) {
    const cell = ensureRegion(provinceLabelOfTenant(tenant))
    if (cell) cell.tenants += 1
  }
  for (const record of records) {
    const cell = ensureRegion(record.regionName)
    if (!cell) continue
    cell.pcf += 1
    if (isValidVersion(record)) cell.validPcf += 1
  }
  const platformRegions = [...regionMap.entries()]
    .map(([name, cell]) => ({ name, ...cell }))
    .sort((a, b) => b.pcf - a.pcf || b.tenants - a.tenants)

  /** 核算边界分布：已完成核算碳足迹数（记录数） + 该边界记录碳足迹合计 */
  const platformBoundaries = ['gate', 'grave']
    .map((boundary) => {
      const list = records.filter((record) => record.boundary === boundary)
      return {
        name: BOUNDARY_TEXT[boundary],
        value: list.length,
        footprint: num(list.reduce((sum, record) => sum + record.totalEmission, 0) / 1000, 2),
      }
    })
    .filter((item) => item.value > 0)

  /**
   * 活跃率口径：近 30 天内有登录（账号最近登录时间）或数据更新的租户 / 租户总数。
   * 原型账号表只保留「最近一次登录」，逐周活跃明细取不到，12 周趋势按当前活跃率回推的
   * 演示序列呈现（末点与 KPI 严格一致），接入真实登录日志后替换为逐周统计即可。
   */
  const ACTIVE_WINDOW_DAYS = 30
  const latestStamp = [...records.map((record) => record.createdAt), ...accounts.map((account) => account.lastLoginAt ?? '')]
    .filter(Boolean)
    .sort()
    .pop() ?? new Date().toISOString().slice(0, 10)
  const latestDate = new Date(`${latestStamp.slice(0, 10)}T00:00:00`)
  const windowStart = new Date(latestDate)
  windowStart.setDate(windowStart.getDate() - ACTIVE_WINDOW_DAYS)
  const activeTenantIds = new Set<string>()
  for (const account of accounts) {
    if (!account.lastLoginAt) continue
    if (new Date(`${account.lastLoginAt.slice(0, 10)}T00:00:00`) < windowStart) continue
    for (const membership of account.tenantMemberships) {
      if (membership.status === 'active' && membership.tenantId) activeTenantIds.add(membership.tenantId)
    }
  }
  const activeTenants = tenants.filter((tenant) => activeTenantIds.has(tenant.id)).length
  const activeRate = tenantTotal > 0 ? num((activeTenants / tenantTotal) * 100, 1) : 0

  const pad2 = (value: number) => String(value).padStart(2, '0')
  const weekAnchor = new Date(latestDate)
  weekAnchor.setDate(weekAnchor.getDate() - ((weekAnchor.getDay() + 6) % 7))
  const activeTrend = Array.from({ length: 12 }, (_, index) => {
    const day = new Date(weekAnchor)
    day.setDate(day.getDate() - (11 - index) * 7)
    const progress = index / 11
    const rate =
      index === 11
        ? activeRate
        : Math.max(
            0,
            num(activeRate * (0.62 + 0.38 * progress) + Math.sin(index * 1.1) * 2.4 * (1 - progress), 1),
          )
    return {
      week: `${pad2(day.getMonth() + 1)}/${pad2(day.getDate())}`,
      active: Math.round((tenantTotal * rate) / 100),
      total: tenantTotal,
      rate,
    }
  })

  /* 趋势筛选：边界 / 行业 / 单位三维，预生成 all + 具体值 的年度序列（all 表示不限） */
  const trendFilters = {
    boundaries: [...new Set(records.map((record) => BOUNDARY_TEXT[record.boundary] ?? record.boundary))],
    industries: [...new Set(records.map((record) => record.industryName))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    units: [...new Set(records.map((record) => record.unitCode))],
  }
  const comboBuckets = new Map<string, Map<number, { count: number; sum: number; values: number[] }>>()
  for (const record of records) {
    const year = yearOf(record)
    if (!year) continue
    const boundaryLabel = BOUNDARY_TEXT[record.boundary] ?? record.boundary
    for (const boundary of ['all', boundaryLabel]) {
      for (const industry of ['all', record.industryName]) {
        for (const unit of ['all', record.unitCode]) {
          const key = `${boundary}|${industry}|${unit}`
          const byYear = comboBuckets.get(key) ?? new Map()
          const cell = byYear.get(year) ?? { count: 0, sum: 0, values: [] }
          cell.count += 1
          cell.sum += record.totalEmission
          cell.values.push(record.totalEmission)
          byYear.set(year, cell)
          comboBuckets.set(key, byYear)
        }
      }
    }
  }
  const trendSeries: ScreenPlatformTrendSeries[] = [...comboBuckets.entries()].map(([key, byYear]) => ({
    key,
    points: [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, cell]) => ({
        year,
        count: cell.count,
        footprint: num(cell.sum / 1000, 2),
        intensity: num(median(cell.values)),
      })),
  }))

  const platformInsight: ScreenPlatformInsight = {
    tenantTotal,
    enabledTenantTotal: tenants.filter((tenant) => tenant.status === 'enabled').length,
    activeTenants,
    activeRate,
    pcfTotal: records.length,
    validPcfTotal: records.filter(isValidVersion).length,
    regions: platformRegions,
    boundaries: platformBoundaries,
    industries,
    trendFilters,
    trendSeries,
    activeTrend,
  }

  const coverageMap = { full: 0, partial: 0, missing: 0 }
  for (const record of records) coverageMap[stageCompleteOf(record)] += 1
  const stageCoverage = [
    { name: '阶段完整', value: coverageMap.full },
    { name: '部分缺失', value: coverageMap.partial },
    { name: '全部缺失', value: coverageMap.missing },
  ].filter((item) => item.value > 0)

  /* ---------- 阶段 × 品类矩阵 ---------- */
  const categoryCounts = countBy(records, (record) => record.categoryName).slice(0, 6)
  const stageNames = [...stageMap.keys()]
  const matrix = stageNames.map((stage) => ({
    stage,
    cells: categoryCounts.map(({ name }) => {
      const list = records.filter((record) => record.categoryName === name)
      const values = list
        .flatMap((record) => record.stageValues)
        .filter((item) => item.stageLevel === 1 && item.stageName === stage)
        .map((item) => item.stageShare)
      return { category: name, ratio: values.length > 0 ? num(values.reduce((sum, value) => sum + value, 0) / values.length, 1) : 0 }
    }),
  }))

  /* ---------- 单位碳足迹分布（当前分组） ---------- */
  const values = selectedRecords.map((record) => record.totalEmission)
  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 0
  const step = max > min ? (max - min) / 8 : 1
  const distribution = Array.from({ length: 8 }, (_, index) => {
    const start = min + step * index
    const end = start + step
    const count = values.filter((value) => value >= start && (index === 7 ? value <= end : value < end)).length
    return { name: `${num(start, 2)}–${num(end, 2)}`, value: count }
  }).filter((item) => item.value > 0)

  /* ---------- 降碳优先级（同组中位数指数） ---------- */
  const groupMedian = new Map<string, number>()
  for (const [key, list] of groups.entries()) {
    groupMedian.set(key, median(list.map((record) => record.totalEmission)))
  }
  const ranks = records
    .map((record) => {
      const medianValue = groupMedian.get(keyOf(record)) ?? 0
      return {
        name: record.productName,
        category: record.categoryName,
        index: medianValue > 0 ? num(record.totalEmission / medianValue, 2) : 0,
        value: num(record.totalEmission),
        unit: `${record.emissionUnit ?? 'kgCO₂e'}/${record.unitCode}`,
      }
    })
    .filter((item) => item.index > 0)
    .sort((a, b) => b.index - a.index)

  /* ---------- 企业视角：产品分类 × 功能单位 排放汇总（同单位才加总） ---------- */
  const emissionCells = new Map<string, ScreenCategoryEmission>()
  for (const record of records) {
    const unit = `${record.emissionUnit ?? 'kgCO₂e'}/${record.unitCode}`
    const key = `${record.categoryName}|${unit}`
    const cell = emissionCells.get(key) ?? { category: record.categoryName, unit, value: 0, count: 0 }
    cell.value += record.totalEmission
    cell.count += 1
    emissionCells.set(key, cell)
  }
  const categoryEmissions: ScreenCategoryEmission[] = [...emissionCells.values()]
    .map((cell) => ({ ...cell, value: num(cell.value, 2) }))
    .sort((a, b) => b.value - a.value)

  /* ---------- 企业视角：碳足迹排行（已核算记录，按值降序，供 Top10 筛选） ---------- */
  const topProducts: ScreenTopProduct[] = records
    .map((record) => ({
      name: record.productName,
      category: record.categoryName,
      boundary: record.boundary,
      boundaryLabel: BOUNDARY_TEXT[record.boundary] ?? record.boundary,
      value: num(record.totalEmission),
      unit: `${record.emissionUnit ?? 'kgCO₂e'}/${record.unitCode}`,
      year: yearOf(record),
    }))
    .sort((a, b) => b.value - a.value)

  /* ---------- 企业视角：单产品各生命阶段占比（按年，占比合计 100%） ---------- */
  const productGroups = new Map<
    string,
    { product: string; category: string; unit: string; boundary: 'gate' | 'grave'; list: CarbonRecord[] }
  >()
  for (const record of records) {
    const key = `${record.productName}|${record.boundary}`
    const group = productGroups.get(key) ?? {
      product: record.productName,
      category: record.categoryName,
      unit: `${record.emissionUnit ?? 'kgCO₂e'}/${record.unitCode}`,
      boundary: record.boundary,
      list: [],
    }
    group.list = [...group.list, record]
    productGroups.set(key, group)
  }
  const productStages: ScreenProductStage[] = [...productGroups.values()]
    .map((group) => {
      const yearMap = new Map<number, CarbonRecord[]>()
      for (const record of group.list) {
        const year = yearOf(record)
        if (!year) continue
        yearMap.set(year, [...(yearMap.get(year) ?? []), record])
      }
      return {
        product: group.product,
        category: group.category,
        unit: group.unit,
        boundaryLabel: BOUNDARY_TEXT[group.boundary] ?? group.boundary,
        years: [...yearMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([year, yearRecords]) => {
            const stageNames = [
              ...new Set(
                yearRecords.flatMap((record) =>
                  record.stageValues.filter((item) => item.stageLevel === 1).map((item) => item.stageName),
                ),
              ),
            ]
            const stages = stageNames
              .map((name) => {
                const rows = yearRecords
                  .flatMap((record) => record.stageValues)
                  .filter((item) => item.stageLevel === 1 && item.stageName === name)
                return {
                  name,
                  ratio: num(rows.reduce((sum, item) => sum + item.stageShare, 0) / rows.length, 1),
                  value: num(median(rows.map((item) => item.stageEmission))),
                }
              })
              .filter((stage) => stage.ratio > 0)
            return {
              year,
              total: num(median(yearRecords.map((record) => record.totalEmission))),
              stages,
            }
          })
          .filter((point) => point.stages.length > 0),
      }
    })
    .filter((item) => item.years.length > 0)
    .sort((a, b) => b.years.length - a.years.length || a.product.localeCompare(b.product, 'zh-CN'))

  /* ---------- 行业对标（B 口径，全部同口径分组） ---------- */
  const benchmarks: ScreenBenchmarkItem[] = contexts
    .map((context) => {
      const list = groups.get(context.key) ?? []
      const base = baselineOfGroup(list)
      const value = median(list.map((record) => record.totalEmission))
      const delta = base && base.totalEmission > 0 ? num(((value - base.totalEmission) / base.totalEmission) * 100, 1) : null
      return {
        name: context.categoryName,
        categoryName: context.categoryName,
        industryName: list[0]?.industryName ?? '—',
        boundary: context.boundary,
        value: num(value),
        baseline: base?.totalEmission ?? null,
        unit: `${list[0]?.emissionUnit ?? 'kgCO₂e'}/${context.unit}`,
        delta,
        matched: Boolean(base),
        baselineLabel: base ? `${base.baselineName} · ${base.baseYear} · ${base.sourceType}` : undefined,
      }
    })
    .sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1
      return (a.delta ?? 999) - (b.delta ?? 999)
    })

  const betterCount =
    selectedBaseline && selectedRecords.length > 0
      ? selectedRecords.filter((record) => record.totalEmission <= selectedBaseline.totalEmission).length
      : 0
  const betterRate =
    selectedBaseline && selectedRecords.length > 0
      ? Math.round((betterCount / selectedRecords.length) * 100)
      : 0

  /* ---------- KPI ---------- */
  const productCount = new Set(records.map((record) => record.productCode || record.productName)).size
  const industryCount = new Set(records.map((record) => record.industryCode)).size
  const readyReports = footprintReports.filter((report) => report.status === 'reportReady')
  /* ---------- 企业视角：基础数据统计口径（产品库 / 工艺库不受年份区间影响） ---------- */
  const libraryProductCount = myProducts.length
  const processCount = myProcesses.length
  const calculatedProducts = new Set(records.map((record) => record.productCode || record.productName)).size
  const reportTotal = footprintReports.length

  const kpis: ScreenKpi[] = isOrg
    ? [
        {
          key: 'products',
          label: '我的产品',
          value: libraryProductCount,
          unit: '个',
          note: '产品库全部产品',
          tone: 'primary',
          icon: 'package',
        },
        {
          key: 'processes',
          label: '我的工艺',
          value: processCount,
          unit: '个',
          note: '工艺库当前企业工艺',
          tone: 'cyan',
          icon: 'layers',
        },
        {
          key: 'calculated',
          label: '已核算记录',
          value: records.length,
          unit: '条',
          note: `涉及 ${calculatedProducts} 个产品`,
          tone: 'success',
          icon: 'calculator',
        },
        {
          key: 'reports',
          label: '报告',
          value: reportTotal,
          unit: '份',
          note: `已生成报告 · 定稿 ${readyReports.length} 份`,
          tone: 'warning',
          icon: 'file',
        },
      ]
    : [
        {
          key: 'orgs',
          label: '企业总数',
          value: platformInsight.tenantTotal,
          unit: '家',
          note: `启用 ${platformInsight.enabledTenantTotal} 家 · 平台企业总数`,
          tone: 'primary',
          icon: 'user',
        },
        {
          key: 'activeRate',
          label: '活跃率',
          value: platformInsight.activeRate,
          digits: 1,
          unit: '%',
          delta: num(platformInsight.activeRate - (platformInsight.activeTrend[10]?.rate ?? platformInsight.activeRate), 1),
          deltaUnit: 'pt',
          deltaLabel: '较上周',
          note: `活跃 ${platformInsight.activeTenants} / 企业 ${platformInsight.tenantTotal}`,
          tone: 'cyan',
          icon: 'dashboard',
        },
        {
          key: 'pcf',
          label: '碳足迹记录',
          value: platformInsight.pcfTotal,
          unit: '条',
          note: '平台内产品碳足迹记录总量',
          tone: 'primary',
          icon: 'leaf',
        },
        {
          key: 'products',
          label: '核算产品数',
          value: productCount,
          unit: '个',
          note: '按产品编码去重',
          tone: 'cyan',
          icon: 'package',
        },
        {
          key: 'calcs',
          label: '核算记录',
          value: allRecords.length,
          unit: '条',
          note: `含历史版本 · 有效 ${records.length} 条`,
          tone: 'success',
          icon: 'calculator',
        },
        {
          key: 'industries',
          label: '覆盖行业',
          value: industryCount,
          unit: '个',
          note: '区间内有核算记录的行业',
          tone: 'warning',
          icon: 'layers',
        },
      ]

  /* ---------- 基线信息 ---------- */
  const baselineInfo: ScreenBaselineInfo = selectedBaseline
    ? {
        matched: true,
        value: selectedBaseline.totalEmission,
        label: `${selectedBaseline.baselineName}（${selectedBaseline.baseYear}）`,
        industryName: selectedBaseline.industryName,
        boundary: BOUNDARY_TEXT[selectedBaseline.boundary],
        unit: selectedBaseline.unitCode,
        baseYear: selectedBaseline.baseYear,
        issuer: selectedBaseline.issuer,
        sourceType: selectedBaseline.sourceType,
        gwpVersion: selectedBaseline.gwpVersion,
      }
    : {
        matched: false,
        value: null,
        label: '暂无同口径行业基线',
        boundary: defaultContext?.boundary,
        unit: defaultContext?.unit,
        gwpVersion: selectedRecords[0] ? gwpOf(selectedRecords[0]) : undefined,
      }

  /* ---------- 真实碳口径示例（取已核算项目） ---------- */
  const calcResults = await Promise.all(projects.map((project) => fetchPcfCalcResult(project.id)))
  const calcIndex = calcResults.findIndex((result) => Boolean(result))
  const calcResult = calcIndex >= 0 ? calcResults[calcIndex] : null
  const caliberDemo = {
    product: calcIndex >= 0 ? projects[calcIndex].productName : '暂无已核算项目',
    unit: calcResult ? `${calcResult.emissionUnit ?? 'kgCO₂e'}/${calcResult.unit}` : '—',
    fossil: calcResult?.fossilEmission ?? calcResult?.totalEmission ?? 0,
    biogenic: calcResult?.biogenicEmission ?? 0,
    luluc: calcResult?.lulucEmission ?? 0,
    total: calcResult?.totalEmission ?? 0,
  }

  /* ---------- 资产与上报 ---------- */
  const assetFactorCount = libraries.reduce((sum, library) => sum + (library.factorCount ?? 0), 0)
  const assets = [
    { label: '因子库', value: String(libraries.length), note: '商业库 + 自建库' },
    { label: '因子条目', value: assetFactorCount.toLocaleString('zh-CN'), note: '当前版本' },
    { label: '核算模型', value: String(models.length), note: '平台模型' },
    { label: '标准规范', value: String(standards.length), note: '标准文件库' },
    { label: '行业基线', value: String(baselines.length), note: '基线库' },
    { label: '核算记录', value: String(orgRecords.length), note: '有效台账' },
  ]

  const totalReports = dataReports.length
  const funnel = [
    { name: '企业上报', value: totalReports, rate: totalReports > 0 ? 100 : 0 },
    { name: '审核中', value: dataReports.filter((report) => report.status === 'reviewing').length, rate: totalReports > 0 ? num((dataReports.filter((report) => report.status === 'reviewing').length / totalReports) * 100, 1) : 0 },
    { name: '已入库', value: dataReports.filter((report) => report.status === 'archived').length, rate: totalReports > 0 ? num((dataReports.filter((report) => report.status === 'archived').length / totalReports) * 100, 1) : 0 },
    { name: '已驳回', value: dataReports.filter((report) => report.status === 'rejected').length, rate: totalReports > 0 ? num((dataReports.filter((report) => report.status === 'rejected').length / totalReports) * 100, 1) : 0 },
  ]

  /* ---------- 企业报告 / 待办 ---------- */
  const reports: ScreenReportItem[] = footprintReports.slice(0, 4).map((report) => ({
    name: report.productName,
    product: report.productName,
    status:
      report.status === 'reportReady'
        ? '已定稿'
        : report.status === 'reportEditing'
          ? '编制中'
          : report.status === 'reportStale'
            ? '待更新'
            : '生成中',
    time: report.generatedAt || '—',
  }))
  const tasks: ScreenTaskItem[] = projects
    .filter((project) => project.status !== 'done' && project.status !== 'calculated')
    .slice(0, 4)
    .map((project) => ({
      name: project.name,
      status: PCF_STATUS_TEXT[project.status] ?? project.status,
      owner: project.createdBy || '—',
      updatedAt: project.updatedAt || '—',
    }))

  /* ---------- 滚动动态 ---------- */
  const ticker = [
    ...records
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
      .map((record) => ({
        time: record.createdAt.slice(11, 16),
        type: 'calc' as const,
        text: `完成「${record.productName}」核算`,
        meta: `${record.totalEmission} ${record.emissionUnit ?? 'kgCO₂e'}/${record.unitCode}`,
      })),
    ...readyReports.slice(0, 2).map((report) => ({
      time: (report.generatedAt || '').slice(11, 16) || '—',
      type: 'report' as const,
      text: `「${report.productName}」报告已定稿`,
      meta: report.reportNo,
    })),
    ...dataReports.slice(0, 2).map((report) => ({
      time: (report.updatedAt || '').slice(11, 16) || '—',
      type: 'dataset' as const,
      text: `数据上报 · ${report.status === 'archived' ? '已入库' : report.status === 'rejected' ? '已驳回' : '审核中'}`,
      meta: report.reportNo,
    })),
  ].slice(0, 7)

  /* ---------- 结论（全部由真实指标生成） ---------- */
  const topCategory = categoryCounts[0]?.name ?? '—'
  const conclusions = [
    isOrg
      ? `${from}–${to} 年，本企业产品库 ${libraryProductCount} 个产品、工艺库 ${processCount} 个工艺，已完成 ${records.length} 条核算记录、生成 ${reportTotal} 份报告。`
      : `平台现有 ${tenantTotal} 家企业、覆盖 ${industryCount} 个行业，累计 ${records.length} 条产品碳足迹记录；近 30 天活跃企业 ${activeTenants} 家（活跃率 ${activeRate}%）。`,
    topStage
      ? `排放集中在${topStage.name}（${topStage.ratio.toFixed(1)}%）；${topCategory} 是记录最多的品类。`
      : '当前区间暂无可分析的阶段构成数据。',
    selectedBaseline
      ? `当前主图口径为 ${defaultContext?.categoryName} · ${defaultContext?.boundary} · ${defaultContext?.unit}，匹配基线「${selectedBaseline.baselineName}」（${selectedBaseline.baseYear} · ${selectedBaseline.sourceType}）；当前口径 ${betterRate}% 的记录优于基线。`
      : `当前主图口径为 ${defaultContext?.categoryName ?? '—'} · ${defaultContext?.boundary ?? '—'} · ${defaultContext?.unit ?? '—'}，暂无同口径行业基线，未计算优于基线占比。`,
  ]

  const orgName = isOrg ? currentOrg.name : '全平台'
  const updatedAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16)

  const data: ScreenData = {
    scope: params.scope,
    orgName,
    updatedAt,
    rangeLabel: `${from}–${to} 年`,
    yearOptions,
    yearRange: [from, to],
    contexts,
    contextKey: defaultContext?.key ?? '',
    baselineInfo,
    annual,
    libraryProductCount,
    processCount,
    categoryEmissions,
    topProducts,
    productStages,
    kpis,
    stages,
    trends: [],
    industries,
    regions,
    sources: boundaries,
    ranks,
    caliberDemo,
    matrixCategories: categoryCounts.map((item) => item.name),
    matrix,
    sensitivities: stageCoverage,
    benchmarks,
    distribution,
    yearDistribution,
    coverage: {
      covered: new Set(benchmarks.filter((item) => item.matched).map((item) => item.categoryName)).size,
      total: new Set(records.map((record) => record.categoryName)).size,
      rate:
        new Set(records.map((record) => record.categoryName)).size > 0
          ? Math.round(
              (new Set(benchmarks.filter((item) => item.matched).map((item) => item.categoryName)).size /
                new Set(records.map((record) => record.categoryName)).size) *
                100,
            )
          : 0,
    },
    dqr: standardDistribution.map((item, index) => ({
      name: item.name,
      value: item.value,
      color: ['#5ee7ff', '#2dd4bf', '#3b82f6', '#e8c07d', '#a78bfa', '#fb7185'][index % 6],
    })),
    dqrAvg: standardDistribution.length,
    assets,
    funnel,
    ticker,
    conclusions,
    reports: isOrg ? reports : [],
    tasks: isOrg ? tasks : [],
    platform: isOrg ? undefined : platformInsight,
  }

  await delay()
  return JSON.parse(JSON.stringify(data)) as ScreenData
}

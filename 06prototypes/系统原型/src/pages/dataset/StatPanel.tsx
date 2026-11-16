import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { EChart, Icon, Select } from '@/shared/components'
import type { IconName } from '@/shared/components'
import type { Boundary, CarbonRecord } from '@/types/dataset'
import { BOUNDARY_TEXT, numText, periodYear, provinceOf } from './datasetMeta'
import { buildStatModel } from './statAnalytics'
import type { GroupKey, StatGroup, StatModel } from './statAnalytics'
import './DatasetPage.css'

/**
 * 行业数据集 · 统计分析（支持条件选择）。
 *
 * 结构：统计条件条（时间范围 + 行业 / 地域 / 产品类别，切换后统计全量重算）
 *      → 口径提示 → 口径切换（系统边界 + 单位，同一行）→ 四个关键指标（n / 均值 / 中位数 / 离散度）
 *      → 点图（每条记录一个圆点）+ 直方图（KDE 曲线）→ 分布摘要与正态性诊断
 *      → 维度对比：按行业 / 按地域 / 按产品类别 / 按工艺 / 按年度。
 * 统计范围 = 平台最新发布版本中「符合所选条件」的同口径样本集。
 *
 * 筛选与拆分解耦：筛选直接收窄统计范围（含维度对比），下方对比图仍按所选维度拆分；
 * 两者重叠时在图表下方提示「该维度已被筛选」，不置灰、不隐藏控件。
 */

interface StatPanelProps {
  records: CarbonRecord[]
}

const GROUP_TABS: { key: GroupKey; label: string; hint: string }[] = [
  { key: 'industry', label: '按行业', hint: '各行业均值对比，±% 为相对当前范围均值的偏差' },
  { key: 'region', label: '按地域', hint: '各省份均值对比，误差棒为标准差，±% 为相对当前范围均值的偏差' },
  { key: 'category', label: '按产品类别', hint: '各产品类别均值对比，±% 为相对当前范围均值的偏差' },
  { key: 'process', label: '按工艺', hint: '各工艺均值对比；一条记录可计入多个工艺，各组 n 之和可大于样本数' },
  { key: 'year', label: '按年度', hint: '各年度样本批次均值对比（横截面，非同一批企业，不能当作趋势）' },
]

/** 时间范围：最近 12 / 24 个月以数据中的最新年度为基准（数据年度粒度） */
type TimeRangeKey = 'all' | 'recent12' | 'recent24' | 'custom'

const TIME_RANGE_OPTIONS = [
  { value: 'all', label: '全部年度' },
  { value: 'recent12', label: '最近 12 个月' },
  { value: 'recent24', label: '最近 24 个月' },
  { value: 'custom', label: '自定义年度区间' },
]

/** 统计条件（系统边界单独用分段控件切换） */
interface StatConditions {
  industry: string
  region: string
  category: string
}

const EMPTY_CONDITIONS: StatConditions = { industry: '', region: '', category: '' }


/** 主题色：主数据蓝、异常值红、基准/参考灰、密度曲线橙 */
const COLOR = {
  primary: '#1890ff',
  primaryLight: '#69b1ff',
  primaryFaint: 'rgba(24, 144, 255, 0.30)',
  text: '#262626',
  secondary: '#595959',
  tertiary: '#8c8c8c',
  axis: '#d9d9d9',
  split: '#f0f0f0',
  warning: '#fa8c16',
  danger: '#ff4d4f',
  reference: '#8c8c8c',
}

const TOOLTIP_BASE = {
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  borderColor: '#e8e8e8',
  borderWidth: 1,
  padding: [8, 12] as [number, number],
  textStyle: { color: COLOR.text, fontSize: 12 },
  extraCssText: 'box-shadow:0 6px 16px rgba(0,0,0,0.08);border-radius:6px;',
}

/* ============================ 面板 ============================ */

export function StatPanel({ records }: StatPanelProps) {
  const [groupKey, setGroupKey] = useState<GroupKey>('region')

  /* ---------- ① 统计条件：时间范围 + 行业 / 地域 / 产品类别（切换后全部分析重算） ---------- */
  const [conditions, setConditions] = useState<StatConditions>(EMPTY_CONDITIONS)
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const industryOptions = useMemo(() => uniqueText(records.map((record) => record.industryName)), [records])
  const regionOptions = useMemo(() => uniqueText(records.map((record) => provinceOf(record.regionName))), [records])
  const categoryOptions = useMemo(
    () => uniqueText(records.map((record) => record.categoryName || record.categoryPath)),
    [records],
  )

  /* ---------- ①-2 时间范围：数据年度粒度，最近 12 / 24 个月按最新年度倒推 ---------- */
  const dataYears = useMemo(() => {
    const years = records.map((record) => periodYear(record)).filter((year) => Number.isFinite(year) && year > 0)
    return [...new Set(years)].sort((a, b) => a - b)
  }, [records])

  const timeWindow = useMemo(() => {
    if (timeRange === 'all' || dataYears.length === 0) return undefined
    const latest = dataYears[dataYears.length - 1]
    if (timeRange === 'recent12') return { from: latest, to: latest }
    if (timeRange === 'recent24') return { from: latest - 1, to: latest }
    const from = Number(customFrom) || dataYears[0]
    const to = Number(customTo) || latest
    return { from: Math.min(from, to), to: Math.max(from, to) }
  }, [timeRange, dataYears, customFrom, customTo])

  /* ---------- ①-3 筛选与拆分解耦：筛选只收窄范围，对比图仍按所选维度拆分 ---------- */
  const conditionedRecords = useMemo(
    () =>
      records.filter((record) => {
        if (conditions.industry && record.industryName !== conditions.industry) return false
        // 区域统一按省级比对，与列表筛选同口径
        if (conditions.region && provinceOf(record.regionName) !== conditions.region) return false
        if (conditions.category && (record.categoryName || record.categoryPath) !== conditions.category) return false
        if (timeWindow) {
          const year = periodYear(record)
          if (!(year >= timeWindow.from && year <= timeWindow.to)) return false
        }
        return true
      }),
    [records, conditions, timeWindow],
  )
  const hasConditions =
    conditions.industry !== '' || conditions.region !== '' || conditions.category !== '' || timeRange !== 'all'

  /* ---------- ② 系统边界：不同边界分开统计 ---------- */
  const boundaryOptions = useMemo(() => {
    const map = new Map<Boundary, number>()
    for (const record of conditionedRecords) map.set(record.boundary, (map.get(record.boundary) ?? 0) + 1)
    return [...map.entries()]
      .map(([boundary, count]) => ({ boundary, count, text: BOUNDARY_TEXT[boundary] }))
      .sort((a, b) => (a.boundary === 'gate' ? -1 : b.boundary === 'gate' ? 1 : 0))
  }, [conditionedRecords])
  const [boundary, setBoundary] = useState<Boundary | ''>('')
  // 所选边界在当前条件下无数据时回落到首个可选边界，避免整页空白
  const activeBoundary =
    boundary && boundaryOptions.some((option) => option.boundary === boundary)
      ? boundary
      : boundaryOptions[0]?.boundary || ''
  const activeRecords = useMemo(
    () => conditionedRecords.filter((record) => record.boundary === activeBoundary),
    [conditionedRecords, activeBoundary],
  )
  /* ---------- ②-2 声明单位：本期不做换算，不同单位各自成桶、分别统计 ---------- */
  const [unitKey, setUnitKey] = useState('')
  const model = useMemo(() => buildStatModel(activeRecords, unitKey), [activeRecords, unitKey])

  const swarmOption = useMemo(() => buildSwarmOption(model), [model])
  const histogramOption = useMemo(() => buildHistogramOption(model), [model])
  const groupOption = useMemo(() => {
    if (groupKey === 'region') return buildRegionOption(model)
    if (groupKey === 'industry') return buildBarOption(model, model.industryGroups, '行业均值')
    if (groupKey === 'category') return buildBarOption(model, model.categoryGroups, '类别均值')
    if (groupKey === 'process') return buildBarOption(model, model.processGroups, '工艺均值')
    // 年度只做横截面批次对比，不用折线，避免被读成趋势
    return buildBarOption(model, model.yearGroups, '年度均值')
  }, [model, groupKey])

  const { stats } = model
  const unitText = model.unit ? `${model.emissionUnit}/${model.unit}` : model.emissionUnit

  const years = model.yearGroups
  const latestYear = years.length > 0 ? years[years.length - 1] : undefined
  const prevYear = years.length > 1 ? years[years.length - 2] : undefined
  const meanMedianGap = stats.median - stats.mean
  const dispersionLevel = cvLevel(stats.cv)

  // 拆分维度已被筛选收窄时给出提示，解释为什么只剩一组
  const scopeNotes = [
    groupKey === 'industry' && conditions.industry ? `行业已筛选为「${conditions.industry}」` : '',
    groupKey === 'region' && conditions.region ? `地域已筛选为「${conditions.region}」` : '',
    groupKey === 'category' && conditions.category ? `产品类别已筛选为「${conditions.category}」` : '',
    groupKey === 'year' && timeWindow ? `时间范围已限定 ${timeWindow.from}–${timeWindow.to} 年` : '',
  ].filter(Boolean)

  const distribution = [
    { label: '最大值', value: stats.max },
    { label: '均值', value: stats.mean },
    { label: '中位数', value: stats.median },
    { label: '最小值', value: stats.min },
    { label: '标准差', value: stats.stdDev },
  ]

  return (
    <div className="ds-stat">
      {/* 统计条件条：时间范围 + 行业 / 地域 / 产品类别，与下方对比维度互斥 */}
      <div className="ds-cond-bar" data-ann-target="dataset.records.stat.conditions">
        <span className="ds-boundary-label">统计条件</span>
        <label className="ds-cond-item">
          <span>时间范围</span>
          <Select
            value={timeRange}
            options={TIME_RANGE_OPTIONS}
            onChange={(event) => setTimeRange(event.target.value as TimeRangeKey)}
          />
        </label>
        {timeRange === 'custom' && (
          <>
            <label className="ds-cond-item ds-cond-item-year">
              <span>起始年</span>
              <Select
                value={customFrom}
                options={[
                  { value: '', label: '最早' },
                  ...dataYears.map((year) => ({ value: String(year), label: `${year} 年` })),
                ]}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </label>
            <label className="ds-cond-item ds-cond-item-year">
              <span>截止年</span>
              <Select
                value={customTo}
                options={[
                  { value: '', label: '最新' },
                  ...dataYears.map((year) => ({ value: String(year), label: `${year} 年` })),
                ]}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </label>
          </>
        )}
        <label className="ds-cond-item">
          <span>所属行业</span>
          <Select
            value={conditions.industry}
            options={[{ value: '', label: '全部行业' }, ...industryOptions.map((name) => ({ value: name, label: name }))]}
            onChange={(event) => setConditions((prev) => ({ ...prev, industry: event.target.value }))}
          />
        </label>
        <label className="ds-cond-item">
          <span>地域</span>
          <Select
            value={conditions.region}
            options={[{ value: '', label: '全部区域' }, ...regionOptions.map((name) => ({ value: name, label: name }))]}
            onChange={(event) => setConditions((prev) => ({ ...prev, region: event.target.value }))}
          />
        </label>
        <label className="ds-cond-item">
          <span>产品类别</span>
          <Select
            value={conditions.category}
            options={[{ value: '', label: '全部类别' }, ...categoryOptions.map((name) => ({ value: name, label: name }))]}
            onChange={(event) => setConditions((prev) => ({ ...prev, category: event.target.value }))}
          />
        </label>
        <button
          type="button"
          className="ds-cond-reset"
          disabled={!hasConditions}
          onClick={() => {
            setConditions(EMPTY_CONDITIONS)
            setTimeRange('all')
            setCustomFrom('')
            setCustomTo('')
          }}
        >
          重置条件
        </button>
        <span className="ds-cond-meta">
          {timeWindow ? `${timeWindow.from}–${timeWindow.to} 年 · ` : ''}命中 {conditionedRecords.length} /{' '}
          {records.length} 条数据
        </span>
      </div>

      {/* 口径提示：明示「参与统计 / 被排除」，避免命中数与样本量对不上 */}
      <div className="ds-caliber-bar" data-ann-target="dataset.records.stat.caliber">
        <span className="ds-caliber-dot" aria-hidden />
        <span>
          当前统计范围：{model.boundaryText} · {unitText} · 参与统计 {model.realCount} 条
          {model.simulated ? `（另示意补足 ${stats.n - model.realCount} 条）` : ''}
        </span>
        <span className="ds-caliber-meta">
          {timeWindow ? `${timeWindow.from}–${timeWindow.to} 年` : '全部年度'} · 命中 {conditionedRecords.length} 条
        </span>
        {model.excluded.total > 0 && (
          <details className="ds-exclude">
            <summary>已排除 {model.excluded.total} 条，查看原因</summary>
            <div className="ds-exclude-body">
              {model.excluded.byUnit > 0 && (
                <span>
                  声明单位不一致 {model.excluded.byUnit} 条：不同单位不做换算、不合并，请切换上方「单位」分开查看
                </span>
              )}
              {model.excluded.byGwp > 0 && <span>GWP 版本不一致 {model.excluded.byGwp} 条</span>}
              {model.excluded.byEmissionUnit > 0 && (
                <span>排放分子单位不一致 {model.excluded.byEmissionUnit} 条</span>
              )}
              {model.excluded.byStatus > 0 && (
                <span>非「有效」状态（已替代 / 作废）{model.excluded.byStatus} 条</span>
              )}
            </div>
          </details>
        )}
      </div>

      {/* 口径切换：系统边界 + 单位同处一行；本期不换算，跨单位不可合并，只能分开统计 */}
      <div className="ds-boundary-bar ds-scope-bar" data-ann-target="dataset.records.stat.boundary">
        <span className="ds-boundary-label">系统边界</span>
        <div className="ds-seg" role="tablist" aria-label="系统边界">
          {boundaryOptions.map((option) => (
            <button
              key={option.boundary}
              type="button"
              role="tab"
              aria-selected={activeBoundary === option.boundary}
              className={activeBoundary === option.boundary ? 'ds-seg-active' : undefined}
              onClick={() => setBoundary(option.boundary)}
            >
              {option.text}
              <span className="ds-boundary-count">{option.count}</span>
            </button>
          ))}
        </div>

        {model.buckets.length > 0 && (
          <div className="ds-scope-unit" data-ann-target="dataset.records.stat.unit">
            <span className="ds-boundary-label">单位</span>
            <div className="ds-seg" role="tablist" aria-label="单位">
              {model.buckets.map((bucket) => (
                <button
                  key={bucket.key}
                  type="button"
                  role="tab"
                  aria-selected={model.activeKey === bucket.key}
                  className={model.activeKey === bucket.key ? 'ds-seg-active' : undefined}
                  onClick={() => setUnitKey(bucket.key)}
                  title={`${bucket.emissionUnit}/${bucket.unitCode || '未填单位'} · ${bucket.gwpVersion || '未填 GWP'}`}
                >
                  {bucket.unitCode || '未填单位'}
                  <span className="ds-boundary-count">{bucket.n}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <span className="ds-boundary-tip">
          {model.mixedUnits
            ? `${model.buckets.length} 种单位不换算、不合并，与系统边界一样分开统计`
            : '不同边界分开统计，单位一致，可直接统计'}
        </span>
      </div>

      {stats.n === 0 ? (
        <div className="ds-stat-empty">
          {records.length === 0
            ? '平台尚未发布行业数据集，发布后可在此查看统计结果'
            : '所选统计条件下暂无数据，请调整行业 / 地域 / 产品类别 / 系统边界条件'}
        </div>
      ) : (
        <>
          {/* ② 四个关键指标 */}
          <div className="ds-metric-grid">
            <MetricCard
              annTarget="dataset.records.stat.n"
              icon="database"
              label="样本数 n"
              value={stats.n}
              unit={
                model.simulated
                  ? `条同口径记录（真实 ${model.realCount} 条 + 示意补足）`
                  : '条同口径记录'
              }
              aux={`覆盖 ${model.industryGroups.length} 个行业 · ${model.regionGroups.length} 个省份 · ${years.length} 个年度`}
            />
            <MetricCard
              annTarget="dataset.records.stat.mean"
              icon="scale"
              label="均值"
              value={numText(stats.mean, 2)}
              unit={unitText}
              aux={
                latestYear && prevYear
                  ? `最新批次 ${latestYear.key} 年 ${fixed2(latestYear.mean)}（横截面）`
                  : `当前范围均值 ${numText(stats.mean, 2)}`
              }
            />
            <MetricCard
              annTarget="dataset.records.stat.median"
              icon="chart"
              label="中位数"
              tag="代表性水平"
              value={numText(stats.median, 2)}
              unit={unitText}
              primary
              aux={`与均值偏差 ${signed(meanMedianGap)}`}
            />
            <MetricCard
              annTarget="dataset.records.stat.dispersion"
              icon="target"
              label="离散度"
              tag="CV / 标准差"
              value={stats.cv !== undefined ? stats.cv.toFixed(1) : '—'}
              suffix={stats.cv !== undefined ? '%' : undefined}
              unit={`标准差 ${stats.stdDev !== undefined ? numText(stats.stdDev, 2) : '—'} · 数值越小越集中`}
              aux={`典型区间 ${fixed2(stats.mean - (stats.stdDev ?? 0))} ~ ${fixed2(
                stats.mean + (stats.stdDev ?? 0),
              )} · 数据${dispersionLevel}`}
            />
          </div>

          {/* ③ 分布特征：点图（一圆一条记录）+ 直方图（KDE 曲线） */}
          <div className="ds-chart-grid">
            <section className="ds-chart-card" data-ann-target="dataset.records.stat.swarm">
              <div className="ds-chart-head">
                <h3>点图</h3>
                <p>分布特征：一个圆点代表一条记录，密集处即为常见取值</p>
                {model.simulated && <span className="ds-chart-flag">示意补足</span>}
              </div>
              <EChart option={swarmOption} height={320} />
              <div className="ds-chart-foot">
                <span>圆点：{stats.n} 条记录</span>
                <span>
                  <i className="ds-dot ds-dot-warn" />
                  均值 {numText(stats.mean, 2)}
                </span>
                <span>
                  <i className="ds-dot ds-dot-primary" />
                  中位数 {numText(stats.median, 2)}
                </span>
              </div>
            </section>

            <section className="ds-chart-card" data-ann-target="dataset.records.stat.histogram">
              <div className="ds-chart-head">
                <h3>直方图</h3>
                <p>分布特征：展示碳排放数值的频率分布</p>
                {model.simulated && <span className="ds-chart-flag">示意补足</span>}
              </div>
              <EChart option={histogramOption} height={320} />
              <div className="ds-chart-foot">
                <span>
                  <i className="ds-dot ds-dot-warn" />
                  均值 {numText(stats.mean, 2)}
                </span>
                <span>
                  <i className="ds-dot ds-dot-primary" />
                  中位数 {numText(stats.median, 2)}
                </span>
                <span className="ds-chart-foot-note">分箱数 {stats.histogram.length}（ceil√n）</span>
              </div>
            </section>
          </div>

          {/* ④ 分布摘要：极值 / 均值 / 中位数 / 标准差 */}
          <div className="ds-dist-strip" data-ann-target="dataset.records.stat.distribution">
            {distribution.map((item) => (
              <div className="ds-dist-item" key={item.label}>
                <span className="ds-dist-label">{item.label}</span>
                <span className="ds-dist-value">{fixed2(item.value)}</span>
              </div>
            ))}
            <div className="ds-dist-note">
              数值范围 {fixed2(stats.min)} ~ {fixed2(stats.max)} · 均值 {fixed2(stats.mean)} · 标准差{' '}
              {fixed2(stats.stdDev)}
            </div>
          </div>

          {/* ⑤ 维度对比：切换即出图，无筛选弹窗 */}
          <section className="ds-chart-card" data-ann-target="dataset.records.stat.groups">
            <div className="ds-group-head">
              <div className="ds-chart-head ds-chart-head-inline">
                <h3>维度对比</h3>
                <p>{GROUP_TABS.find((tab) => tab.key === groupKey)?.hint}</p>
              </div>
              <div className="ds-seg" role="tablist" aria-label="统计维度">
                {GROUP_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={groupKey === tab.key}
                    className={groupKey === tab.key ? 'ds-seg-active' : undefined}
                    onClick={() => setGroupKey(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <EChart option={groupOption} height={320} />
            <div className="ds-chart-foot">
              <span>n = 组内样本数</span>
              <span>±% = 相对当前范围均值（{fixed2(stats.mean)}）的偏差</span>
              <span className="ds-chart-foot-note">
                {scopeNotes.length > 0
                  ? `${scopeNotes.join('；')}，图表只反映筛选后的范围`
                  : `当前按${GROUP_TABS.find((tab) => tab.key === groupKey)?.label.replace('按', '')}拆分`}
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

/* ============================ KPI 卡 ============================ */

interface MetricCardProps {
  icon: IconName
  label: string
  value: ReactNode
  suffix?: string
  unit: string
  aux: string
  tag?: string
  primary?: boolean
  /** 批注锚点（data-ann-target 值） */
  annTarget?: string
}

function MetricCard({ icon, label, value, suffix, unit, aux, tag, primary, annTarget }: MetricCardProps) {
  return (
    <div className={primary ? 'ds-metric ds-metric-primary' : 'ds-metric'} data-ann-target={annTarget}>
      <div className="ds-metric-top">
        <span className="ds-metric-icon">
          <Icon name={icon} size={15} />
        </span>
        <span className="ds-metric-label">{label}</span>
        {tag && <em className="ds-metric-tag">{tag}</em>}
      </div>
      <span className="ds-metric-value">
        {value}
        {suffix && <small>{suffix}</small>}
      </span>
      <span className="ds-metric-unit">{unit}</span>
      <span className="ds-metric-aux">{aux}</span>
    </div>
  )
}

/* ============================ ECharts Option ============================ */

function categoryAxis(data: string[], fontSize = 11): Record<string, unknown> {
  return {
    type: 'category',
    data,
    axisLine: { lineStyle: { color: COLOR.axis } },
    axisTick: { show: false },
    axisLabel: { color: COLOR.secondary, fontSize, interval: 0, margin: 10 },
  }
}

function valueAxis(name: string, options: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'value',
    name,
    nameTextStyle: { color: COLOR.tertiary, fontSize: 11, align: 'left', padding: [0, 0, 6, 0] },
    axisLabel: { color: COLOR.tertiary, fontSize: 11 },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: COLOR.split } },
    ...options,
  }
}

/** 点图（蜂群）：一条记录一个圆点，密集区间左右铺开，叠加均值/中位数参考线 */
function buildSwarmOption(model: StatModel): EChartsOption {
  const { stats } = model
  const unitLabel = model.unit ? `1 ${model.unit}` : '声明单位'
  const unitText = model.unit ? `${model.emissionUnit}/${model.unit}` : model.emissionUnit
  const points = swarmLayout(model.samples.map((sample) => sample.value))
  const valueText = (value: number) => `${numText(value, 2)} ${unitText}`

  const option = {
    animationDuration: 420,
    grid: { left: 18, right: 92, top: 26, bottom: 18, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as { seriesName?: string; value?: number[] }
        if (!Array.isArray(item.value)) return ''
        if (item.seriesName === '样本点') return `<b>一条记录</b><br/>碳足迹：${valueText(item.value[1])}`
        if (item.seriesName === '均值') return `<b>均值</b><br/>碳足迹：${valueText(stats.mean)}`
        if (item.seriesName === '中位数') return `<b>中位数</b><br/>碳足迹：${valueText(stats.median)}`
        return ''
      },
    },
    xAxis: categoryAxis([unitLabel], 12),
    yAxis: valueAxis(unitText, { scale: true, splitNumber: 8 }),
    series: [
      {
        name: '样本点',
        type: 'custom',
        z: 3,
        data: points.map((point) => [0, point.value, point.dx]),
        renderItem: (
          _params: unknown,
          api: { coord: (value: number[]) => number[]; value: (index: number) => number },
        ) => {
          const [cx, cy] = api.coord([api.value(0), api.value(1)])
          return {
            type: 'circle',
            shape: { cx: cx + api.value(2), cy, r: 4.2 },
            style: { fill: 'rgba(24, 144, 255, 0.55)', stroke: '#ffffff', lineWidth: 1 },
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: stats.mean,
              lineStyle: { color: COLOR.warning, type: 'dashed', width: 1.2 },
              label: {
                show: true,
                formatter: `均值 ${fixed2(stats.mean)}`,
                position: 'insideStartTop',
                color: COLOR.warning,
                fontSize: 10,
              },
            },
            {
              yAxis: stats.median,
              lineStyle: { color: COLOR.primary, type: 'dashed', width: 1.2 },
              label: {
                show: true,
                formatter: `中位数 ${fixed2(stats.median)}`,
                position: 'insideStartBottom',
                color: COLOR.primary,
                fontSize: 10,
              },
            },
          ],
        },
      },
      {
        name: '均值',
        type: 'scatter',
        z: 5,
        data: [[unitLabel, stats.mean]],
        symbol: 'diamond',
        symbolSize: 10,
        itemStyle: { color: COLOR.warning, borderColor: '#fff', borderWidth: 1 },
      },
      {
        name: '中位数',
        type: 'scatter',
        z: 5,
        data: [[unitLabel, stats.median]],
        symbol: 'roundRect',
        symbolSize: [9, 9],
        itemStyle: { color: COLOR.primary, borderColor: '#fff', borderWidth: 1 },
      },
      {
        name: '极值',
        type: 'scatter',
        silent: true,
        z: 4,
        data: [
          [unitLabel, stats.max],
          [unitLabel, stats.min],
        ],
        symbolSize: 1,
        itemStyle: { color: 'transparent' },
        label: {
          show: true,
          position: 'right',
          offset: [10, 0],
          color: COLOR.tertiary,
          fontSize: 10,
          formatter: (params: unknown) => {
            const value = Number((params as { value: number[] }).value[1])
            return value === stats.max ? `最高 ${fixed2(stats.max)}` : `最低 ${fixed2(stats.min)}`
          },
        },
      },
    ],
  }
  return option as unknown as EChartsOption
}

/** 直方图：无间隙分箱 + 渐变填充 + 频数标签 + 核密度曲线 */
function buildHistogramOption(model: StatModel): EChartsOption {
  const { stats } = model
  const bins = stats.histogram
  const labels = bins.map((bin) => `${numText(bin.start, 2)}~${numText(bin.end, 2)}`)
  const values = model.samples.map((sample) => sample.value)
  const binWidth = bins.length > 1 ? bins[1].start - bins[0].start : 1
  const bandwidth = Math.max(
    1e-6,
    1.06 * (stats.stdDev ?? Math.max(stats.mean * 0.1, 1e-6)) * Math.pow(Math.max(values.length, 2), -0.2),
  )
  const densities = bins.map((bin) => kernelDensity(values, (bin.start + bin.end) / 2, bandwidth))
  const densityCurve = densities.map((density) => density * values.length * binWidth)

  const option = {
    animationDuration: 420,
    grid: { left: 16, right: 26, top: 44, bottom: 16, containLabel: true },
    legend: {
      top: 2,
      right: 8,
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { color: COLOR.secondary, fontSize: 11 },
      data: ['频数', '核密度'],
    },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = params as { seriesName?: string; dataIndex?: number }[]
        const index = list.find((item) => item.seriesName === '频数')?.dataIndex ?? -1
        const bin = bins[index]
        if (!bin) return ''
        const share = stats.n > 0 ? (bin.count / stats.n) * 100 : 0
        const density = densities[index]
        return [
          `<b>${numText(bin.start, 2)} ~ ${numText(bin.end, 2)}</b>`,
          `样本数：${bin.count} 条（${share.toFixed(1)}%）`,
          `核密度：${density.toFixed(3)}（估计）`,
        ].join('<br/>')
      },
    },
    xAxis: {
      ...categoryAxis(labels, 10),
      axisLabel: { color: COLOR.secondary, fontSize: 10, interval: 0, hideOverlap: true, margin: 10 },
    },
    yAxis: { ...valueAxis('样本数（条）'), minInterval: 1, splitNumber: 6 },
    series: [
      {
        name: '频数',
        type: 'bar',
        barCategoryGap: '0%',
        barGap: '0%',
        data: bins.map((bin) => bin.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24, 144, 255, 0.85)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.18)' },
          ]),
          borderColor: 'rgba(24, 144, 255, 0.9)',
          borderWidth: 0.5,
        },
        emphasis: {
          itemStyle: { color: 'rgba(24, 144, 255, 0.95)' },
        },
        label: {
          show: true,
          position: 'top',
          color: COLOR.secondary,
          fontSize: 10,
          formatter: (params: unknown) => {
            const value = Number((params as { value: number }).value)
            return value > 0 ? String(value) : ''
          },
        },
        z: 2,
      },
      {
        name: '核密度',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: densityCurve,
        lineStyle: { color: COLOR.warning, width: 2.2 },
        itemStyle: { color: COLOR.warning },
        z: 4,
      },
    ],
  }
  return option as unknown as EChartsOption
}

/** 按区域：加粗圆角柱 + 基准线（带背景标签）+ 基准以上浅底 + 标准差误差棒 */
function buildRegionOption(model: StatModel): EChartsOption {
  const groups = model.regionGroups
  const baseline = model.stats.mean
  const upper = Math.max(...groups.map((group) => group.mean), baseline) * 1.12
  const means = groups.map((group) => group.mean)

  const option = {
    animationDuration: 420,
    grid: { left: 18, right: 110, top: 48, bottom: 16, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => groupTooltip(params, groups, model.unit, model.emissionUnit, baseline),
    },
    xAxis: {
      ...categoryAxis(groups.map((group) => group.key), 12),
      axisLabel: categoryLabelWithCount(groups),
    },
    yAxis: valueAxis(model.unit ? `均值 ${model.emissionUnit}/${model.unit}` : '均值'),
    series: [
      {
        name: '区域均值',
        type: 'bar',
        barMaxWidth: 64,
        data: means,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#40a9ff' },
            { offset: 1, color: '#91caff' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: {
          itemStyle: { color: COLOR.primary },
        },
        label: {
          show: true,
          position: 'insideTop',
          distance: 8,
          formatter: (params: unknown) => {
            const index = Number((params as { dataIndex: number }).dataIndex)
            const group = groups[index]
            if (!group) return ''
            const tag = group.mean > baseline ? 'up' : group.mean < baseline ? 'down' : 'same'
            return `{value|${fixed2(group.mean)}}\n{${tag}|${deviationText(group.mean, baseline)}}`
          },
          rich: {
            value: { color: '#ffffff', fontSize: 11, fontWeight: 600, lineHeight: 15 },
            up: { color: '#ffe7ba', fontSize: 10, lineHeight: 13 },
            down: { color: '#d9f7be', fontSize: 10, lineHeight: 13 },
            same: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 10, lineHeight: 13 },
          },
        },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(250, 140, 22, 0.05)' },
          data: [[{ yAxis: baseline }, { yAxis: upper }]],
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: COLOR.reference, type: 'dashed', width: 1.2 },
          label: {
            show: true,
            formatter: `当前范围均值 ${numText(baseline, 2)}`,
            position: 'insideEndTop',
            color: COLOR.secondary,
            fontSize: 11,
            backgroundColor: '#fafafa',
            borderColor: '#e8e8e8',
            borderWidth: 1,
            borderRadius: 3,
            padding: [3, 6],
          },
          data: [{ yAxis: baseline }],
        },
        z: 2,
      },
      {
        name: '标准差',
        type: 'custom',
        silent: true,
        z: 4,
        data: groups.map((group, index) => [
          index,
          group.mean - (group.stdDev ?? 0),
          group.mean + (group.stdDev ?? 0),
        ]),
        renderItem: (
          _params: unknown,
          api: { coord: (value: number[]) => number[]; value: (index: number) => number },
        ) => {
          const index = api.value(0)
          const [x, yLow] = api.coord([index, api.value(1)])
          const [, yHigh] = api.coord([index, api.value(2)])
          const half = 7
          return {
            type: 'group',
            children: [
              {
                type: 'line',
                shape: { x1: x, y1: yLow, x2: x, y2: yHigh },
                style: { stroke: COLOR.reference, lineWidth: 1 },
              },
              {
                type: 'line',
                shape: { x1: x - half, y1: yLow, x2: x + half, y2: yLow },
                style: { stroke: COLOR.reference, lineWidth: 1 },
              },
              {
                type: 'line',
                shape: { x1: x - half, y1: yHigh, x2: x + half, y2: yHigh },
                style: { stroke: COLOR.reference, lineWidth: 1 },
              },
            ],
          }
        },
      },
    ],
  }
  return option as unknown as EChartsOption
}

/** 通用分组柱状图（按行业 / 产品类别 / 工艺 / 年度）：柱顶均值+偏差，轴下标注 n */
function buildBarOption(model: StatModel, groups: StatGroup[], seriesName: string): EChartsOption {
  const baseline = model.stats.mean
  const option = {
    animationDuration: 420,
    grid: { left: 18, right: 110, top: 44, bottom: 16, containLabel: true },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => groupTooltip(params, groups, model.unit, model.emissionUnit, baseline),
    },
    xAxis: {
      ...categoryAxis(groups.map((group) => group.key), 11),
      axisLabel: categoryLabelWithCount(groups, groups.length > 6 ? 18 : 0),
    },
    yAxis: valueAxis(model.unit ? `均值 ${model.emissionUnit}/${model.unit}` : '均值'),
    series: [
      {
        name: seriesName,
        type: 'bar',
        barMaxWidth: 58,
        data: groups.map((group) => group.mean),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#40a9ff' },
            { offset: 1, color: '#91caff' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: { itemStyle: { color: COLOR.primary } },
        label: {
          show: true,
          position: 'insideTop',
          distance: 8,
          formatter: (params: unknown) => {
            const index = Number((params as { dataIndex: number }).dataIndex)
            const group = groups[index]
            if (!group) return ''
            const tag = group.mean > baseline ? 'up' : group.mean < baseline ? 'down' : 'same'
            return `{value|${fixed2(group.mean)}}\n{${tag}|${deviationText(group.mean, baseline)}}`
          },
          rich: {
            value: { color: '#ffffff', fontSize: 11, fontWeight: 600, lineHeight: 15 },
            up: { color: '#ffe7ba', fontSize: 10, lineHeight: 13 },
            down: { color: '#d9f7be', fontSize: 10, lineHeight: 13 },
            same: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 10, lineHeight: 13 },
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: COLOR.reference, type: 'dashed', width: 1.2 },
          label: {
            show: true,
            formatter: `当前范围均值 ${numText(baseline, 2)}`,
            position: 'insideEndTop',
            color: COLOR.secondary,
            fontSize: 11,
            backgroundColor: '#fafafa',
            borderColor: '#e8e8e8',
            borderWidth: 1,
            borderRadius: 3,
            padding: [3, 6],
          },
          data: [{ yAxis: baseline }],
        },
      },
    ],
  }
  return option as unknown as EChartsOption
}

/* ============================ 内部工具 ============================ */

/** 去重并按拼音序排序的非空文本集合（统计条件下拉选项） */
function uniqueText(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function groupTooltip(
  params: unknown,
  groups: StatGroup[],
  unit: string,
  emissionUnit = 'kgCO₂e',
  baseline?: number,
): string {
  const list = params as { dataIndex?: number }[]
  const group = groups[list[0]?.dataIndex ?? -1]
  if (!group) return ''
  const unitText = unit ? `${emissionUnit}/${unit}` : emissionUnit
  const lines = [
    `<b>${group.key}</b>`,
    `样本数：${group.n} 条`,
    `均值：${numText(group.mean, 2)} ${unitText}`,
    `中位数：${numText(group.median, 2)} ${unitText}`,
  ]
  if (group.stdDev !== undefined) lines.push(`标准差：${numText(group.stdDev, 2)} ${unitText}`)
  if (baseline !== undefined && baseline > 0) {
    lines.push(`较当前范围均值：${deviationText(group.mean, baseline)}`)
  }
  return lines.join('<br/>')
}

/** 相对基准的偏差百分比（柱顶 ±%，高于基准为正） */
function deviationText(value: number, baseline: number): string {
  if (!Number.isFinite(baseline) || baseline === 0) return '—'
  const delta = ((value - baseline) / baseline) * 100
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`
}

/** 分类轴标签：第二行显示组内样本数 n，避免只看均值不看样本量 */
function categoryLabelWithCount(groups: StatGroup[], rotate = 0): Record<string, unknown> {
  return {
    interval: 0,
    margin: 8,
    rotate,
    formatter: (value: string, index: number) => {
      const group = groups[index]
      return group ? `{name|${value}}\n{count|n=${group.n}}` : value
    },
    rich: {
      name: { color: COLOR.secondary, fontSize: 11, lineHeight: 15 },
      count: { color: COLOR.tertiary, fontSize: 10, lineHeight: 13 },
    },
  }
}

/** 高斯核密度估计 */
function kernelDensity(values: number[], x: number, bandwidth: number): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, value) => acc + Math.exp(-0.5 * ((x - value) / bandwidth) ** 2), 0)
  return sum / (values.length * bandwidth * Math.sqrt(2 * Math.PI))
}

/**
 * 蜂群布局：把数值映射到纵向槽位，同一槽位内的点交替向左右展开，
 * 避免重叠；纵向位置仍由真实数值决定，横向偏移仅影响落点。
 */
function swarmLayout(values: number[]): { value: number; dx: number }[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  // 绘图区约 320 − 上下留白（44 + 44），用于把数值差换算成像素差
  const plotHeight = 232
  const perValue = max > min ? plotHeight / (max - min) : 0
  const slotHeight = 4.6
  const step = 7.4
  const limit = 40
  const slots = new Map<number, number>()

  return values.map((value) => {
    const slot = Math.round(((max - value) * perValue) / slotHeight)
    const seq = slots.get(slot) ?? 0
    slots.set(slot, seq + 1)
    if (seq === 0) return { value, dx: 0 }
    const rank = Math.ceil(seq / 2)
    const direction = seq % 2 === 1 ? 1 : -1
    return { value, dx: Math.max(-limit, Math.min(limit, direction * rank * step)) }
  })
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function fixed2(value?: number): string {
  return value !== undefined && Number.isFinite(value) ? value.toFixed(2) : '—'
}

function cvLevel(cv?: number): string {
  if (cv === undefined) return '—'
  if (cv < 10) return '集中'
  if (cv < 20) return '较集中'
  if (cv < 35) return '较分散'
  return '分散'
}



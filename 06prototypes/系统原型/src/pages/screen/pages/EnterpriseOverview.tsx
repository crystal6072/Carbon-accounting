import { useEffect, useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '@/shared/components'
import type { ScreenData } from '@/types/screen'
import ScreenPanel from '../components/ScreenPanel'
import KpiCard from '../components/KpiCard'
import {
  AXIS_LABEL,
  AXIS_LINE,
  SCREEN,
  SPLIT_LINE,
  TOOLTIP_STYLE,
  areaGradient,
} from '../screenTheme'

interface EnterpriseOverviewProps {
  data: ScreenData
  yearRange: [number, number]
  onYearRangeChange: (range: [number, number]) => void
  onContextChange: (key: string) => void
}

const BOUNDARY_TABS: Array<{ key: 'gate' | 'grave'; label: string }> = [
  { key: 'gate', label: '摇篮到大门' },
  { key: 'grave', label: '摇篮到坟墓' },
]

const EMPTY_TEXT = '当前筛选条件下暂无核算记录'

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/**
 * 企业驾驶舱（企业视角大屏）。
 *
 * 结构与业务口径一一对应：
 * 1. 条件筛选（年份区间）→ 影响全部统计；
 * 2. 基础数据统计（我的产品 / 我的工艺 / 已核算产品 / 报告）→ 库口径 + 核算口径；
 * 3. 年度排放总量 → 产品分类同功能单位汇总（跨单位不加总）；
 * 4. 碳足迹 Top10 → 摇篮到大门 / 摇篮到坟墓 + 产品类别筛选；
 * 5. 生命周期阶段构成饼图 → 按产品切换，最新年度各阶段占比；
 * 6. 碳足迹趋势 → 图表顶部固定展示产品范围 / 系统边界 / 功能单位。
 */
export default function EnterpriseOverview({
  data,
  yearRange,
  onYearRangeChange,
  onContextChange,
}: EnterpriseOverviewProps) {
  const activeContext = data.contexts.find((item) => item.key === data.contextKey)
  const lastYear = data.yearOptions[data.yearOptions.length - 1]

  /* ---------- 碳足迹 Top 10：边界页签 + 产品类别筛选 ---------- */
  const [topBoundary, setTopBoundary] = useState<'gate' | 'grave'>('gate')
  const [topCategory, setTopCategory] = useState('all')

  const boundaryTabs = useMemo(
    () =>
      BOUNDARY_TABS.map((tab) => ({
        ...tab,
        count: data.topProducts.filter((item) => item.boundary === tab.key).length,
      })),
    [data.topProducts],
  )

  const topCategories = useMemo(
    () => [
      ...new Set(data.topProducts.filter((item) => item.boundary === topBoundary).map((item) => item.category)),
    ],
    [data.topProducts, topBoundary],
  )

  const topItems = useMemo(
    () =>
      data.topProducts
        .filter((item) => item.boundary === topBoundary && (topCategory === 'all' || item.category === topCategory))
        .slice(0, 10),
    [data.topProducts, topBoundary, topCategory],
  )

  /* ---------- 生命周期阶段构成饼图：按产品切换 ---------- */
  const [stageIndex, setStageIndex] = useState(0)
  useEffect(() => {
    if (stageIndex > data.productStages.length - 1) setStageIndex(0)
  }, [data.productStages, stageIndex])
  const activeProduct = data.productStages[stageIndex] ?? data.productStages[0]

  /* ---------- 年度排放总量：产品分类汇总（各自功能单位内加总，跨单位不合并） ---------- */
  const emissionOption = useMemo<EChartsOption>(() => {
    const cells = data.categoryEmissions
    const unitCount = new Map<string, number>()
    for (const cell of cells) unitCount.set(cell.category, (unitCount.get(cell.category) ?? 0) + 1)
    const axisLabels = cells.map((cell) =>
      (unitCount.get(cell.category) ?? 0) > 1 ? `${cell.category}\n${cell.unit}` : cell.category,
    )

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...TOOLTIP_STYLE,
        formatter: (params) => {
          const list = Array.isArray(params) ? params : [params]
          const cell = cells[list[0]?.dataIndex ?? -1]
          if (!cell) return ''
          return `${cell.category}<br/>汇总排放量 ${cell.value.toLocaleString('zh-CN')} ${cell.unit}<br/>核算记录 ${cell.count} 条`
        },
      },
      graphic:
        cells.length === 0
          ? [
              {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: { text: EMPTY_TEXT, fill: 'rgba(190, 225, 255, 0.4)', fontSize: 12 },
              },
            ]
          : [],
      grid: { left: 4, right: 12, top: 26, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category',
        data: axisLabels,
        axisLabel: { ...AXIS_LABEL, fontSize: 10, interval: 0, width: 110, overflow: 'truncate' },
        axisLine: AXIS_LINE,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '汇总排放量',
        nameTextStyle: { color: SCREEN.text3, fontSize: 10, padding: [0, 0, 4, 0] },
        axisLabel: AXIS_LABEL,
        splitLine: SPLIT_LINE,
        axisLine: { show: false },
      },
      series: [
        {
          name: '汇总排放量',
          type: 'bar',
          barMaxWidth: 46,
          data: cells.map((cell, index) => ({
            value: cell.value,
            itemStyle: {
              borderRadius: [2, 2, 0, 0],
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: SCREEN.series[index % SCREEN.series.length] },
                  { offset: 1, color: 'rgba(45, 212, 191, 0.12)' },
                ],
              },
            },
          })),
          label: {
            show: true,
            position: 'top',
            color: 'rgba(224, 244, 255, 0.6)',
            fontSize: 9.5,
            formatter: '{c}',
          },
        },
      ],
    }
  }, [data.categoryEmissions])

  /* ---------- 碳足迹趋势：当前口径年度序列 + 行业基线 ---------- */
  const annualOption = useMemo<EChartsOption>(() => {
    const years = data.annual.map((item) => `${item.year}`)
    const intensity = data.annual.map((item) => item.intensity)
    const counts = data.annual.map((item) => item.count)
    const lastIndex = data.annual.length - 1
    const baselineValue = data.baselineInfo.value
    const points = baselineValue !== null ? [...intensity, baselineValue] : intensity
    const rawMin = points.length > 0 ? Math.min(...points) : 0
    const rawMax = points.length > 0 ? Math.max(...points) : 1
    const pad = Math.max((rawMax - rawMin) * 0.35, rawMax * 0.08, 0.05)

    return {
      tooltip: { trigger: 'axis', ...TOOLTIP_STYLE },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 12,
        itemHeight: 4,
        icon: 'roundRect',
        textStyle: { color: 'rgba(200, 235, 255, 0.42)', fontSize: 10 },
        data: baselineValue !== null ? ['核算次数', '行业基线', '本企业'] : ['核算次数', '本企业'],
      },
      graphic:
        data.annual.length === 0
          ? [
              {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: {
                  text: '当前区间暂无同口径核算记录',
                  fill: 'rgba(190, 225, 255, 0.4)',
                  fontSize: 12,
                },
              },
            ]
          : [],
      grid: { left: 4, right: 12, top: 32, bottom: 2, containLabel: true },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { ...AXIS_LABEL, fontSize: 11 },
        axisLine: AXIS_LINE,
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '单位碳足迹',
          min: Number((rawMin - pad).toFixed(2)),
          max: Number((rawMax + pad).toFixed(2)),
          nameTextStyle: { color: SCREEN.text3, fontSize: 10, padding: [0, 0, 4, 0] },
          axisLabel: { ...AXIS_LABEL, formatter: '{value}' },
          splitLine: SPLIT_LINE,
          axisLine: { show: false },
        },
        {
          type: 'value',
          name: '核算次数',
          minInterval: 1,
          nameTextStyle: { color: SCREEN.text3, fontSize: 10, padding: [0, 0, 4, 0] },
          axisLabel: AXIS_LABEL,
          splitLine: { show: false },
          axisLine: { show: false },
        },
      ],
      series: [
        {
          name: '核算次数',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: 16,
          itemStyle: { color: 'rgba(232, 192, 125, 0.22)', borderRadius: [2, 2, 0, 0] },
          data: counts,
          z: 1,
        },
        {
          name: '行业基线',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1, type: 'dashed', color: 'rgba(232, 192, 125, 0.55)' },
          itemStyle: { color: SCREEN.gold },
          data: baselineValue !== null ? data.annual.map(() => baselineValue) : [],
          z: 2,
        },
        {
          name: '本企业',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: SCREEN.cyan },
          itemStyle: { color: SCREEN.cyan, borderColor: 'rgba(4, 12, 20, 0.9)', borderWidth: 2 },
          areaStyle: { color: areaGradient('rgba(94, 231, 255, 0.22)', 'rgba(94, 231, 255, 0.01)') },
          data: intensity,
          z: 3,
          markPoint:
            lastIndex >= 0
              ? {
                  symbol: 'circle',
                  symbolSize: 7,
                  label: {
                    show: true,
                    position: 'top',
                    distance: 8,
                    color: '#eaf8ff',
                    fontSize: 11,
                    formatter: `${intensity[lastIndex]?.toFixed(2)}`,
                  },
                  itemStyle: { color: SCREEN.cyan, shadowBlur: 12, shadowColor: SCREEN.cyan },
                  data: [
                    { name: '最新', coord: [lastIndex, intensity[lastIndex]], value: intensity[lastIndex] },
                  ],
                }
              : undefined,
        },
      ],
    }
  }, [data.annual, data.baselineInfo.value])

  /* ---------- 生命周期阶段：当前产品各年占比 ---------- */
  const stageSnapshot = useMemo(() => {
    const years = activeProduct?.years ?? []
    const latest = years[years.length - 1]
    if (!activeProduct || !latest) return null
    return {
      year: latest.year,
      total: latest.total,
      stages: [...latest.stages].sort((a, b) => b.ratio - a.ratio),
    }
  }, [activeProduct])

  const stageOption = useMemo<EChartsOption>(() => {
    const stages = stageSnapshot?.stages ?? []
    const unit = activeProduct?.unit ?? ''

    return {
      tooltip: {
        trigger: 'item',
        ...TOOLTIP_STYLE,
        formatter: (params) => {
          const index = (params as { dataIndex: number }).dataIndex
          const stage = stages[index]
          if (!stage) return ''
          return `${stage.name}<br/><span style="color:#5ee7ff">占比 ${stage.ratio.toFixed(1)}%</span><br/>${stage.value} ${unit}`
        },
      },
      title: {
        text: stages.length > 0 ? `${stages[0].ratio.toFixed(1)}%` : '—',
        subtext: stages[0]?.name ?? '暂无阶段数据',
        left: 'center',
        top: '36%',
        textStyle: {
          color: '#f2fbff',
          fontSize: 26,
          fontWeight: 500,
          fontFamily: '"DIN Alternate", "Bahnschrift", "PingFang SC", sans-serif',
        },
        subtextStyle: { color: 'rgba(200, 235, 255, 0.45)', fontSize: 11, letterSpacing: 2 },
      },
      graphic:
        stages.length === 0
          ? [
              {
                type: 'text',
                left: 'center',
                top: '62%',
                style: {
                  text: '当前产品暂无阶段构成数据',
                  fill: 'rgba(190, 225, 255, 0.4)',
                  fontSize: 12,
                },
              },
            ]
          : [],
      series: [
        {
          name: '阶段占比',
          type: 'pie',
          radius: ['46%', '70%'],
          center: ['50%', '48%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: 'rgba(4, 12, 20, 0.92)', borderWidth: 2 },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            color: 'rgba(214, 238, 255, 0.62)',
            fontSize: 9.5,
            lineHeight: 14,
          },
          labelLine: { length: 6, length2: 8, lineStyle: { color: 'rgba(94, 231, 255, 0.28)' } },
          data: stages.map((stage, index) => ({
            name: stage.name,
            value: stage.ratio,
            itemStyle: { color: SCREEN.series[index % SCREEN.series.length] },
          })),
        },
      ],
    }
  }, [stageSnapshot, activeProduct?.unit])

  return (
    <>
      <div className="scr-kpis">
        <div className="scr-kpi-lead is-org">
          <span className="scr-kpi-kicker">ENTERPRISE COCKPIT</span>
          <h2 data-ann-target="screen.enterprise.lead">{data.orgName}</h2>
          <div className="scr-year-range" data-ann-target="screen.enterprise.lead.yearrange">
            <span>统计区间</span>
            <select
              value={yearRange[0]}
              onChange={(event) => {
                const next = Number(event.target.value)
                onYearRangeChange([next, Math.max(next, yearRange[1])])
              }}
            >
              {data.yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <em>—</em>
            <select
              value={yearRange[1]}
              onChange={(event) => {
                const next = Number(event.target.value)
                onYearRangeChange([Math.min(next, yearRange[0]), next])
              }}
            >
              {data.yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onYearRangeChange([Math.max(data.yearOptions[0], lastYear - 2), lastYear])}
            >
              近 3 年
            </button>
          </div>
          <i className="scr-kpi-lead-line" aria-hidden />
        </div>
        {data.kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.key}
            kpi={kpi}
            index={index}
            annTarget={
              kpi.key === 'products'
                ? 'screen.enterprise.kpi.products'
                : kpi.key === 'processes'
                  ? 'screen.enterprise.kpi.processes'
                  : kpi.key === 'calculated'
                    ? 'screen.enterprise.kpi.records'
                    : kpi.key === 'reports'
                      ? 'screen.enterprise.kpi.reports'
                      : undefined
            }
          />
        ))}
      </div>

      <div className="scr-row scr-row-e3">
        <ScreenPanel
          title="年度排放总量"
          subtitle="按产品分类汇总 · 各自功能单位内加总，跨单位不合并"
          annTarget="screen.enterprise.emission"
          extra={<span className="scr-panel-tag">{data.categoryEmissions.length} 个分类口径</span>}
        >
          <EChart option={emissionOption} height={318} />
        </ScreenPanel>

        <ScreenPanel
          title="碳足迹趋势"
          subtitle={`${data.rangeLabel} · 当前口径年度序列`}
          annTarget="screen.enterprise.trend"
          extra={
            <div className="scr-context-picker" data-ann-target="screen.enterprise.trend.context">
              <span>切换口径</span>
              <select value={data.contextKey} onChange={(event) => onContextChange(event.target.value)}>
                {data.contexts.map((context) => (
                  <option key={context.key} value={context.key}>
                    {context.categoryName} · {context.boundary} · {context.unit}（{context.sampleCount}）
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="scr-caliber-bar">
            <span className="scr-caliber-chip" data-ann-target="screen.enterprise.trend.caliber">
              <em>产品范围</em>
              {activeContext?.categoryName ?? '—'}
              {activeContext && <i>{activeContext.productCount} 个产品</i>}
            </span>
            <span className="scr-caliber-chip">
              <em>系统边界</em>
              {activeContext?.boundary ?? '—'}
            </span>
            <span className="scr-caliber-chip">
              <em>功能单位</em>
              {activeContext?.unit ?? '—'}
            </span>
          </div>
          <div className="scr-baseline-bar">
            <span
              className={data.baselineInfo.matched ? 'is-matched' : 'is-empty'}
              data-ann-target="screen.enterprise.trend.baseline"
            >
              {data.baselineInfo.matched
                ? `行业基线：${data.baselineInfo.label}`
                : '暂无同口径行业基线'}
            </span>
            <em>
              {data.baselineInfo.matched
                ? `${data.baselineInfo.industryName} · ${data.baselineInfo.boundary} · ${data.baselineInfo.unit} · ${data.baselineInfo.sourceType} · ${data.baselineInfo.issuer}`
                : `${data.baselineInfo.boundary ?? '—'} · ${data.baselineInfo.unit ?? '—'} · 未绘制基线，不计算占比`}
            </em>
          </div>
          <EChart option={annualOption} height={230} />
        </ScreenPanel>
      </div>

      <div className="scr-row scr-row-e4">
        <ScreenPanel
          title="碳足迹 Top 10"
          subtitle="已核算记录 · 碳足迹值最高的 10 个产品"
          annTarget="screen.enterprise.top10"
          extra={
            <div className="scr-top-filters">
              <div className="scr-top-tabs" data-ann-target="screen.enterprise.top10.tabs">
                {boundaryTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    className={`scr-top-tab${topBoundary === tab.key ? ' is-active' : ''}`}
                    onClick={() => {
                      setTopBoundary(tab.key)
                      setTopCategory('all')
                    }}
                  >
                    {tab.label}
                    <small>{tab.count}</small>
                  </button>
                ))}
              </div>
              <select
                className="scr-mini-select"
                value={topCategory}
                onChange={(event) => setTopCategory(event.target.value)}
                data-ann-target="screen.enterprise.top10.category"
              >
                <option value="all">全部产品类别</option>
                {topCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="scr-top-head">
            <span>#</span>
            <span>产品 / 类别 · 年度</span>
            <span>碳足迹</span>
          </div>
          {topItems.length === 0 ? (
            <div className="scr-top-empty">{EMPTY_TEXT}</div>
          ) : (
            topItems.map((item, index) => (
              <div className="scr-top-row" key={`${item.name}-${item.year}-${item.boundary}`}>
                <em className={`scr-top-rank${index < 3 ? ' is-hot' : ''}`}>
                  {String(index + 1).padStart(2, '0')}
                </em>
                <div className="scr-top-main">
                  <span className="scr-top-name" title={item.name}>
                    {item.name}
                  </span>
                  <span className="scr-top-meta">
                    {item.category} · {item.year}
                  </span>
                </div>
                <span className="scr-top-value">
                  {formatNumber(item.value)}
                  <small>{item.unit}</small>
                </span>
              </div>
            ))
          )}
          <div className="scr-top-note">数值口径随记录声明单位，不同功能单位之间不做比较。</div>
        </ScreenPanel>

        <ScreenPanel
          title="生命周期阶段构成占比"
          annTarget="screen.enterprise.stages"
          subtitle={
            activeProduct
              ? `${activeProduct.category} · ${activeProduct.unit} · ${activeProduct.boundaryLabel} · ${stageSnapshot?.year ?? '—'} 年各阶段占比`
              : '暂无阶段构成数据'
          }
          extra={
            <div className="scr-context-picker" data-ann-target="screen.enterprise.stages.product">
              <span>按产品切换</span>
              <select value={stageIndex} onChange={(event) => setStageIndex(Number(event.target.value))}>
                {data.productStages.map((item, index) => (
                  <option key={`${item.product}-${item.boundaryLabel}`} value={index}>
                    {item.product} · {item.boundaryLabel}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="scr-stage-wrap">
            <EChart option={stageOption} height={288} />
            <div className="scr-stage-side">
              <div className="scr-stage-side-head">
                <span>{stageSnapshot ? `${stageSnapshot.year} 年` : '—'}</span>
                <em>{stageSnapshot ? `${stageSnapshot.total} ${activeProduct?.unit ?? ''}` : ''}</em>
              </div>
              {stageSnapshot?.stages.map((stage, index) => (
                <div className="scr-stage-side-row" key={stage.name}>
                  <i
                    className="scr-stage-dot"
                    style={{ background: SCREEN.series[index % SCREEN.series.length] }}
                  />
                  <span className="scr-stage-side-name" title={stage.name}>
                    {stage.name}
                  </span>
                  <span className="scr-stage-side-value">{stage.ratio.toFixed(1)}%</span>
                  <em className="scr-stage-side-sub">
                    {stage.value} {activeProduct?.unit ?? ''}
                  </em>
                </div>
              ))}
            </div>
          </div>
        </ScreenPanel>
      </div>
    </>
  )
}

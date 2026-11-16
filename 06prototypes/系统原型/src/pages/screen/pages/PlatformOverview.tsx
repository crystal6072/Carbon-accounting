import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '@/shared/components'
import type { ScreenData } from '@/types/screen'
import ScreenPanel from '../components/ScreenPanel'
import KpiCard from '../components/KpiCard'
import MeterList from '../components/MeterList'
import ChinaMap from '../components/ChinaMap'
import {
  AXIS_LABEL,
  AXIS_LINE,
  SCREEN,
  SPLIT_LINE,
  TOOLTIP_STYLE,
  areaGradient,
  barGradient,
} from '../screenTheme'

interface PlatformOverviewProps {
  data: ScreenData
}

/** 趋势筛选的「全部」占位值（mock 组合键统一用 all 表示不限） */
const ALL = 'all'

/**
 * 平台视角 · 单屏运行总览。
 *
 * 维度（客户确认口径）：
 * 顶部 KPI（企业总数 / 活跃率 / 碳足迹记录 / 核算产品数 / 核算记录 / 覆盖行业）
 * → 中部地图（企业图层 / 碳足迹图层可切换）+ 行业 Top5 + 核算边界分布
 * → 底部核算量与单位碳足迹趋势（边界 / 行业 / 单位筛选）+ 近 12 周活跃企业率趋势。
 */
export default function PlatformOverview({ data }: PlatformOverviewProps) {
  const platform = data.platform

  const [boundary, setBoundary] = useState(ALL)
  const [industry, setIndustry] = useState(ALL)
  const [unit, setUnit] = useState(ALL)

  const topStage = useMemo(
    () =>
      data.stages.length > 0
        ? data.stages.reduce((max, item) => (item.ratio > max.ratio ? item : max), data.stages[0])
        : { name: '暂无阶段数据', ratio: 0, value: 0 },
    [data.stages],
  )

  /** 当前筛选组合的年度序列（组合不存在时明确空态，不做降级替换） */
  const trendPoints = useMemo(() => {
    if (!platform) return []
    const key = `${boundary}|${industry}|${unit}`
    return platform.trendSeries.find((series) => series.key === key)?.points ?? []
  }, [platform, boundary, industry, unit])

  const stageOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'item',
        ...TOOLTIP_STYLE,
        valueFormatter: (value) => `${Number(value).toFixed(1)}%`,
      },
      title: {
        text: `${topStage.ratio.toFixed(1)}%`,
        subtext: topStage.name,
        left: 'center',
        top: '31%',
        textStyle: {
          color: '#f2fbff',
          fontSize: 30,
          fontWeight: 500,
          fontFamily: '"DIN Alternate", "Bahnschrift", "PingFang SC", sans-serif',
        },
        subtextStyle: { color: 'rgba(200, 235, 255, 0.45)', fontSize: 11, letterSpacing: 2 },
      },
      series: [
        {
          type: 'pie',
          radius: ['52%', '72%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderColor: 'rgba(4, 12, 20, 0.92)', borderWidth: 2 },
          data: data.stages.map((item, index) => ({
            name: item.name,
            value: item.ratio,
            itemStyle: { color: SCREEN.series[index % SCREEN.series.length] },
          })),
        },
      ],
    }),
    [data.stages, topStage],
  )

  const trendOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'axis',
        ...TOOLTIP_STYLE,
        formatter: (params) => {
          const rows = params as Array<{ axisValue?: string; seriesName?: string; value?: number; color?: string }>
          if (rows.length === 0) return ''
          const point = trendPoints.find((item) => `${item.year}` === rows[0].axisValue)
          const head = `<span style="color:rgba(200,235,255,.6)">${rows[0].axisValue} 年</span>`
          const body = rows
            .map(
              (row) =>
                `<br/>${row.seriesName}：<span style="color:${row.color}">${row.value}</span>${
                  row.seriesName === '核算量' ? ' 条' : ' tCO₂e'
                }`,
            )
            .join('')
          const tail = point ? `<br/><span style="color:rgba(200,235,255,.45)">单位碳足迹中位数 ${point.intensity}</span>` : ''
          return `${head}${body}${tail}`
        },
      },
      graphic:
        trendPoints.length === 0
          ? [
              {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: {
                  text: '该筛选组合暂无已完成核算记录',
                  fill: 'rgba(190, 225, 255, 0.4)',
                  fontSize: 12,
                },
              },
            ]
          : [],
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 4,
        icon: 'roundRect',
        textStyle: { color: 'rgba(200, 235, 255, 0.42)', fontSize: 10 },
      },
      grid: { left: 4, right: 10, top: 30, bottom: 2, containLabel: true },
      xAxis: {
        type: 'category',
        data: trendPoints.map((item) => `${item.year}`),
        axisLabel: AXIS_LABEL,
        axisLine: AXIS_LINE,
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '核算量 / 条',
          nameTextStyle: { color: SCREEN.text3, fontSize: 10, padding: [0, 0, 4, 0] },
          axisLabel: AXIS_LABEL,
          splitLine: SPLIT_LINE,
          axisLine: { show: false },
        },
        {
          type: 'value',
          name: '碳足迹 / tCO₂e',
          scale: true,
          nameTextStyle: { color: SCREEN.text3, fontSize: 10, padding: [0, 0, 4, 0] },
          axisLabel: { color: SCREEN.text3, fontSize: 10, formatter: '{value}' },
          splitLine: { show: false },
          axisLine: { show: false },
        },
      ],
      series: [
        {
          name: '核算量',
          type: 'bar',
          barWidth: 14,
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            color: barGradient('rgba(94, 231, 255, 0.85)', 'rgba(45, 212, 191, 0.18)'),
          },
          data: trendPoints.map((item) => item.count),
        },
        {
          name: '汇总碳足迹',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 1.5, color: SCREEN.gold },
          itemStyle: { color: SCREEN.gold, borderColor: 'rgba(4, 12, 20, 0.9)', borderWidth: 2 },
          areaStyle: { color: areaGradient('rgba(232, 192, 125, 0.16)', 'rgba(232, 192, 125, 0.01)') },
          data: trendPoints.map((item) => item.footprint),
        },
      ],
    }),
    [trendPoints],
  )

  const activeTrend = platform?.activeTrend ?? []

  const activeOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'axis',
        ...TOOLTIP_STYLE,
        formatter: (params) => {
          const rows = params as Array<{ axisValue?: string; value?: number }>
          if (rows.length === 0) return ''
          const point = activeTrend.find((item) => item.week === rows[0].axisValue)
          return `${rows[0].axisValue} 起当周<br/><span style="color:#5ee7ff">活跃率 ${rows[0].value}%</span>${
            point ? `<br/><span style="color:rgba(200,235,255,.5)">活跃 ${point.active} / ${point.total} 家</span>` : ''
          }`
        },
      },
      grid: { left: 4, right: 14, top: 18, bottom: 2, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: activeTrend.map((item) => item.week),
        axisLabel: { ...AXIS_LABEL, interval: 1 },
        axisLine: AXIS_LINE,
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: (value) => Math.max(60, Math.ceil((value.max + 10) / 10) * 10),
        name: '活跃率 / %',
        nameTextStyle: { color: SCREEN.text3, fontSize: 10, padding: [0, 0, 4, 0] },
        axisLabel: { ...AXIS_LABEL, formatter: '{value}' },
        splitLine: SPLIT_LINE,
        axisLine: { show: false },
      },
      series: [
        {
          name: '活跃企业率',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 1.8, color: '#5ee7ff' },
          itemStyle: { color: '#5ee7ff', borderColor: 'rgba(4, 12, 20, 0.9)', borderWidth: 2 },
          areaStyle: { color: areaGradient('rgba(94, 231, 255, 0.22)', 'rgba(94, 231, 255, 0.01)') },
          data: activeTrend.map((item) => item.rate),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: 'rgba(232, 192, 125, 0.4)', type: 'dashed' },
            label: { show: false },
            data: activeTrend.length
              ? [
                  {
                    yAxis: Number(
                      (
                        activeTrend.reduce((sum, item) => sum + item.rate, 0) / activeTrend.length
                      ).toFixed(1),
                    ),
                  },
                ]
              : [],
          },
        },
      ],
    }),
    [activeTrend],
  )

  if (!platform) return null

  const currentWeek = activeTrend[activeTrend.length - 1]

  const filters = [
    {
      label: '边界',
      value: boundary,
      options: platform.trendFilters.boundaries,
      onChange: setBoundary,
    },
    {
      label: '行业',
      value: industry,
      options: platform.trendFilters.industries,
      onChange: setIndustry,
    },
    {
      label: '单位',
      value: unit,
      options: platform.trendFilters.units,
      onChange: setUnit,
    },
  ]

  return (
    <>
      <div className="scr-kpis is-platform" data-ann-target="screen.platform.kpi">
        {data.kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.key}
            kpi={kpi}
            index={index}
            annTarget={
              kpi.key === 'orgs'
                ? 'screen.platform.kpi.orgs'
                : kpi.key === 'activeRate'
                  ? 'screen.platform.kpi.active'
                  : kpi.key === 'pcf'
                    ? 'screen.platform.kpi.pcf'
                    : kpi.key === 'products'
                      ? 'screen.platform.kpi.products'
                      : kpi.key === 'calcs'
                        ? 'screen.platform.kpi.calcs'
                        : kpi.key === 'industries'
                          ? 'screen.platform.kpi.industries'
                          : undefined
            }
          />
        ))}
      </div>

      <div className="scr-row scr-row-plat-a">
        <div className="scr-stack">
          <ScreenPanel title="行业分布 Top 5" subtitle="按已完成核算数降序" annTarget="screen.platform.industries">
            <MeterList items={platform.industries} suffix=" 条" showShare />
          </ScreenPanel>
          <ScreenPanel
            title="核算边界分布"
            subtitle="已完成核算碳足迹数"
            annTarget="screen.platform.boundaries"
          >
            <MeterList items={platform.boundaries} suffix=" 条" showShare tone="gold" />
          </ScreenPanel>
        </div>

        <ScreenPanel
          title="全国产业分布"
          subtitle="可切换图层 · 企业数 / 碳足迹记录"
          annTarget="screen.platform.map"
          extra={<span className="scr-panel-tag">{platform.regions.length} 个区域</span>}
        >
          <ChinaMap
            regions={platform.regions}
            tenants={platform.tenantTotal}
            pcf={platform.pcfTotal}
          />
        </ScreenPanel>

        <ScreenPanel
          title="生命周期阶段构成占比"
          subtitle="全部有效样本 · 阶段占比"
          annTarget="screen.platform.stages"
        >
          <div className="scr-stage-chart">
            <EChart option={stageOption} height={266} />
            <div className="scr-stage-legend">
              {data.stages.map((item, index) => (
                <div className="scr-stage-legend-item" key={item.name}>
                  <i style={{ background: SCREEN.series[index % SCREEN.series.length] }} />
                  <span>{item.name}</span>
                  <em>{item.ratio.toFixed(1)}%</em>
                </div>
              ))}
            </div>
          </div>
        </ScreenPanel>
      </div>

      <div className="scr-row scr-row-plat-b">
        <ScreenPanel
          title="核算量与单位碳足迹趋势"
          subtitle="已完成核算量 · 汇总碳足迹"
          annTarget="screen.platform.trend"
          extra={
            <div className="scr-filter-bar" data-ann-target="screen.platform.trend.filters">
              {filters.map((filter) => (
                <label key={filter.label} className="scr-filter">
                  <span>{filter.label}</span>
                  <select
                    className="scr-mini-select"
                    value={filter.value}
                    onChange={(event) => filter.onChange(event.target.value)}
                  >
                    <option value={ALL}>全部</option>
                    {filter.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          }
        >
          <EChart option={trendOption} height={240} />
        </ScreenPanel>

        <ScreenPanel
          title="活跃企业率趋势"
          subtitle="近 12 周 · 活跃企业 / 企业总数"
          annTarget="screen.platform.active"
          extra={<span className="scr-panel-tag">本周 {currentWeek?.rate ?? 0}%</span>}
        >
          <EChart option={activeOption} height={240} />
        </ScreenPanel>
      </div>
    </>
  )
}

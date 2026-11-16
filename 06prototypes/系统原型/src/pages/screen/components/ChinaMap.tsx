import { useMemo, useState } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { EChart } from '@/shared/components'
import type { ScreenPlatformRegion } from '@/types/screen'
import chinaGeo from '@/assets/map/china.json'
import { TOOLTIP_STYLE } from '../screenTheme'
import MeterList from './MeterList'

/**
 * 省级地图只需注册一次（GeoJSON 随包内置，外部验收现场不依赖网络）。
 * 原始数据含一个无名称的南海诸岛要素，会把包围盒拉大、导致大陆缩得很小，注册前剔除。
 */
const mainlandGeo = {
  ...chinaGeo,
  features: chinaGeo.features.filter((feature) => Boolean(feature.properties.name)),
}
echarts.registerMap('china', mainlandGeo as unknown as Parameters<typeof echarts.registerMap>[1])

/** 省级坐标（用于点位；只列已接入数据的重点省份，其余省份仅参与色块填充） */
const PROVINCE_COORD: Record<string, [number, number]> = {
  北京市: [116.4, 39.9],
  辽宁省: [123.43, 41.8],
  上海市: [121.47, 31.23],
  江苏省: [118.78, 32.06],
  浙江省: [120.15, 30.28],
  安徽省: [117.28, 31.86],
  福建省: [119.3, 26.08],
  江西省: [115.89, 28.68],
  山东省: [117.02, 36.67],
  河南省: [113.65, 34.76],
  湖北省: [114.31, 30.52],
  湖南省: [112.98, 28.19],
  广东省: [113.27, 23.13],
  广西壮族自治区: [108.32, 22.82],
  重庆市: [106.55, 29.56],
  四川省: [104.07, 30.67],
  云南省: [102.71, 25.05],
  陕西省: [108.95, 34.27],
}

/** 地图图层：企业分布 / 碳足迹记录 */
type MapLayer = 'tenant' | 'pcf'

/** 区域填充：按当前图层指标从深蓝过渡到青绿 */
function regionColor(value: number, max: number): string {
  const t = Math.max(0, Math.min(1, value / Math.max(1, max)))
  const r = Math.round(9 + 20 * t)
  const g = Math.round(42 + 130 * t)
  const b = Math.round(66 + 110 * t)
  return `rgba(${r}, ${g}, ${b}, ${(0.55 + 0.35 * t).toFixed(2)})`
}

interface ChinaMapProps {
  regions: ScreenPlatformRegion[]
  tenants: number
  pcf: number
}

/**
 * 全国产业分布地图（可切换图层）：
 * - 企业图层：点大小 = 该区域企业数；
 * - 碳足迹图层：区域颜色深浅 = 碳足迹记录数，点大小 = 有效版本碳足迹数。
 */
export default function ChinaMap({ regions, tenants, pcf }: ChinaMapProps) {
  const [layer, setLayer] = useState<MapLayer>('pcf')

  const metricOf = (item: ScreenPlatformRegion) => (layer === 'tenant' ? item.tenants : item.validPcf)

  const points = useMemo(
    () =>
      regions
        .filter((item) => Boolean(PROVINCE_COORD[item.name]) && metricOf(item) > 0)
        .map((item) => ({ ...item, coord: PROVINCE_COORD[item.name] })),
    // metricOf 只依赖 layer
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regions, layer],
  )

  const maxPoint = useMemo(
    () => points.reduce((max, item) => Math.max(max, layer === 'tenant' ? item.tenants : item.validPcf), 0),
    [points, layer],
  )

  const maxFill = useMemo(
    () => regions.reduce((max, item) => Math.max(max, layer === 'tenant' ? item.tenants : item.pcf), 0),
    [regions, layer],
  )

  const ranking = useMemo(
    () =>
      regions
        .map((item) => ({ name: item.name, value: layer === 'tenant' ? item.tenants : item.pcf }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [regions, layer],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'item',
        ...TOOLTIP_STYLE,
        formatter: (params) => {
          const item = params as { name?: string; value?: number | number[] }
          const region = regions.find((entry) => entry.name === item.name)
          if (!region) return item.name ?? ''
          if (layer === 'tenant') {
            return `${region.name}<br/><span style="color:#5ee7ff">企业 ${region.tenants} 家</span><br/>碳足迹记录 ${region.pcf} 条`
          }
          return `${region.name}<br/><span style="color:#5ee7ff">碳足迹记录 ${region.pcf} 条</span><br/>有效版本 ${region.validPcf} 个`
        },
      },
      geo: {
        map: 'china',
        roam: false,
        zoom: 1.62,
        center: [105, 34],
        itemStyle: {
          areaColor: 'rgba(9, 32, 52, 0.72)',
          borderColor: 'rgba(94, 231, 255, 0.22)',
          borderWidth: 1,
          shadowColor: 'rgba(0, 150, 220, 0.35)',
          shadowBlur: 24,
        },
        emphasis: {
          itemStyle: { areaColor: 'rgba(24, 94, 132, 0.85)' },
          label: { show: false },
        },
        label: { show: false },
        regions: regions
          .filter((item) => (layer === 'tenant' ? item.tenants : item.pcf) > 0)
          .map((item) => ({
            name: item.name,
            itemStyle: { areaColor: regionColor(layer === 'tenant' ? item.tenants : item.pcf, maxFill) },
          })),
      },
      series: [
        {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 3,
          symbolSize: (value: unknown) => {
            const arr = value as number[]
            return 8 + Math.sqrt(arr[2] ?? 0) * (maxPoint > 0 ? 26 / Math.sqrt(maxPoint) : 1.5)
          },
          rippleEffect: { brushType: 'stroke', scale: 3.2, period: 5 },
          itemStyle: {
            color: '#5ee7ff',
            shadowBlur: 16,
            shadowColor: '#5ee7ff',
          },
          label: {
            show: true,
            formatter: (params) => {
              const arr = (params as { value?: number[] }).value ?? []
              return `${params.name} ${arr[2] ?? 0}`
            },
            position: 'right',
            distance: 8,
            color: 'rgba(220, 245, 255, 0.78)',
            fontSize: 10,
          },
          data: points.map((item) => ({
            name: item.name,
            value: [...item.coord, metricOf(item)],
          })),
        },
      ],
    }),
    [regions, points, layer, maxPoint, maxFill],
  )

  return (
    <div className="scr-map">
      <div className="scr-map-canvas">
        <span className="scr-map-halo" aria-hidden />
        <div className="scr-map-chips">
          <span className="scr-map-chip">
            <strong>{regions.filter((item) => item.pcf > 0 || item.tenants > 0).length}</strong>个覆盖区域
          </span>
          <span className="scr-map-chip">
            <strong>{tenants}</strong>家企业
          </span>
          <span className="scr-map-chip">
            <strong>{pcf}</strong>条碳足迹记录
          </span>
        </div>
        <div className="scr-map-tabs" data-ann-target="screen.platform.map.tabs">
          <button type="button" className={layer === 'tenant' ? 'is-active' : ''} onClick={() => setLayer('tenant')}>
            企业分布
          </button>
          <button type="button" className={layer === 'pcf' ? 'is-active' : ''} onClick={() => setLayer('pcf')}>
            碳足迹记录
          </button>
        </div>
        <EChart option={option} height={348} />
        <div className="scr-map-legend">
          <span>低</span>
          <i />
          <span>高</span>
          <em>{layer === 'pcf' ? '碳足迹记录数 · 点大小=有效版本' : '企业数 · 点大小=企业数'}</em>
        </div>
      </div>

      <div className="scr-map-side" data-ann-target="screen.platform.map.ranking">
        <div className="scr-map-side-head">
          <span>区域排行</span>
          <em>{layer === 'pcf' ? 'FOOTPRINT' : 'ENTERPRISES'}</em>
        </div>
        <MeterList items={ranking} showShare tone="teal" />
        <div className="scr-map-side-foot">
          覆盖 {regions.length} 个区域 · 按{layer === 'pcf' ? '碳足迹记录数' : '企业数'}
        </div>
      </div>
    </div>
  )
}

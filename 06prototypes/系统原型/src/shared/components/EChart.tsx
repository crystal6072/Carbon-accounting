import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

/**
 * ECharts 轻量封装：只负责实例生命周期、自适应尺寸与 option 更新。
 * - 容器尺寸变化（侧边栏折叠 / 窗口缩放）自动 resize；
 * - option 变化时整体替换（notMerge），避免图表状态残留；
 * - 组件卸载时 dispose，防止内存泄漏。
 */

interface EChartProps {
  option: EChartsOption
  /** 图表高度（px），宽度始终 100% */
  height?: number
  className?: string
}

export default function EChart({ option, height = 260, className }: EChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const chart = echarts.init(host, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(host)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={hostRef} className={className} style={{ width: '100%', height }} />
}

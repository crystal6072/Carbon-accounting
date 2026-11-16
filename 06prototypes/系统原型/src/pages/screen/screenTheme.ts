/**
 * 驾驶舱专属视觉常量。
 * 深色底 + 青蓝主色 + 少量金色点缀，与业务端亮色设计体系隔离，不修改全局 token。
 */

export const SCREEN = {
  primary: '#3b82f6',
  primarySoft: '#7dd3fc',
  cyan: '#5ee7ff',
  teal: '#2dd4bf',
  green: '#4ade80',
  orange: '#f59e0b',
  gold: '#e8c07d',
  red: '#fb7185',
  purple: '#a78bfa',

  text: '#eaf8ff',
  text2: 'rgba(214, 238, 255, 0.66)',
  text3: 'rgba(190, 225, 255, 0.4)',
  text4: 'rgba(170, 210, 255, 0.24)',

  grid: 'rgba(94, 231, 255, 0.08)',
  axis: 'rgba(94, 231, 255, 0.22)',
  panel: 'rgba(8, 26, 44, 0.6)',
  panelStrong: 'rgba(6, 20, 34, 0.92)',
  border: 'rgba(94, 231, 255, 0.13)',
  borderStrong: 'rgba(94, 231, 255, 0.45)',

  series: ['#5ee7ff', '#2dd4bf', '#3b82f6', '#e8c07d', '#a78bfa', '#fb7185'],
}

export const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(4, 14, 24, 0.96)',
  borderColor: 'rgba(94, 231, 255, 0.28)',
  borderWidth: 1,
  padding: [10, 14] as [number, number],
  textStyle: { color: SCREEN.text, fontSize: 12 },
  extraCssText: 'box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55); border-radius: 3px;',
}

export const AXIS_LABEL = {
  color: SCREEN.text3,
  fontSize: 10.5,
}

export const AXIS_LINE = {
  lineStyle: { color: SCREEN.axis },
}

export const SPLIT_LINE = {
  lineStyle: { color: SCREEN.grid, type: 'dashed' as const },
}

/** 主色到透明的面积渐变（ECharts 面积图用） */
export function areaGradient(top = 'rgba(94,231,255,0.28)', bottom = 'rgba(94,231,255,0.01)') {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: top },
      { offset: 1, color: bottom },
    ],
  }
}

/** 条形渐变（横向 / 纵向条形用） */
export function barGradient(left = '#5ee7ff', right = '#2dd4bf') {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: [
      { offset: 0, color: left },
      { offset: 1, color: right },
    ],
  }
}

/** 按值大小取青色透明度（矩阵热力用） */
export function heatColor(ratio: number, max = 60): string {
  const alpha = Math.min(0.9, 0.08 + (ratio / max) * 0.78)
  return `rgba(45, 212, 191, ${alpha.toFixed(2)})`
}

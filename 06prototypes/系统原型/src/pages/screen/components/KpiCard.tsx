import type { ScreenKpi } from '@/types/screen'
import { useCountUp } from '../useCountUp'

interface KpiCardProps {
  kpi: ScreenKpi
  index: number
  /** 批注锚点（data-ann-target），仅用于原型批注定位 */
  annTarget?: string
}

/** 数值展示：千分位 + 固定小数位（滚动过程中同样保持格式） */
function formatValue(value: number, digits: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/**
 * 核心指标：不做成独立卡片，而是驾驶舱顶部的一条「指标轨」。
 * 编号 + 标签 + 大数字 + 同比，靠细分割线组织，避免模板化的圆角卡片感。
 */
export default function KpiCard({ kpi, index, annTarget }: KpiCardProps) {
  const digits = kpi.digits ?? 0
  const animated = useCountUp(kpi.value)
  const hasDelta = kpi.delta !== undefined
  const positive = (kpi.delta ?? 0) >= 0
  const good = kpi.goodWhenDown ? !positive : positive

  return (
    <div
      className={`scr-kpi is-${kpi.tone ?? 'primary'}`}
      style={{ animationDelay: `${index * 60}ms` }}
      data-ann-target={annTarget}
    >
      <div className="scr-kpi-top">
        <em className="scr-kpi-index">{String(index + 1).padStart(2, '0')}</em>
        <span className="scr-kpi-label">{kpi.label}</span>
      </div>
      <div className="scr-kpi-value-row">
        {kpi.insufficient ? (
          <span className="scr-kpi-value is-empty">—</span>
        ) : (
          <>
            <span className="scr-kpi-value">{formatValue(animated, digits)}</span>
            {kpi.unit && <span className="scr-kpi-unit">{kpi.unit}</span>}
          </>
        )}
      </div>
      <div className="scr-kpi-foot">
        {hasDelta && !kpi.insufficient && (
          <span className={`scr-kpi-delta ${good ? 'is-good' : 'is-bad'}`}>
            <i>{positive ? '▲' : '▼'}</i>
            {Math.abs(kpi.delta ?? 0)}
            {kpi.deltaUnit ?? ''}
            {kpi.deltaLabel && <em>{kpi.deltaLabel}</em>}
          </span>
        )}
        {kpi.note && <span className="scr-kpi-note">{kpi.note}</span>}
      </div>
    </div>
  )
}

interface MeterListItem {
  name: string
  value: number
}

interface MeterListProps {
  items: MeterListItem[]
  suffix?: string
  /** 是否在数值后展示占比 */
  showShare?: boolean
  /** 强调色：青 / 蓝绿 / 金 */
  tone?: 'cyan' | 'teal' | 'gold'
}

/**
 * 轻量占比列表：名称 + 数值 + 细进度条。
 * 用于行业分布、排放源结构、主产省份等「排名 + 占比」场景，
 * 比再放一个 ECharts 图表更克制，也更容易在深色大屏上保持统一。
 */
export default function MeterList({ items, suffix = '', showShare = false, tone = 'cyan' }: MeterListProps) {
  const max = items.reduce((value, item) => Math.max(value, item.value), 0)
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className={`scr-meter-list is-${tone}`}>
      {items.map((item, index) => {
        const width = max > 0 ? (item.value / max) * 100 : 0
        const share = total > 0 ? (item.value / total) * 100 : 0

        return (
          <div className="scr-meter-row" key={item.name}>
            <em className="scr-meter-rank">{String(index + 1).padStart(2, '0')}</em>
            <div className="scr-meter-main">
              <div className="scr-meter-line">
                <span className="scr-meter-name" title={item.name}>
                  {item.name}
                </span>
                <span className="scr-meter-value">
                  {item.value}
                  {suffix}
                  {showShare && <small>{share.toFixed(1)}%</small>}
                </span>
              </div>
              <i className="scr-meter-track">
                <b style={{ width: `${width}%` }} />
              </i>
            </div>
          </div>
        )
      })}
    </div>
  )
}

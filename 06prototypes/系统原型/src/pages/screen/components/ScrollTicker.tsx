import { Icon } from '@/shared/components'
import type { ScreenTickerItem } from '@/types/screen'

interface ScrollTickerProps {
  items: ScreenTickerItem[]
}

/** 底部滚动条：最新核算 / 报告 / 入库 / 标准动态，悬停暂停 */
export default function ScrollTicker({ items }: ScrollTickerProps) {
  const loop = [...items, ...items]

  return (
    <div className="scr-ticker" data-ann-target="screen.ticker">
      <span className="scr-ticker-label">
        <Icon name="bell" size={13} />
        最新动态
      </span>
      <div className="scr-ticker-viewport">
        <div
          className="scr-ticker-track"
          style={{ animationDuration: `${Math.max(28, items.length * 6)}s` }}
        >
          {loop.map((item, index) => (
            <span className="scr-ticker-item" key={`${item.time}-${item.text}-${index}`}>
              <em className={`scr-ticker-dot is-${item.type}`} />
              <span className="scr-ticker-time">{item.time}</span>
              <span className="scr-ticker-text">{item.text}</span>
              <span className="scr-ticker-meta">{item.meta}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

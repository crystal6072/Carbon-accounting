import { Icon } from '@/shared/components'

interface ConclusionCardProps {
  open: boolean
  title: string
  conclusions: string[]
  onClose: () => void
}

/** 汇报结论卡：按 C 键呼出，三句话收口，避免现场临场总结 */
export default function ConclusionCard({ open, title, conclusions, onClose }: ConclusionCardProps) {
  if (!open) return null

  return (
    <div className="scr-conclusion-mask" onClick={onClose}>
      <div className="scr-conclusion" onClick={(event) => event.stopPropagation()} data-ann-target="screen.conclusion">
        <header className="scr-conclusion-head">
          <div>
            <span className="scr-conclusion-kicker">汇报结论</span>
            <h2>{title}</h2>
          </div>
          <button className="scr-conclusion-close" type="button" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>
        </header>
        <ol className="scr-conclusion-list">
          {conclusions.map((text, index) => (
            <li key={text}>
              <span className="scr-conclusion-no">{String(index + 1).padStart(2, '0')}</span>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <footer className="scr-conclusion-foot">
          数据口径：同品类 + 同系统边界 + 同声明单位 + 同 GWP 版本；生物碳不并入总量结论。
        </footer>
      </div>
    </div>
  )
}

import { PCF_STEPS, stepStateOf } from './pcfMeta'
import './PcfPage.css'

interface PcfStepsProps {
  /** 高亮步骤（当前查看位置） */
  activeStep: number
  /** 可达步骤（项目进度；超过则锁定不可点） */
  reachableStep: number
  /** 是否允许点击切换（工作台可切换；新建 / 编辑页不可） */
  clickable?: boolean
  onSelect?: (seq: number) => void
}

/**
 * 顶部步骤条（骨架 §4.2）：横向 5 步。
 * 完成态 ✓ / 当前步高亮 / 未到达锁定；未交付批次标注「待交付」。
 */
export default function PcfSteps({
  activeStep,
  reachableStep,
  clickable = false,
  onSelect,
}: PcfStepsProps) {
  return (
    <ol className="pcf-steps-bar">
      {PCF_STEPS.map((item) => {
        const state = stepStateOf(item.seq, activeStep)
        const locked = item.seq > reachableStep
        const cls = [
          'pcf-steps-bar-item',
          state === 'done' ? 'is-done' : '',
          state === 'active' ? 'is-active' : '',
          locked ? 'is-locked' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <li key={item.seq} className={cls}>
            <button
              type="button"
              className="pcf-steps-bar-btn"
              disabled={locked || !clickable}
              onClick={() => onSelect?.(item.seq)}
            >
              <span className="pcf-steps-bar-index">{state === 'done' ? '✓' : item.seq}</span>
              <span className="pcf-steps-bar-name">{item.name}</span>
              {!item.delivered && <span className="pcf-steps-bar-tip">待交付</span>}
            </button>
            {item.seq < PCF_STEPS.length && <span className="pcf-steps-bar-line" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

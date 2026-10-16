import { MODEL_STEPS } from './modelMeta'
import '@/pages/pcf/PcfPage.css'

interface ModelStepsProps {
  /** 当前步骤（1~2） */
  activeStep: number
  /** 步骤切换回调（向导内可自由往返） */
  onSelect: (seq: number) => void
}

/**
 * 模型两步向导步骤条：**目标与范围 → 产品建模**（复用 PCF 步骤条同款版式 `.pcf-steps-bar`）。
 */
export default function ModelSteps({ activeStep, onSelect }: ModelStepsProps) {
  return (
    <ol className="pcf-steps-bar">
      {MODEL_STEPS.map((item) => {
        const state = item.seq < activeStep ? 'done' : item.seq === activeStep ? 'active' : 'todo'
        const cls = ['pcf-steps-bar-item', state === 'done' ? 'is-done' : '', state === 'active' ? 'is-active' : '']
          .filter(Boolean)
          .join(' ')
        return (
          <li key={item.seq} className={cls}>
            <button type="button" className="pcf-steps-bar-btn" onClick={() => onSelect(item.seq)}>
              <span className="pcf-steps-bar-index">{state === 'done' ? '✓' : item.seq}</span>
              <span className="pcf-steps-bar-name">{item.name}</span>
              <span className="pcf-steps-bar-tip is-muted">{item.desc}</span>
            </button>
            {item.seq < MODEL_STEPS.length && <span className="pcf-steps-bar-line" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

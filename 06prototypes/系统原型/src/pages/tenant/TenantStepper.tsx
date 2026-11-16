interface TenantStepperProps {
  steps: string[]
  /** 当前步骤（0 起） */
  current: number
  onStepClick?: (index: number) => void
}

/** 分步表单顶部步骤指示器（新建租户复用）。 */
export default function TenantStepper({ steps, current, onStepClick }: TenantStepperProps) {
  return (
    <ol className="tenant-stepper" aria-label="创建步骤">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo'
        return (
          <li key={label} className={`tenant-step-item is-${state}`}>
            <button
              type="button"
              className="tenant-step-trigger"
              disabled={index > current}
              onClick={() => onStepClick?.(index)}
            >
              <span className="tenant-step-index">{index < current ? '✓' : index + 1}</span>
              <span className="tenant-step-label">{label}</span>
            </button>
            {index < steps.length - 1 && <span className="tenant-step-line" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

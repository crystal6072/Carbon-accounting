import { Button, Icon, Modal } from '@/shared/components'
import type { IndustryBaseline } from '@/mock/baselines'

export type BaselineConfirmMode = 'delete' | 'boundary'

interface Props {
  open: boolean
  mode: BaselineConfirmMode
  baseline: IndustryBaseline | null
  onClose: () => void
  onConfirm: () => void
}

const CONFIG: Record<BaselineConfirmMode, { title: string; confirmLabel: string; body: (b: IndustryBaseline | null) => React.ReactNode }> = {
  delete: {
    title: '确认删除',
    confirmLabel: '确认删除',
    body: (b) => (
      <div>
        <div>确认删除基线「{b?.baselineName}」（{b?.baselineCode}）？</div>
        <div className="modal-confirm-tip">删除后不可恢复，请确认该基线不再被报告引用。</div>
      </div>
    ),
  },
  boundary: {
    title: '切换系统边界',
    confirmLabel: '继续切换',
    body: () => (
      <div>
        <div>切换系统边界将重置已录入的分阶段基准值（大门 / 坟墓的阶段构成不同）。</div>
        <div className="modal-confirm-tip">已填写的阶段值将被清空，需重新录入。是否继续？</div>
      </div>
    ),
  },
}

export default function IndustryBaselineConfirmModal({ open, mode, baseline, onClose, onConfirm }: Props) {
  if (!open) return null
  const cfg = CONFIG[mode]
  return (
    <Modal
      open={open}
      title={cfg.title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="baseline.confirm.cancel" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" data-ann-target="baseline.confirm.ok" onClick={onConfirm}>
            {cfg.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>{cfg.body(baseline)}</div>
      </div>
    </Modal>
  )
}

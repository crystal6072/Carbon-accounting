import { Button, Icon, Modal } from '@/shared/components'
import type { CalcFormula } from '@/types'

export type FormulaConfirmMode = 'enable' | 'disable' | 'delete'

interface FormulaConfirmModalProps {
  open: boolean
  formula: CalcFormula | null
  mode: FormulaConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<FormulaConfirmMode, string> = {
  enable: '确认启用',
  disable: '确认禁用',
  delete: '确认删除',
}

/** 公式行操作二次确认（启用 / 禁用 / 删除） */
export default function FormulaConfirmModal({ open, formula, mode, onClose, onConfirm }: FormulaConfirmModalProps) {
  const name = formula ? `${formula.name}（${formula.code}）` : ''

  const content = () => {
    if (mode === 'disable') {
      return (
        <>
          <div>禁用后公式「{name}」不再作为建模时的绑定候选，已绑定的历史配置保留。</div>
          <div className="modal-confirm-tip">禁用为软停用；如需删除，请先禁用（仅「已禁用」可删除）。</div>
        </>
      )
    }
    if (mode === 'enable') {
      return (
        <>
          <div>启用后公式「{name}」可重新作为建模时的绑定候选。</div>
          <div className="modal-confirm-tip">启用 ↔ 禁用双向可达。</div>
        </>
      )
    }
    return (
      <>
        <div>删除后公式「{name}」不可恢复。</div>
        <div className="modal-confirm-tip">
          仅「已禁用」的公式可删除；建模侧若仍有绑定，请先在建模中解除。
        </div>
      </>
    )
  }

  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="formula.confirm.cancel" onClick={onClose}>
            取消
          </Button>
          <Button
            variant={mode === 'enable' ? 'primary' : 'danger'}
            data-ann-target="formula.confirm.ok"
            onClick={onConfirm}
          >
            {TITLE[mode]}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span
          style={{ color: mode === 'enable' ? 'var(--color-primary)' : 'var(--color-error)', display: 'flex' }}
        >
          <Icon name={mode === 'enable' ? 'check' : 'warning'} size={16} />
        </span>
        <div>{content()}</div>
      </div>
    </Modal>
  )
}

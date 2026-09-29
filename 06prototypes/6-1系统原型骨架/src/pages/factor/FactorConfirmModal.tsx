import { Button, Icon, Modal } from '@/shared/components'
import type { FactorItem } from '@/types'

export type FactorConfirmMode = 'disable' | 'enable' | 'delete'

interface FactorConfirmModalProps {
  open: boolean
  factor: FactorItem | null
  mode: FactorConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<FactorConfirmMode, string> = {
  disable: '确认禁用',
  enable: '确认启用',
  delete: '确认删除',
}

/** 行操作二次确认（启用 / 禁用 / 删除） */
export default function FactorConfirmModal({
  open,
  factor,
  mode,
  onClose,
  onConfirm,
}: FactorConfirmModalProps) {
  const name = factor ? `${factor.name}（${factor.code}）` : ''

  const confirmText = () => {
    if (!factor) return null
    if (mode === 'disable') {
      return (
        <>
          <div>禁用后因子「{name}」不再参与新的因子匹配，已匹配的历史数据不受影响。</div>
          <div className="modal-confirm-tip">禁用为软停用，已匹配处仍只读回显；系统预置因子不可禁用。</div>
        </>
      )
    }
    if (mode === 'enable') {
      return (
        <>
          <div>启用后因子「{name}」可重新参与因子匹配。</div>
          <div className="modal-confirm-tip">启用 ↔ 禁用双向可达。</div>
        </>
      )
    }
    return (
      <>
        <div>删除后因子「{name}」不可恢复。</div>
        <div className="modal-confirm-tip">
          仅「已禁用」的组织自建因子可删除；系统预置因子（environment 库）不可删除。
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
          <Button onClick={onClose}>取消</Button>
          <Button variant={mode === 'enable' ? 'primary' : 'danger'} onClick={onConfirm}>
            {TITLE[mode]}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: mode === 'enable' ? 'var(--color-warning)' : 'var(--color-error)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>{confirmText()}</div>
      </div>
    </Modal>
  )
}

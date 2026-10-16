import { Button, Icon, Modal } from '@/shared/components'
import type { StandardItem } from '@/types'

export type StandardConfirmMode = 'delete'

interface StandardConfirmModalProps {
  open: boolean
  standard: StandardItem | null
  mode: StandardConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<StandardConfirmMode, string> = {
  delete: '确认删除',
}

/** 删除二次确认：确认按钮语义化，禁止「确定」（与物料库 / 计量单位库口径一致） */
export default function StandardConfirmModal({
  open,
  standard,
  mode,
  onClose,
  onConfirm,
}: StandardConfirmModalProps) {
  const label = standard ? `${standard.code}《${standard.nameZh}》` : ''

  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="standard.confirm.cancel" onClick={onClose}>取消</Button>
          <Button variant="primary" data-ann-target="standard.confirm.ok" onClick={onConfirm}>
            {TITLE[mode]}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>
            确认删除标准文件「{label}」？
          </div>
          <div className="modal-confirm-tip">删除为不可逆操作，删除后不可恢复。</div>
        </div>
      </div>
    </Modal>
  )
}

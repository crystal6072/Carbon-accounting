import { Button, Icon, Modal } from '@/shared/components'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmText: string
  tip?: string
  danger?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ConfirmModal({ open, title, message, confirmText, tip, danger, onClose, onConfirm }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="config.confirm.cancel" onClick={onClose}>取消</Button>
          <Button variant={danger ? 'danger' : 'primary'} data-ann-target="config.confirm.ok" onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: danger ? 'var(--color-error)' : 'var(--color-warning)', display: 'flex' }}>
          <Icon name={danger ? 'warning' : 'warning'} size={16} />
        </span>
        <div>
          <div>{message}</div>
          {tip && <div className="modal-confirm-tip">{tip}</div>}
        </div>
      </div>
    </Modal>
  )
}

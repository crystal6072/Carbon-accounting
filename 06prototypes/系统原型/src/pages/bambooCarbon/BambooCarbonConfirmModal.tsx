import { Button, Icon, Modal } from '@/shared/components'
import type { BambooCarbonTopic } from '@/types'

interface BambooCarbonConfirmModalProps {
  open: boolean
  topic: BambooCarbonTopic | null
  onClose: () => void
  onConfirm: () => void
}

export default function BambooCarbonConfirmModal({ open, topic, onClose, onConfirm }: BambooCarbonConfirmModalProps) {
  const label = topic ? `《${topic.title}》` : ''

  return (
    <Modal
      open={open}
      title="确认删除"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onConfirm}>
            确认删除
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>确认删除专题文章「{label}」？</div>
          <div className="modal-confirm-tip">删除为不可逆操作，删除后不可恢复。</div>
        </div>
      </div>
    </Modal>
  )
}

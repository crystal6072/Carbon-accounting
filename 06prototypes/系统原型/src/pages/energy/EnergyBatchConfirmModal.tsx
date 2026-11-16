import { Button, Icon, Modal } from '@/shared/components'
import type { EnableStatus } from '@/types'

interface EnergyBatchConfirmModalProps {
  open: boolean
  status: EnableStatus
  /** 已勾选条数 */
  count: number
  submitting: boolean
  onClose: () => void
  onConfirm: () => void
}

/** 批量启用 / 停用二次确认：确认按钮语义化，禁止用「确定」 */
export default function EnergyBatchConfirmModal({
  open,
  status,
  count,
  submitting,
  onClose,
  onConfirm,
}: EnergyBatchConfirmModalProps) {
  const action = status === 'enabled' ? '启用' : '停用'

  return (
    <Modal
      open={open}
      title={`确认批量${action}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={onConfirm}>
            {submitting ? '处理中…' : `确认批量${action}`}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text" data-ann-target="energy.batch.confirm">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>将对已勾选的 {count} 条能源执行批量{action}？</div>
          <div className="modal-confirm-tip">
            {status === 'enabled'
              ? '启用后该批能源可被工序的「能源投入」选用。'
              : '禁用后该批能源不可被新的工序投入项选用；已有引用不受影响，且禁用后可执行删除。'}
            逐条执行，完成后返回「成功条数 + 跳过清单与原因」。
          </div>
        </div>
      </div>
    </Modal>
  )
}

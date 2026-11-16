import { Button, Icon, Modal } from '@/shared/components'
import type { ProcessItem } from '@/types'
import { useStatusText } from './processMeta'

export type ProcessConfirmMode = 'enable' | 'disable' | 'delete'

interface ProcessConfirmModalProps {
  open: boolean
  process: ProcessItem | null
  mode: ProcessConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<ProcessConfirmMode, string> = {
  enable: '确认上架',
  disable: '确认下架',
  delete: '确认删除',
}

/** 启用 / 禁用 / 删除二次确认：确认按钮语义化，禁止「确定」 */
export default function ProcessConfirmModal({
  open,
  process: processItem,
  mode,
  onClose,
  onConfirm,
}: ProcessConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="process.confirm.cancel" onClick={onClose}>取消</Button>
          <Button data-ann-target="process.confirm.ok" variant={mode === 'delete' ? 'danger' : 'primary'} onClick={onConfirm}>
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
            确认将工艺流程「{processItem?.name}」（当前
            {useStatusText[processItem?.useStatus ?? 'enabled']}）
            {mode === 'enable' ? '上架' : mode === 'disable' ? '下架' : '删除'}？
          </div>
        </div>
      </div>
    </Modal>
  )
}

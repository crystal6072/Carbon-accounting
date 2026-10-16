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
  enable: '确认启用',
  disable: '确认禁用',
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
            确认将工艺流程「{processItem?.name}」（{processItem?.code} · 当前
            {useStatusText[processItem?.useStatus ?? 'enabled']}）
            {mode === 'enable' ? '启用' : mode === 'disable' ? '禁用' : '删除'}？
          </div>
          {mode === 'enable' && (
            <div className="modal-confirm-tip">启用后，该工艺流程可被产品引用（R-009 / Q11）。</div>
          )}
          {mode === 'disable' && (
            <div className="modal-confirm-tip">
              禁用后不可被产品引用（不再出现在产品侧候选列表）；已复制到产品的副本内容不变、不受影响（R-012）。
              模板仍可自由编辑（R-008）。
            </div>
          )}
          {mode === 'delete' && (
            <div className="modal-confirm-tip">
              该工艺流程已处于「禁用」状态，删除后不可恢复。删除「不检查」是否被引用 / 被复制（R-013）；
              若已被产品复制，副本保留来源模板标识、内容不受影响。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

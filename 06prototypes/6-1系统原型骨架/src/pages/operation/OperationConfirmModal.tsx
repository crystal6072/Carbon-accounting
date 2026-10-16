import { Button, Icon, Modal } from '@/shared/components'
import type { OperationItem } from '@/types'
import { operationTypeText } from './operationMeta'

export type OperationConfirmMode = 'enable' | 'disable' | 'delete'

interface OperationConfirmModalProps {
  open: boolean
  operation: OperationItem | null
  mode: OperationConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<OperationConfirmMode, string> = {
  enable: '确认启用',
  disable: '确认禁用',
  delete: '确认删除',
}

/** 启用 / 禁用 / 删除二次确认：确认按钮语义化，禁止「确定」 */
export default function OperationConfirmModal({
  open,
  operation,
  mode,
  onClose,
  onConfirm,
}: OperationConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="operation.confirm.cancel" onClick={onClose}>取消</Button>
          <Button data-ann-target="operation.confirm.ok" variant={mode === 'delete' ? 'danger' : 'primary'} onClick={onConfirm}>
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
            确认将{operationTypeText[operation?.type ?? 'main']}「{operation?.name}」（{operation?.code}）
            {mode === 'enable' ? '启用' : mode === 'disable' ? '禁用' : '删除'}？
          </div>
          {mode === 'enable' && <div className="modal-confirm-tip">启用后该工序可被新的工艺流程引用。</div>}
          {mode === 'disable' && (
            <div className="modal-confirm-tip">
              禁用后该工序不可被新的工艺流程引用；已复制到产品版本的副本内容不变，不受影响。
            </div>
          )}
          {mode === 'delete' && (
            <div className="modal-confirm-tip">
              该工序已处于「禁用」状态，删除后不可恢复。若工艺流程模板仍引用它，需在工艺流程侧调整（本模块不做引用校验）。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

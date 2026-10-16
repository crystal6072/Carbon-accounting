import { Button, Icon, Modal } from '@/shared/components'
import type { EnableStatus } from '@/types'

export type MaterialConfirmMode = 'enable' | 'disable' | 'delete'

interface MaterialConfirmTarget {
  code: string
  name: string
  status: EnableStatus
}

interface MaterialConfirmModalProps {
  open: boolean
  material: MaterialConfirmTarget | null
  mode: MaterialConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<MaterialConfirmMode, string> = {
  enable: '确认启用',
  disable: '确认禁用',
  delete: '确认删除',
}

/** 启用 / 禁用 / 删除二次确认：确认按钮语义化，禁止用「确定」 */
export default function MaterialConfirmModal({
  open,
  material,
  mode,
  onClose,
  onConfirm,
}: MaterialConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="material.confirm.cancel" onClick={onClose}>取消</Button>
          <Button variant={mode === 'delete' ? 'danger' : 'primary'} data-ann-target="material.confirm.ok" onClick={onConfirm}>
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
            确认将物料「{material?.name}」（{material?.code}）
            {mode === 'enable' ? '启用' : mode === 'disable' ? '禁用' : '删除'}？
          </div>
          {mode === 'enable' && (
            <div className="modal-confirm-tip">启用后该物料可被工序按对应流类型选用。</div>
          )}
          {mode === 'disable' && (
            <div className="modal-confirm-tip">
              禁用后该物料不可被新的工序投入项 / 产出项选用；已有引用不受影响。禁用后可执行删除。
            </div>
          )}
          {mode === 'delete' && (
            <div className="modal-confirm-tip">
              删除后不可恢复。仅「已禁用」的物料可删除；当前物料使用状态为「
              {material?.status === 'disabled' ? '禁用' : '启用'}」。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

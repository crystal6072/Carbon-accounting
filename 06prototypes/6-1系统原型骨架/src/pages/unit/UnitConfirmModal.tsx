import { Button, Icon, Modal } from '@/shared/components'
import type { UnitItem } from '@/types'

export type UnitConfirmMode = 'enable' | 'disable' | 'delete'

interface UnitConfirmModalProps {
  open: boolean
  unit: UnitItem | null
  mode: UnitConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<UnitConfirmMode, string> = {
  enable: '确认启用',
  disable: '确认禁用',
  delete: '确认删除',
}

const ACTION: Record<UnitConfirmMode, string> = {
  enable: '启用',
  disable: '禁用',
  delete: '删除',
}

/** 单位启用 / 禁用 / 删除二次确认：确认按钮语义化，禁止「确定」（§7.2） */
export default function UnitConfirmModal({ open, unit, mode, onClose, onConfirm }: UnitConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="unit.confirm.cancel" onClick={onClose}>取消</Button>
          <Button variant="primary" data-ann-target="unit.confirm.ok" onClick={onConfirm}>
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
            确认{ACTION[mode]}单位「{unit?.name}」（{unit?.symbol}）？
          </div>
          {mode === 'disable' && (
            <div className="modal-confirm-tip">
              禁用后该单位不可被新的业务选用；已引用该单位的历史数据不受影响。禁用后可执行删除。
            </div>
          )}
          {mode === 'enable' && <div className="modal-confirm-tip">启用后该单位可被新的业务选用。</div>}
          {mode === 'delete' && (
            <div className="modal-confirm-tip">
              删除为不可逆操作。仅「已禁用」的非基准单位可删除；基准单位受保护不可删除（R-003）。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

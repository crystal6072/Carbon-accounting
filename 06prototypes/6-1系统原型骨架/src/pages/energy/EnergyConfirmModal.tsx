import { Button, Icon, Modal } from '@/shared/components'
import type { EnableStatus } from '@/types'

export type EnergyConfirmMode = 'enable' | 'disable' | 'delete'

interface EnergyConfirmTarget {
  code: string
  name: string
  status: EnableStatus
}

interface EnergyConfirmModalProps {
  open: boolean
  energy: EnergyConfirmTarget | null
  mode: EnergyConfirmMode
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<EnergyConfirmMode, string> = {
  enable: '确认启用',
  disable: '确认禁用',
  delete: '确认删除',
}

/** 启用 / 禁用 / 删除二次确认：确认按钮语义化，禁止用「确定」 */
export default function EnergyConfirmModal({ open, energy, mode, onClose, onConfirm }: EnergyConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="energy.confirm.cancel" onClick={onClose}>取消</Button>
          <Button variant={mode === 'delete' ? 'danger' : 'primary'} data-ann-target="energy.confirm.ok" onClick={onConfirm}>
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
            确认将能源「{energy?.name}」（{energy?.code}）
            {mode === 'enable' ? '启用' : mode === 'disable' ? '禁用' : '删除'}？
          </div>
          {mode === 'enable' && <div className="modal-confirm-tip">启用后该能源可被工序的「能源投入」选用。</div>}
          {mode === 'disable' && (
            <div className="modal-confirm-tip">
              禁用后该能源不可被新的工序投入项选用；已有引用不受影响。禁用后可执行删除。
            </div>
          )}
          {mode === 'delete' && (
            <div className="modal-confirm-tip">
              删除后不可恢复。仅「已禁用」的能源可删除；当前能源使用状态为「
              {energy?.status === 'disabled' ? '禁用' : '启用'}」。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

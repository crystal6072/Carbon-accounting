import { Button, Icon, Modal } from '@/shared/components'

export type UnitBatchMode = 'enable' | 'delete'

interface UnitBatchConfirmModalProps {
  open: boolean
  mode: UnitBatchMode
  /** 已勾选条数 */
  count: number
  submitting: boolean
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<UnitBatchMode, string> = {
  enable: '确认批量启用',
  delete: '确认批量删除',
}

const ACTION: Record<UnitBatchMode, string> = {
  enable: '启用',
  delete: '删除',
}

/** 批量启用 / 批量删除二次确认：确认按钮语义化，禁止用「确定」 */
export default function UnitBatchConfirmModal({
  open,
  mode,
  count,
  submitting,
  onClose,
  onConfirm,
}: UnitBatchConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant={mode === 'delete' ? 'danger' : 'primary'} disabled={submitting} onClick={onConfirm}>
            {submitting ? '处理中…' : TITLE[mode]}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text" data-ann-target="unit.batch.confirm">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>
            将对已勾选的 {count} 条单位执行批量{ACTION[mode]}？
          </div>
          <div className="modal-confirm-tip">
            {mode === 'enable'
              ? '启用后该批单位可被新的业务选用；基准单位开关不适用。'
              : '删除为不可逆操作，且仅「已禁用」的非基准单位可删除；基准单位受保护不可删除。'}
            逐条执行，完成后返回「成功条数 + 跳过清单与原因」。
          </div>
        </div>
      </div>
    </Modal>
  )
}

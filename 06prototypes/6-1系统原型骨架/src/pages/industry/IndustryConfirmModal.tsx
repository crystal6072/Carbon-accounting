import { Button, Icon, Modal } from '@/shared/components'
import type { IndustryItem } from '@/types'

interface IndustryConfirmModalProps {
  open: boolean
  item: IndustryItem | null
  target: 'enabled' | 'disabled'
  onClose: () => void
  onConfirm: () => void
}

/** 启用 / 禁用二次确认弹窗：确认按钮语义化，禁止「确定」 */
export default function IndustryConfirmModal({ open, item, target, onClose, onConfirm }: IndustryConfirmModalProps) {
  const isEnable = target === 'enabled'
  return (
    <Modal
      open={open}
      title={isEnable ? '确认启用' : '确认禁用'}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onConfirm}>
            {isEnable ? '确认启用' : '确认禁用'}
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
            确认将行业「{item?.name}」（{item?.code}）{isEnable ? '启用' : '禁用'}？
          </div>
          {!isEnable && (
            <div className="modal-confirm-tip">
              禁用后，下游「适用行业 / 所属行业」下拉中不再可选该行业；历史引用数据保留不变。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

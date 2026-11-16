import { Button, Icon, Modal } from '@/shared/components'
import type { ProductItem, ProductUseStatus } from '@/types'

interface ProductConfirmModalProps {
  open: boolean
  product: ProductItem | null
  target: ProductUseStatus
  onClose: () => void
  onConfirm: () => void
}

/** 上架 / 下架二次确认（**产品级**，不再作用于版本）：确认按钮语义化，禁止「确定」 */
export default function ProductConfirmModal({
  open,
  product,
  target,
  onClose,
  onConfirm,
}: ProductConfirmModalProps) {
  const isOn = target === 'on'
  return (
    <Modal
      open={open}
      title={isOn ? '确认上架' : '确认下架'}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onConfirm}>
            {isOn ? '确认上架' : '确认下架'}
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
            确认将产品「{product?.name}」（{product?.code}）{isOn ? '上架' : '下架'}？
          </div>
          {isOn ? (
            <div className="modal-confirm-tip">上架后该产品可被新的核算项目选择。</div>
          ) : (
            <div className="modal-confirm-tip">
              下架后新项目不可选择该产品；已引用该产品的项目、核算结果与报告不受影响。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

import { Button, Icon, Modal } from '@/shared/components'
import type { ProductItem } from '@/types'

interface ProductDeleteModalProps {
  open: boolean
  product: ProductItem | null
  onClose: () => void
  onConfirm: () => void
}

/** 删除产品二次确认（仅下架态可触发） */
export default function ProductDeleteModal({
  open,
  product,
  onClose,
  onConfirm,
}: ProductDeleteModalProps) {
  return (
    <Modal
      open={open}
      title="确认删除"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="danger" onClick={onConfirm}>
            确认删除
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>确认删除产品「{product?.name}」（{product?.code}）？</div>
          <div className="modal-confirm-tip">
            删除后不可恢复，已引用该产品的项目、核算结果与报告不受影响。
          </div>
        </div>
      </div>
    </Modal>
  )
}

import { Button, Modal, useToast } from '@/shared/components'
import type { CarbonCase } from '@/types'
import { ownerText } from './caseLibraryMeta'

interface CaseLibraryConfirmModalProps {
  open: boolean
  item: CarbonCase | null
  onClose: () => void
  onConfirm: () => void
}

export default function CaseLibraryConfirmModal({ open, item, onClose, onConfirm }: CaseLibraryConfirmModalProps) {
  const toast = useToast()
  return (
    <Modal
      open={open}
      title="删除案例"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onConfirm}>确认删除</Button>
        </>
      }
    >
      {item ? (
        <p>
          确认删除案例「<strong>{item.caseName}</strong>」（{ownerText(item)}）？删除后不可恢复。
        </p>
      ) : (
        <p>请选择要删除的案例。</p>
      )}
      <p className="case-confirm-tip">提示：为演示租户隔离，仅「本企业」案例可被当前账号删除。</p>
    </Modal>
  )
}

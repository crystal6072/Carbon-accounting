import { useState } from 'react'
import { Button, Modal } from '@/shared/components'
import type { LibraryFileItem } from '@/types'
import { activeRefCountOf, categoryText } from './fileMeta'

interface FileConfirmModalProps {
  open: boolean
  file: LibraryFileItem | null
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

/** 删除确认弹窗：被有效引用的文件不可删除（D08 / D12），此处直接禁用并说明 */
export default function FileConfirmModal({ open, file, onClose, onConfirm }: FileConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const refCount = file ? activeRefCountOf(file) : 0

  const handleConfirm = async () => {
    if (refCount > 0) return
    setSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="删除文件"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="danger"
            disabled={submitting || !file || refCount > 0}
            onClick={handleConfirm}
          >
            {submitting ? '处理中…' : '确认删除'}
          </Button>
        </>
      }
    >
      {!file ? (
        <div className="empty">文件已不存在</div>
      ) : (
        <div className="confirm-body">
          <div className="detail-list" style={{ gridTemplateColumns: '1fr' }}>
            <div className="detail-item">
              <span className="detail-label">文件名称</span>
              <span className="detail-value">{file.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">文件编码</span>
              <span className="detail-value mono">{file.code}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">文件分类</span>
              <span className="detail-value">{categoryText[file.category]}</span>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-md)' }}>
            {refCount > 0
              ? `该文件已被 ${refCount} 处业务引用，需先解除引用后才能删除。`
              : `将删除整条记录（含 ${file.versions.length} 个文件记录），不可恢复。`}
          </div>
        </div>
      )}
    </Modal>
  )
}

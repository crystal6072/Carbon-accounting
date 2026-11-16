import { useEffect, useMemo } from 'react'
import { Button, Modal } from '@/shared/components'
import type { LibraryFileItem, LibraryFileVersion } from '@/types'
import { formatSize } from './fileMeta'
import { downloadFile, previewKindOf, toBlobUrl } from './fileUtils'

interface FilePreviewModalProps {
  open: boolean
  file: LibraryFileItem | null
  version: LibraryFileVersion | null
  onClose: () => void
}

/** 文件预览：图片 / PDF 在线渲染，其余提示下载（字段清单 §2.7 / D14） */
export default function FilePreviewModal({ open, file, version, onClose }: FilePreviewModalProps) {
  const kind = version ? previewKindOf(version) : 'none'

  /** data URL → Blob URL（data: 地址无法直接用于 iframe / 顶层导航） */
  const previewUrl = useMemo(() => (version?.url ? toBlobUrl(version.url) : ''), [version])

  useEffect(() => {
    if (!previewUrl.startsWith('blob:')) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const canRender = !!previewUrl && kind !== 'none'

  return (
    <Modal
      open={open}
      title={`文件预览${file ? ` · ${file.name}` : ''}`}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>关闭</Button>
          <Button
            variant="primary"
            disabled={!version?.url}
            onClick={() => version?.url && downloadFile(version.url, version.fileName)}
          >
            下载
          </Button>
        </>
      }
    >
      {!file || !version ? (
        <div className="empty">文件不存在</div>
      ) : (
        <>
          <div className="detail-list" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="detail-item">
              <span className="detail-label">文件名</span>
              <span className="detail-value">{version.fileName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">文件大小</span>
              <span className="detail-value">{formatSize(version.size)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">上传时间</span>
              <span className="detail-value">{version.uploadedAt}</span>
            </div>
          </div>

          <div className="file-preview-stage">
            {canRender && kind === 'image' && (
              <img className="file-preview-image" src={previewUrl} alt={version.fileName} />
            )}
            {canRender && kind === 'pdf' && (
              <iframe className="file-preview-frame" src={previewUrl} title={version.fileName} />
            )}
            {!canRender && (
              <div className="file-preview-placeholder">
                <span>{kind === 'none' ? '该格式暂不支持在线预览，请下载后查看' : '演示数据未包含文件内容'}</span>
                <span>PDF / 图片支持在线预览；Word / Excel 仅支持下载</span>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

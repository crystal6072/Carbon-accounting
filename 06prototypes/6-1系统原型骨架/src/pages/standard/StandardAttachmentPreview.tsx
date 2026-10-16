import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button, useToast } from '@/shared/components'
import type { StandardAttachment } from '@/types'
import { attachmentSizeText } from './standardMeta'
import './StandardPage.css'

interface StandardAttachmentPreviewProps {
  open: boolean
  attachment: StandardAttachment | null
  onClose: () => void
}

type PreviewKind = 'pdf' | 'image' | 'other'

/** 由文件名解析预览类型（正式环境按附件 MIME / 后缀判定） */
function kindOf(name: string): PreviewKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image'
  return 'other'
}

const FILE_ICON: Record<PreviewKind, string> = { pdf: 'PDF', image: 'IMG', other: 'FILE' }

/**
 * 标准文件附件 · 在线预览（原型模拟）：
 * - PDF / 图片：本地选择的附件读取为 data URL 直接渲染；系统预置附件无内容时走「模拟预览」占位；
 * - 其他格式：提示下载后查阅。
 * 正式环境由附件管理（§C6）鉴权后经服务端渲染嵌入（与报告 Word 预览同口径）。
 */
export default function StandardAttachmentPreview({ open, attachment, onClose }: StandardAttachmentPreviewProps) {
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !attachment) return null

  const kind = kindOf(attachment.name)

  const renderBody = () => {
    // 有真实内容（本地选择的附件）
    if (attachment.url && kind === 'image') {
      return (
        <div className="standard-preview-center">
          <img className="standard-preview-image" src={attachment.url} alt={attachment.name} />
        </div>
      )
    }
    if (attachment.url && kind === 'pdf') {
      return <iframe className="standard-preview-frame" src={attachment.url} title={attachment.name} />
    }
    // 无内容：系统预置附件 —— 模拟预览
    if (kind === 'pdf') {
      return (
        <div className="standard-preview-doc">
          {[1, 2].map((page) => (
            <section className="standard-preview-sheet" key={page}>
              <div className="standard-preview-sheet-inner">
                <div className="standard-preview-sheet-title">{attachment.name.replace(/\.pdf$/i, '')}</div>
                <div className="standard-preview-sheet-watermark">原型模拟预览</div>
                <div className="standard-preview-line" style={{ width: '72%' }} />
                <div className="standard-preview-line" style={{ width: '90%' }} />
                <div className="standard-preview-line" style={{ width: '84%' }} />
                <div className="standard-preview-line" style={{ width: '88%' }} />
                <div className="standard-preview-line" style={{ width: '60%' }} />
              </div>
              <div className="standard-preview-sheet-footer">第 {page} 页</div>
            </section>
          ))}
        </div>
      )
    }
    if (kind === 'image') {
      return <div className="empty">图片附件为原型占位，正式环境按附件地址直接渲染预览</div>
    }
    return <div className="empty">该格式暂不支持在线预览，请下载后查阅</div>
  }

  return createPortal(
    <div className="standard-preview-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="standard-preview-dialog" role="dialog" aria-modal="true" aria-label="附件预览">
        <div className="standard-preview-toolbar">
          <div className="standard-preview-file">
            <span className="standard-preview-file-icon">{FILE_ICON[kind]}</span>
            <span className="standard-preview-file-name" title={attachment.name}>
              {attachment.name}
            </span>
            <span className="standard-preview-badge">
              {attachmentSizeText(attachment.size)} · {attachment.uploadedAt}
            </span>
          </div>
          <div className="standard-preview-tools">
            <Button
              size="small"
              onClick={() => toast('原型未接入附件下载；正式环境由附件管理（§C6）鉴权后下发')}
            >
              下载
            </Button>
            <Button size="small" variant="primary" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>

        <div className="standard-preview-body">{renderBody()}</div>

        <div className="standard-preview-tip">
          附件支持在线预览；仅限企业内部查阅，不得作为对外交付物、不得跨租户共享（A3 / R-011）。
        </div>
      </div>
    </div>,
    document.body,
  )
}

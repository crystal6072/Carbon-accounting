import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, useToast } from '@/shared/components'
import './PcfReport.css'

interface PcfWordPreviewProps {
  open: boolean
  /** 报告文件名（工具条左侧展示） */
  fileName: string
  /** 工具条文件状态标签（默认「Word 预览（原型模拟）」；草稿预览可传「草稿预览 · 未生成」） */
  badge?: string
  /** 报告分页内容：一「页」= 一张 A4 纸张 */
  pages: ReactNode[]
  onClose: () => void
  /** 下载报告（工具条「下载」） */
  onDownload?: () => void
}

const ZOOM_MIN = 0.6
const ZOOM_MAX = 1.6
const ZOOM_STEP = 0.2

/**
 * 报告预览控件（原型模拟「Word 在线阅读器」）：
 * 工具条（文件名 / 页码 / 缩放 / 在 Word 中打开 / 下载 / 关闭）+ 多页 A4 纸张滚动区。
 * 正式环境由服务端生成 doc/docx 后嵌入 Office 在线预览，本组件仅承载原型交互与版式。
 */
export default function PcfWordPreview({
  open,
  fileName,
  badge = 'Word 预览（原型模拟）',
  pages,
  onClose,
  onDownload,
}: PcfWordPreviewProps) {
  const toast = useToast()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pageIndex, setPageIndex] = useState(0)

  const pageCount = pages.length

  // 仅在打开时复位缩放与滚动（pages 每次渲染为新数组，不可作为依赖，否则会打断用户浏览）
  useEffect(() => {
    if (!open) return
    setZoom(1)
    setPageIndex(0)
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollTop = 0
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /** 滚动时按纸张位置回填页码 */
  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const sheets = Array.from(scroller.querySelectorAll<HTMLElement>('.pcf-word-sheet'))
    if (!sheets.length) return
    const scrollerTop = scroller.getBoundingClientRect().top
    const anchor = scrollerTop + 24
    const index = sheets.findIndex((sheet) => sheet.getBoundingClientRect().bottom > anchor)
    setPageIndex(index < 0 ? sheets.length - 1 : index)
  }, [])

  if (!open) return null

  return createPortal(
    <div className="pcf-word-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pcf-word-dialog" role="dialog" aria-modal="true" aria-label="报告预览">
        {/* 工具条 */}
        <div className="pcf-word-toolbar">
          <div className="pcf-word-file">
            <span className="pcf-word-file-icon">W</span>
            <span className="pcf-word-file-name" title={fileName}>
              {fileName}
            </span>
            <span className="pcf-word-badge">{badge}</span>
          </div>
          <div className="pcf-word-tools">
            <span className="pcf-word-pager">
              第 {pageIndex + 1} / {Math.max(pageCount, 1)} 页
            </span>
            <div className="pcf-word-zoom">
              <button
                type="button"
                aria-label="缩小"
                disabled={zoom <= ZOOM_MIN}
                onClick={() => setZoom((prev) => Math.max(ZOOM_MIN, Number((prev - ZOOM_STEP).toFixed(1))))}
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                aria-label="放大"
                disabled={zoom >= ZOOM_MAX}
                onClick={() => setZoom((prev) => Math.min(ZOOM_MAX, Number((prev + ZOOM_STEP).toFixed(1))))}
              >
                ＋
              </button>
            </div>
            <Button size="small" onClick={() => setZoom(1)}>
              适应宽度
            </Button>
            <Button
              size="small"
              onClick={() =>
                toast('原型未接入 Office 在线预览；正式环境由服务端转换后嵌入 Word 控件打开')
              }
            >
              在 Word 中打开
            </Button>
            {onDownload && (
              <Button size="small" onClick={onDownload}>
                下载
              </Button>
            )}
            <Button size="small" variant="primary" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>

        {/* 纸张滚动区 */}
        <div className="pcf-word-scroller" ref={scrollerRef} onScroll={handleScroll}>
          <div className="pcf-word-canvas" style={{ zoom }}>
            {pages.map((page, index) => (
              <section className="pcf-word-sheet" key={index}>
                <div className="pcf-word-sheet-body">{page}</div>
                <div className="pcf-word-sheet-footer">
                  第 {index + 1} 页 / 共 {Math.max(pageCount, 1)} 页
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

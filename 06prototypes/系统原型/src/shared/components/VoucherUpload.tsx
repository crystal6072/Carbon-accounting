import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'
import Icon from './Icon'
import { useToast } from './Toast'
import type { PcfVoucher } from '@/types'
import './VoucherUpload.css'

let voucherSeed = 0
const nextVoucherId = () => `VC-${Date.now().toString(36)}-${voucherSeed++}`

/** 凭证附件允许的文件类型：图片 / Word / Excel / PDF */
export const VOUCHER_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx'

const VOUCHER_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx']

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']

const OFFICE_EXT = ['doc', 'docx', 'xls', 'xlsx']

/** 判断文件是否为允许的凭证类型（按扩展名 + 图片 MIME 兜底） */
export function isVoucherFileAllowed(file: File): boolean {
  const name = (file.name || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() ?? '' : ''
  if (VOUCHER_EXT.includes(ext)) return true
  if (file.type.startsWith('image/')) return true
  return false
}

/** 附件可在线预览的类型：图片 / PDF / Office（Word、Excel） */
export function voucherPreviewKind(voucher: PcfVoucher): 'image' | 'pdf' | 'office' | 'none' {
  const url = voucher.url ?? ''
  const ext = (voucher.name || '').toLowerCase().includes('.') ? (voucher.name || '').toLowerCase().split('.').pop() ?? '' : ''
  if (IMAGE_EXT.includes(ext) || url.startsWith('data:image/')) return 'image'
  if (ext === 'pdf' || url.startsWith('data:application/pdf')) return 'pdf'
  if (OFFICE_EXT.includes(ext)) return 'office'
  return 'none'
}

/** 生成文档 / 表格占位预览图（演示用）：无真实文件内容时，预览给出代表性版式 */
function demoOfficePreview(name: string): string {
  const label = (name || '文档').slice(0, 40)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520"><rect width="100%" height="100%" fill="#ffffff"/><rect x="0" y="0" width="100%" height="56" fill="#2f6fed"/><text x="24" y="35" font-family="-apple-system,Segoe UI,Microsoft YaHei,sans-serif" font-size="20" fill="#ffffff">${label}</text><rect x="24" y="88" width="672" height="14" rx="3" fill="#e6ebf5"/><rect x="24" y="116" width="600" height="14" rx="3" fill="#e6ebf5"/><rect x="24" y="144" width="640" height="14" rx="3" fill="#e6ebf5"/><rect x="24" y="172" width="520" height="14" rx="3" fill="#e6ebf5"/><rect x="24" y="220" width="320" height="220" rx="6" fill="#f3f6fc" stroke="#d6e0f5"/><rect x="24" y="220" width="320" height="32" rx="6" fill="#2f6fed" fill-opacity="0.12"/><rect x="360" y="220" width="336" height="220" rx="6" fill="#f3f6fc" stroke="#d6e0f5"/><text x="50%" y="492" font-family="-apple-system,Segoe UI,Microsoft YaHei,sans-serif" font-size="14" fill="#9aa6bd" text-anchor="middle">原型演示占位预览 · 非真实文件内容</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 扩展名（小写、不含点） */
function extOfName(name: string): string {
  const lower = (name || '').toLowerCase()
  return lower.includes('.') ? lower.split('.').pop() ?? '' : ''
}

/** 生成 PDF 占位预览图（演示用）：无真实文件内容时给出代表性版式 */
function demoPdfPreview(name: string): string {
  const label = (name || 'PDF 文档').slice(0, 40)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520"><rect width="100%" height="100%" fill="#ffffff"/><rect x="0" y="0" width="100%" height="56" fill="#d9342b"/><text x="24" y="35" font-family="-apple-system,Segoe UI,Microsoft YaHei,sans-serif" font-size="20" fill="#ffffff">${label}</text><rect x="24" y="88" width="672" height="14" rx="3" fill="#f0e6e5"/><rect x="24" y="116" width="600" height="14" rx="3" fill="#f0e6e5"/><rect x="24" y="144" width="640" height="14" rx="3" fill="#f0e6e5"/><rect x="24" y="172" width="500" height="14" rx="3" fill="#f0e6e5"/><rect x="24" y="220" width="672" height="220" rx="6" fill="#fbf5f4" stroke="#f0d6d3"/><text x="50%" y="492" font-family="-apple-system,Segoe UI,Microsoft YaHei,sans-serif" font-size="14" fill="#9aa6bd" text-anchor="middle">原型演示占位预览 · 非真实文件内容</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 生成可打开的最小 PDF（演示用占位下载） */
function demoPdfBlob(): Blob {
  const content = 'BT /F1 16 Tf 72 760 Td (Prototype demo document) Tj ET'
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

/** 文件大小展示：B / KB / MB */
export function formatSize(size: number): string {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/** 当前时间 `YYYY-MM-DD HH:mm` */
function nowStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 读取本地文件为 data URL（原型只做本地保存 / 预览，不落真实文件服务） */
function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

/**
 * data URL → Blob URL。
 * 浏览器会拦截对 `data:` 地址的顶层导航，直接用于预览 / 下载会失败，因此统一转成 Blob URL。
 */
function toBlobUrl(url: string): string {
  if (!url.startsWith('data:')) return url
  const comma = url.indexOf(',')
  if (comma < 0) return url
  const meta = url.slice(5, comma)
  const payload = url.slice(comma + 1)
  const mime = meta.split(';')[0] || 'application/octet-stream'
  try {
    let bytes: Uint8Array
    if (meta.includes(';base64')) {
      const bin = atob(payload)
      const arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i)
      bytes = arr
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(payload))
    }
    return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mime }))
  } catch {
    return url
  }
}

/** 触发浏览器下载（Blob URL + download 属性）；无真实文件内容时下载演示占位文件 */
function saveVoucher(voucher: PcfVoucher) {
  let url: string
  if (voucher.url) {
    url = toBlobUrl(voucher.url)
  } else {
    const blob =
      extOfName(voucher.name) === 'pdf'
        ? demoPdfBlob()
        : new Blob([`原型演示文件：${voucher.name}\n\n当前为原型演示占位内容，非真实业务文件。`], {
            type: 'text/plain;charset=utf-8',
          })
    url = URL.createObjectURL(blob)
  }
  const a = document.createElement('a')
  a.href = url
  a.download = voucher.name || '凭证附件'
  a.rel = 'noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (url.startsWith('blob:')) window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

interface PreviewState {
  voucher: PcfVoucher
  url: string
  render: 'image' | 'frame' | 'none'
}

interface VoucherUploadProps {
  value: PcfVoucher[]
  onChange: (vouchers: PcfVoucher[]) => void
  /** 只读（如查看态）时隐藏上传与移除 */
  disabled?: boolean
  emptyText?: string
  /** 上传按钮文案，默认「上传凭证附件」 */
  uploadText?: string
  /** 传入则在上传按钮旁展示「从文件库选择」入口（与上传按钮同一行） */
  onPickFromLibrary?: () => void
  /** 文件库入口文案，默认「从文件库选择」 */
  libraryText?: string
  /** 是否显示上传工具栏旁的说明文案，默认显示；表单需精简时可关闭 */
  showHint?: boolean
}

/**
 * 数据凭证内联上传（无弹窗）：
 * 支持上传 **多个凭证附件**（图片 / PDF 等），**非必填**；原型以 data URL 本地存储。
 * 在表单内直接展示附件列表，可**在线预览 / 下载** / 移除，避免额外弹窗打断录入。
 */
export default function VoucherUpload({
  value,
  onChange,
  disabled = false,
  emptyText = '暂未上传凭证附件',
  uploadText = '上传凭证附件',
  onPickFromLibrary,
  libraryText = '从文件库选择',
  showHint = true,
}: VoucherUploadProps) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  const closePreview = () => {
    if (preview && preview.url.startsWith('blob:')) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  /** 预览遮罩开启时拦截 Esc（捕获阶段），避免同时关闭下层表单弹窗 */
  useEffect(() => {
    if (!preview) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (preview.url.startsWith('blob:')) URL.revokeObjectURL(preview.url)
      setPreview(null)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [preview])

  const openPreview = (voucher: PcfVoucher) => {
    const kind = voucherPreviewKind(voucher)
    if (kind === 'image') {
      if (!voucher.url) {
        setPreview({ voucher, url: '', render: 'none' })
        return
      }
      setPreview({ voucher, url: toBlobUrl(voucher.url), render: 'image' })
      return
    }
    if (kind === 'pdf') {
      if (voucher.url) setPreview({ voucher, url: toBlobUrl(voucher.url), render: 'frame' })
      else setPreview({ voucher, url: demoPdfPreview(voucher.name), render: 'image' })
      return
    }
    if (kind === 'office') {
      setPreview({ voucher, url: demoOfficePreview(voucher.name), render: 'image' })
      return
    }
    setPreview({ voucher, url: '', render: 'none' })
  }

  const handlePick = async (files: File[]) => {
    if (files.length === 0) return
    const allowed = files.filter(isVoucherFileAllowed)
    const rejected = files.length - allowed.length
    setUploading(true)
    try {
      const stamp = nowStamp()
      const added = await Promise.all(
        allowed.map(async (file) => ({
          id: nextVoucherId(),
          name: file.name,
          size: file.size,
          url: await readFile(file),
          uploadedAt: stamp,
        })),
      )
      onChange([...value, ...added])
      if (allowed.length > 0) toast(`已添加 ${allowed.length} 个凭证附件`)
      if (rejected > 0) toast(`已忽略 ${rejected} 个不支持的文件（仅支持图片 / Word / Excel / PDF）`, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="voucher-upload">
      {!disabled && (
        <div className="voucher-upload-toolbar">
          {onPickFromLibrary && (
            <Button size="small" onClick={onPickFromLibrary}>
              {libraryText}
            </Button>
          )}
          <Button size="small" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? '上传中…' : uploadText}
          </Button>
          {showHint && <span className="voucher-upload-hint">支持图片 / Word / Excel / PDF，非必填</span>}
          <input
            ref={fileRef}
            type="file"
            accept={VOUCHER_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              void handlePick(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>
      )}
      {value.length > 0 ? (
        <ul className="voucher-upload-list">
          {value.map((v) => {
            const kind = voucherPreviewKind(v)
            return (
              <li key={v.id}>
                <span className="voucher-upload-name" title={v.name}>
                  {v.name}
                </span>
                <span className="voucher-upload-meta">
                  {formatSize(v.size)} · {v.uploadedAt}
                </span>
                {(kind !== 'none' || !!v.url) && (
                  <span className="voucher-upload-actions">
                    {kind !== 'none' && (
                      <button type="button" className="link" onClick={() => openPreview(v)}>
                        预览
                      </button>
                    )}
                    <button type="button" className="link" onClick={() => saveVoucher(v)}>
                      下载
                    </button>
                  </span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    className="link link-danger"
                    onClick={() => onChange(value.filter((item) => item.id !== v.id))}
                  >
                    移除
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="voucher-upload-empty">{emptyText}</div>
      )}

      {preview &&
        createPortal(
          <div
            className="modal-mask voucher-preview-mask"
            onMouseDown={(e) => e.target === e.currentTarget && closePreview()}
          >
            <div className="modal modal-lg voucher-preview-modal" role="dialog" aria-modal="true">
              <div className="modal-header">
                <span className="modal-title">凭证预览 · {preview.voucher.name}</span>
                <button className="modal-close" type="button" aria-label="关闭" onClick={closePreview}>
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="modal-body">
                {preview.render === 'image' && (
                  <img className="voucher-preview-image" src={preview.url} alt={preview.voucher.name} />
                )}
                {preview.render === 'frame' && (
                  <iframe className="voucher-preview-frame" src={preview.url} title={preview.voucher.name} />
                )}
                {preview.render === 'none' && (
                  <div className="voucher-preview-tip">该格式暂不支持在线预览，请下载后查看。</div>
                )}
              </div>
              <div className="modal-footer">
                <Button onClick={closePreview}>关闭</Button>
                <Button variant="primary" onClick={() => saveVoucher(preview.voucher)}>
                  下载
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

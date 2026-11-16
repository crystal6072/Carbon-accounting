import { useRef } from 'react'
import type { ReactNode } from 'react'
import Button from './Button'
import './FileUploadField.css'

export interface UploadFieldFile {
  id: string
  /** 原始文件名 */
  name: string
  size: number
  /** 扩展名（小写、不含点），缺省由文件名推导 */
  ext?: string
  url?: string
  /** 行尾标记，如「待保存」 */
  tag?: string
}

interface FileUploadFieldProps {
  files: UploadFieldFile[]
  accept?: string
  multiple?: boolean
  /** 操作区右侧提示 */
  hint?: string
  /** 无文件时的占位文案 */
  emptyText?: string
  disabled?: boolean
  onPick: (files: File[]) => void
  onRemove?: (id: string) => void
  onPreview?: (file: UploadFieldFile) => void
  onDownload?: (file: UploadFieldFile) => void
  /** 覆盖默认的操作区（一般不需要） */
  extra?: ReactNode
}

/** 文件大小展示：B / KB / MB */
function formatSize(size: number): string {
  if (!size) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function extOf(name: string): string {
  const lower = (name || '').toLowerCase()
  return lower.includes('.') ? lower.split('.').pop() ?? '' : ''
}

/**
 * 文件上传区（新增 / 编辑共用）。
 *
 * 统一形态：虚线容器内「已选文件行 + 底部选择文件」。
 * 空态只显示选择按钮；编辑替换文件时用同一组件，视觉与新增完全一致。
 * 支持点击选择与拖拽放入。
 */
export default function FileUploadField({
  files,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  multiple = false,
  hint,
  emptyText = '暂无文件',
  disabled = false,
  onPick,
  onRemove,
  onPreview,
  onDownload,
  extra,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? [])
    if (picked.length === 0) return
    onPick(multiple ? picked : picked.slice(0, 1))
  }

  return (
    <div
      className={['upload-field', disabled ? 'upload-field-disabled' : ''].filter(Boolean).join(' ')}
      onDragOver={(e) => {
        if (disabled) return
        e.preventDefault()
      }}
      onDrop={(e) => {
        if (disabled) return
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
      }}
    >
      {files.length > 0 ? (
        <ul className="upload-field-list">
          {files.map((file) => (
            <li className="upload-field-item" key={file.id}>
              <span className="upload-field-ext">{file.ext || extOf(file.name) || '—'}</span>
              <span className="upload-field-name" title={file.name}>
                {file.name}
              </span>
              <span className="upload-field-size">{formatSize(file.size)}</span>
              {file.tag && <span className="upload-field-tag">{file.tag}</span>}
              {onPreview && (
                <button type="button" className="link" onClick={() => onPreview(file)}>
                  预览
                </button>
              )}
              {onDownload && (
                <button type="button" className="link" onClick={() => onDownload(file)}>
                  下载
                </button>
              )}
              {onRemove && !disabled && (
                <button type="button" className="link link-danger" onClick={() => onRemove(file.id)}>
                  删除
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="upload-field-empty">{emptyText}</div>
      )}

      {!disabled && (
        <div className="upload-field-actions">
          <Button size="small" onClick={() => inputRef.current?.click()}>
            选择文件
          </Button>
          {hint && <span className="upload-field-hint">{hint}</span>}
          {extra}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            hidden
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

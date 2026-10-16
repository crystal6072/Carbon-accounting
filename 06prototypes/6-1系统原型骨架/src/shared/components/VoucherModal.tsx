import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import Modal from './Modal'
import Table from './Table'
import type { Column } from './Table'
import { useToast } from './Toast'
import type { PcfVoucher } from '@/types'
import './VoucherModal.css'

let voucherSeed = 0
const nextVoucherId = () => `VC-${Date.now().toString(36)}-${voucherSeed++}`

/** 文件大小展示：B / KB / MB */
function formatSize(size: number): string {
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

interface VoucherModalProps {
  open: boolean
  /** 数据项名称（标题后缀展示，便于确认归属） */
  subject?: string
  value: PcfVoucher[]
  readOnly?: boolean
  onClose: () => void
  onConfirm: (vouchers: PcfVoucher[]) => void
}

/**
 * 数据凭证弹窗（步骤② 数据列表「操作」列入口）：
 * 支持上传 **多个凭证附件**，**非必填**；原型以 data URL 本地存储，可在弹窗内预览 / 移除。
 * 项目「产品建模」与模型「产品建模」共用。
 */
export default function VoucherModal({
  open,
  subject = '',
  value,
  readOnly = false,
  onClose,
  onConfirm,
}: VoucherModalProps) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<PcfVoucher[]>(value)

  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const handlePick = async (files: File[]) => {
    if (files.length === 0) return
    const stamp = nowStamp()
    const added = await Promise.all(
      files.map(async (file) => ({
        id: nextVoucherId(),
        name: file.name,
        size: file.size,
        url: await readFile(file),
        uploadedAt: stamp,
      })),
    )
    setDraft((prev) => [...prev, ...added])
    toast(`已添加 ${added.length} 个凭证附件`)
  }

  const columns: Column<PcfVoucher>[] = [
    {
      key: 'name',
      title: '文件名称',
      width: 300,
      render: (row) =>
        row.url ? (
          <a className="link" href={row.url} target="_blank" rel="noreferrer" download={row.name}>
            {row.name}
          </a>
        ) : (
          <span>{row.name}</span>
        ),
    },
    { key: 'size', title: '大小', width: 100, render: (row) => formatSize(row.size) },
    { key: 'uploadedAt', title: '上传时间', width: 160, render: (row) => <span className="nowrap">{row.uploadedAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 90,
      render: (row) =>
        readOnly ? (
          <span>-</span>
        ) : (
          <button
            type="button"
            className="link link-danger"
            onClick={() => setDraft((prev) => prev.filter((item) => item.id !== row.id))}
          >
            移除
          </button>
        ),
    },
  ]

  return (
    <Modal
      open={open}
      title={subject ? `数据凭证 · ${subject}` : '数据凭证'}
      size="lg"
      onClose={onClose}
      footer={
        readOnly ? (
          <Button onClick={onClose}>关闭</Button>
        ) : (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              onClick={() => {
                onConfirm(draft)
                onClose()
              }}
            >
              保存
            </Button>
          </>
        )
      }
    >
      {!readOnly && (
        <div className="voucher-toolbar">
          <Button size="small" onClick={() => fileRef.current?.click()}>
            上传凭证附件
          </Button>
          <span className="toolbar-tip">非必填，可上传多个文件；原型仅本地保存与预览，不落真实文件服务</span>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void handlePick(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>
      )}
      <div className="voucher-table">
        <Table columns={columns} data={draft} rowKey={(row) => row.id} emptyText="暂未上传数据凭证" />
      </div>
    </Modal>
  )
}

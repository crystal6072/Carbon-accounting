import { useRef, useState } from 'react'
import { Button, Modal, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import { buildFactorImportTemplate, importLibraryFactors, validateFactorImportText } from '@/mock'
import type { FactorImportPreview, FactorImportRowError, LibraryFactorPayload } from '@/mock'
import './FactorPage.css'

interface LibraryImportModalProps {
  open: boolean
  libraryId: string
  versionId: string
  /** 商业数据库整库导入 / 自建库批量导入 */
  title?: string
  onClose: () => void
  onImported: (success: number, failed: number) => void
}

const errorColumns: Column<FactorImportRowError>[] = [
  { key: 'row', title: '行号', width: 70, render: (row) => `第 ${row.row} 行` },
  { key: 'name', title: '因子名称', width: 160, render: (row) => row.name || '（空）' },
  { key: 'reason', title: '失败原因' },
]

/**
 * 库内因子批量导入（商业数据库=整库导入 / 自建库=批量导入）：
 * 下载 CSV 模板 → 上传解析校验 → 确认导入至指定库版本。
 */
export default function LibraryImportModal({
  open,
  libraryId,
  versionId,
  title = '库内因子导入',
  onClose,
  onImported,
}: LibraryImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<FactorImportPreview | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setFileName('')
    setPreview(null)
    setError('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const handleFile = async (file: File) => {
    setError('')
    setPreview(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      setPreview(validateFactorImportText(text))
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件解析失败')
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([buildFactorImportTemplate()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '因子库导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!preview) return
    setSubmitting(true)
    try {
      const payloads: LibraryFactorPayload[] = preview.valid.map((item) => ({ ...item }))
      const result = await importLibraryFactors(libraryId, versionId, payloads)
      onImported(result.success, result.failed.length)
      close()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      size="lg"
      onClose={close}
      footer={
        <>
          <Button onClick={close}>取消</Button>
          <Button variant="primary" disabled={!preview || preview.valid.length === 0 || submitting} onClick={handleImport}>
            {submitting ? '导入中…' : `确认导入（${preview?.valid.length ?? 0}）`}
          </Button>
        </>
      }
    >
      <div className="view-block">
        <div className="view-block-title flex-between">
          <span>第 1 步：下载模板并填写</span>
          <Button size="small" onClick={downloadTemplate}>
            下载 CSV 模板
          </Button>
        </div>
        <ol className="factor-import-steps">
          <li>按模板列填写因子，必填列以「*」标记；</li>
          <li>保存为 CSV 后上传（原型仅支持 CSV 解析）；</li>
          <li>系统校验通过后，整库 / 批量写入当前库版本。</li>
        </ol>
      </div>

      <div className="view-block">
        <div className="view-block-title">第 2 步：上传文件</div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
        <Button onClick={() => fileRef.current?.click()}>选择文件</Button>
        {fileName && <span className="toolbar-tip" style={{ marginLeft: 8 }}>{fileName}</span>}
        {error && <div className="factor-import-error">{error}</div>}
      </div>

      {preview && (
        <div className="view-block">
          <div className="view-block-title flex-between">
            <span>第 3 步：校验结果</span>
            <span className="toolbar-tip">
              数据行 {preview.total} 条 · 可导入 {preview.valid.length} 条 · 失败 {preview.errors.length} 条
            </span>
          </div>
          {preview.errors.length > 0 ? (
            <div className="factor-modal-table">
              <Table columns={errorColumns} data={preview.errors} rowKey={(row) => String(row.row)} />
            </div>
          ) : (
            <div className="empty">校验全部通过，可执行导入</div>
          )}
        </div>
      )}
    </Modal>
  )
}

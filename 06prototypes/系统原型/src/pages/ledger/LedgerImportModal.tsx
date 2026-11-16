import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { exportWorkbook } from '@/shared/utils/excel'
import { parseCsvText } from '@/shared/utils/csv'

interface ImportRowResult {
  row: number
  cells: string[]
  payload: unknown
  error?: string
}

interface LedgerImportModalProps {
  open: boolean
  title: string
  /** 模板文件下载名（不含扩展名也行，自动补 .xlsx） */
  templateName: string
  /** 导入模板表头，顺序即 Excel 列顺序 */
  headers: string[]
  /** 将一行单元格转为载荷并校验；rowIndex 从 1 开始（不含表头） */
  buildRow: (cells: string[], rowIndex: number) => { payload: unknown; error?: string }
  /** 确认导入：仅传入校验通过的载荷 */
  onImport: (payloads: unknown[]) => Promise<void>
  onClose: () => void
}

/**
 * 通用台账 Excel / CSV 导入弹窗：模板下载 → 选文件 → 解析预览（逐行校验）→ 确认导入。
 * 支持 .xlsx / .xls（SheetJS）/ .csv（自研解析）；表头行忽略；异常行不导入。
 */
export default function LedgerImportModal({
  open,
  title,
  templateName,
  headers,
  buildRow,
  onImport,
  onClose,
}: LedgerImportModalProps) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRowResult[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)

  /** 每次打开重置状态 */
  useEffect(() => {
    if (open) {
      setFileName('')
      setRows([])
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [open])

  const validPayloads = rows.filter((r) => !r.error).map((r) => r.payload)
  const invalidCount = rows.length - validPayloads.length

  const handleDownloadTemplate = async () => {
    await exportWorkbook(templateName, [
      { name: '导入模板', columns: headers.map((h) => ({ title: h })), rows: [] },
    ])
  }

  const handleFile = async (file: File) => {
    setParsing(true)
    try {
      let matrix: string[][]
      if (file.name.toLowerCase().endsWith('.csv')) {
        matrix = parseCsvText(await file.text())
      } else {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as string[][]
      }
      const dataRows = matrix
        .slice(1)
        .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
      const results: ImportRowResult[] = dataRows.map((cells, idx) => ({
        row: idx + 1,
        cells,
        ...buildRow(cells, idx + 1),
      }))
      setRows(results)
      const validCount = results.filter((r) => !r.error).length
      const invalid = results.length - validCount
      if (results.length === 0) toast('未解析到数据行，请检查文件内容', 'error')
      else if (invalid > 0)
        toast(`解析完成：有效 ${validCount} 条，异常 ${invalid} 条，请修正后重新选择文件`, 'error')
      else toast(`解析完成：共 ${results.length} 条有效记录`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '文件解析失败', 'error')
    } finally {
      setParsing(false)
    }
  }

  const handleConfirm = async () => {
    if (validPayloads.length === 0) return
    setImporting(true)
    try {
      await onImport(validPayloads)
      toast(`导入成功，共 ${validPayloads.length} 条`)
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'error')
    } finally {
      setImporting(false)
    }
  }

  const previewColumns: Column<ImportRowResult>[] = [
    { key: 'row', title: '行号', width: 60, render: (r) => r.row },
    ...headers.map((h) => ({
      key: h,
      title: h,
      render: (r: ImportRowResult) => {
        const idx = headers.indexOf(h)
        return (
          <span className="cell-ellipsis" title={String(r.cells[idx] ?? '')}>
            {String(r.cells[idx] ?? '')}
          </span>
        )
      },
    })),
    {
      key: 'result',
      title: '校验结果',
      width: 220,
      render: (r) =>
        r.error ? (
          <Tag tone="error">{r.error}</Tag>
        ) : (
          <Tag tone="success">通过</Tag>
        ),
    },
  ]

  return (
    <Modal
      open={open}
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            disabled={validPayloads.length === 0 || importing || parsing}
            onClick={handleConfirm}
          >
            {importing ? '导入中…' : `确认导入（${validPayloads.length} 条）`}
          </Button>
        </>
      }
    >
      <div className="import-tip">
        1. 请先 <button className="link" onClick={handleDownloadTemplate}>下载导入模板</button>，按列顺序填写；
        2. 支持 .xlsx / .xls / .csv；首行表头会被忽略；异常行不会导入。
      </div>

      <div className="file-upload" style={{ margin: '12px 0' }}>
        <label className="btn btn-sm">
          选择文件
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                setFileName(f.name)
                void handleFile(f)
              }
            }}
          />
        </label>
        {fileName && <span className="file-name">{fileName}</span>}
      </div>

      {parsing && <div className="empty">解析中…</div>}

      {rows.length > 0 && (
        <div className="import-result">
          <div className="import-summary">
            共解析 <b>{rows.length}</b> 行 · 有效 <b>{validPayloads.length}</b> · 异常{' '}
            <b style={{ color: invalidCount ? '#d54941' : undefined }}>{invalidCount}</b>
          </div>
          <div className="material-table-wrap" style={{ maxHeight: 320, overflow: 'auto' }}>
            <Table columns={previewColumns} data={rows} rowKey={(r) => String(r.row)} loading={parsing} />
          </div>
        </div>
      )}
    </Modal>
  )
}

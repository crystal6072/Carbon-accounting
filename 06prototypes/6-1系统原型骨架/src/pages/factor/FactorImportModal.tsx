import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  FACTOR_IMPORT_COLUMNS,
  FACTOR_IMPORT_ROW_LIMIT,
  buildFactorImportTemplate,
  importFactors,
  validateFactorImportText,
} from '@/mock'
import type { FactorBatchFailure, FactorBatchResult, FactorImportPreview, FactorImportRowError } from '@/mock'
import { downloadCsv } from '@/shared/utils/csv'
import type { FactorScope } from './factorMeta'

/** 导入步骤：选择文件 → 校验预览 → 导入结果 */
type ImportStep = 'select' | 'preview' | 'result'

interface FactorImportModalProps {
  open: boolean
  /** backend = 后台「排放因子库」导入为 environment 库因子；frontend = 前台「我的因子库」导入为组织自建因子 */
  scope: FactorScope
  onClose: () => void
  /** 导入完成回调：由列表页统一负责刷新与结果展示 */
  onImported: (result: FactorBatchResult) => void
}

const FILE_ACCEPT = '.csv,.txt'

export default function FactorImportModal({ open, scope, onClose, onImported }: FactorImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<ImportStep>('select')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<FactorImportPreview | null>(null)
  const [result, setResult] = useState<FactorBatchResult | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isFrontend = scope === 'frontend'
  const title = isFrontend ? '导入因子（我的因子库）' : '导入因子（排放因子库）'

  useEffect(() => {
    if (!open) return
    setStep('select')
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    setChecking(false)
    setSubmitting(false)
  }, [open])

  const handleDownloadTemplate = () => {
    downloadCsv(
      isFrontend ? '排放因子导入模板（我的因子库）.csv' : '排放因子导入模板（排放因子库）.csv',
      buildFactorImportTemplate(),
    )
  }

  const handleFileChange = async (picked: File | undefined) => {
    if (!picked) return
    setFile(picked)
    setError('')
    setChecking(true)
    try {
      const text = await picked.text()
      setPreview(validateFactorImportText(text))
      setStep('preview')
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : '文件解析失败，请按模板填写后重新上传')
    } finally {
      setChecking(false)
    }
  }

  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) return
    setSubmitting(true)
    try {
      const data = await importFactors(preview.valid, isFrontend ? 'custom' : 'preset')
      setResult(data)
      setStep('result')
      onImported(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setSubmitting(false)
    }
  }

  const errorColumns: Column<FactorImportRowError>[] = [
    { key: 'row', title: '行号', width: 72, render: (row) => <span className="mono">第 {row.row} 行</span> },
    { key: 'name', title: '因子名称', width: 180, render: (row) => row.name },
    { key: 'reason', title: '校验结果', render: (row) => row.reason },
  ]

  const failureColumns: Column<FactorBatchFailure>[] = [
    { key: 'code', title: '因子编码', width: 100, render: (row) => <span className="mono">{row.code}</span> },
    { key: 'name', title: '因子名称', width: 180 },
    { key: 'reason', title: '失败原因', render: (row) => row.reason },
  ]

  const columnColumns: Column<(typeof FACTOR_IMPORT_COLUMNS)[number]>[] = [
    { key: 'label', title: '列名', width: 170, render: (row) => row.label },
    {
      key: 'required',
      title: '必填',
      width: 70,
      render: (row) => (row.required ? <span className="factor-import-required">必填</span> : '选填'),
    },
    { key: 'hint', title: '说明', render: (row) => row.hint },
  ]

  const uploadArea = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={FILE_ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          void handleFileChange(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {file ? (
        <div className="factor-upload factor-upload-filled">
          <span className="mono">{file.name}</span>
          <span className="row-actions">
            <button className="link" type="button" onClick={() => fileRef.current?.click()}>
              重新选择
            </button>
            <button
              className="link link-danger"
              type="button"
              onClick={() => {
                setFile(null)
                setPreview(null)
                setError('')
              }}
            >
              移除
            </button>
          </span>
        </div>
      ) : (
        <button type="button" className="factor-upload" onClick={() => fileRef.current?.click()}>
          <span className="factor-upload-plus">+</span>
          <span>点击选择按模板填写的文件（{FILE_ACCEPT}）</span>
        </button>
      )}
    </>
  )

  return (
    <Modal
      open={open}
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        step === 'select' ? (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button variant="primary" disabled={!file || checking} onClick={() => setStep('preview')}>
              {checking ? '校验中…' : '下一步：校验数据'}
            </Button>
          </>
        ) : step === 'preview' ? (
          <>
            <Button onClick={() => setStep('select')}>上一步</Button>
            <Button
              variant="primary"
              disabled={!preview || preview.valid.length === 0 || submitting}
              onClick={handleImport}
            >
              {submitting ? '导入中…' : `确认导入（${preview?.valid.length ?? 0}）`}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose}>
            完成
          </Button>
        )
      }
    >
      {step === 'select' && (
        <>
          <div className="view-block">
            <div className="view-block-title">导入流程</div>
            <ol className="factor-import-steps">
              <li>下载导入模板，按模板列顺序填写因子数据</li>
              <li>上传填写完成的模板，系统自动校验</li>
              <li>确认校验结果后导入，导入失败的条目可下载修正后重传</li>
            </ol>
          </div>

          <div className="view-block">
            <div className="view-block-title">1 · 下载导入模板</div>
            <Button onClick={handleDownloadTemplate}>下载导入模板</Button>
            <div className="factor-section-tip" style={{ borderTop: 'none', paddingLeft: 0, paddingRight: 0 }}>
              模板为 CSV（Excel 可直接打开）；**请勿修改列顺序与表头名称**，`*` 为必填列。
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">2 · 上传填写完成的模板</div>
            {uploadArea}
            <div className="factor-section-tip" style={{ borderTop: 'none', paddingLeft: 0, paddingRight: 0 }}>
              支持 {FILE_ACCEPT}（Excel 请「另存为 CSV」后上传）；单次最多 {FACTOR_IMPORT_ROW_LIMIT} 行。
              {isFrontend ? '导入的因子归属「组织自建」，可编辑。' : '导入的因子归属 environment 库（系统预置）。'}
            </div>
            {error && <div className="factor-import-error">{error}</div>}
          </div>

          <div className="view-block">
            <div className="view-block-title">填写说明</div>
            <div className="factor-modal-table">
              <Table columns={columnColumns} data={FACTOR_IMPORT_COLUMNS} rowKey={(row) => row.key} />
            </div>
          </div>
        </>
      )}

      {step === 'preview' && preview && (
        <>
          <div className="view-block">
            <div className="view-block-title">校验结果</div>
            <div className="factor-batch-summary">
              <span>
                文件共 <strong>{preview.total}</strong> 行
              </span>
              <span>
                校验通过 <strong>{preview.valid.length}</strong> 条
              </span>
              <span>
                校验不通过 <strong>{preview.errors.length}</strong> 条
              </span>
            </div>
          </div>
          {preview.errors.length > 0 && (
            <div className="view-block">
              <div className="view-block-title">不通过清单</div>
              <div className="factor-modal-table">
                <Table columns={errorColumns} data={preview.errors} rowKey={(row) => `${row.row}-${row.name}`} />
              </div>
            </div>
          )}
          {preview.valid.length === 0 && (
            <div className="factor-section-body factor-section-tip" style={{ paddingLeft: 0, paddingRight: 0 }}>
              无校验通过的因子，请按不通过清单修正后重新上传。
            </div>
          )}
        </>
      )}

      {step === 'result' && result && (
        <>
          <div className="view-block">
            <div className="view-block-title">导入结果</div>
            <div className="factor-batch-summary">
              <span>
                成功 <strong>{result.success}</strong> 条
              </span>
              <span>
                失败 <strong>{result.failed.length}</strong> 条
              </span>
            </div>
          </div>
          {result.failed.length > 0 && (
            <div className="view-block">
              <div className="view-block-title">失败清单</div>
              <div className="factor-modal-table">
                <Table columns={failureColumns} data={result.failed} rowKey={(row) => row.id} />
              </div>
            </div>
          )}
          <div className="factor-section-body factor-section-tip" style={{ paddingLeft: 0, paddingRight: 0 }}>
            导入因子默认**启用**，因子编码由系统生成；{isFrontend ? '归属「组织自建」，可编辑。' : '归属 environment 库（系统预置）。'}
          </div>
        </>
      )}
    </Modal>
  )
}

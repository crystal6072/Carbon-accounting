import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, MultiSelect, Textarea } from '@/shared/components'
import type { CarbonRecord } from '@/types/dataset'
import type { DataReport } from '@/types/dataReport'
import { createReportFromRecord, currentEnterpriseProfile } from '@/mock/dataReport'
import RegionCascader from './RegionCascader'
import { BOUNDARY_TEXT, PROCESS_LIBRARY_OPTIONS, emissionUnitText, numText, periodText } from './datasetMeta'
import './DataReport.css'

/**
 * 企业数据上报 · 一键上报表单。
 *
 * 所属区域默认取「租户信息」中当前企业的所在地区（省 / 市 / 区），企业可修改，
 * 修改只影响本次上报单、不回写租户档案；已有上报单沿用企业上次填写的值。
 * 工艺类型优先取自核算记录；核算记录未填写时，企业必须在本环节补充后才能提交。
 */

interface ReportSubmitModalProps {
  open: boolean
  /** 来源核算记录 */
  record: CarbonRecord | null
  /** 已有草稿 / 已驳回 / 已入库上报单：带出企业已填写内容 */
  initial?: DataReport | null
  onClose: () => void
  onSaved: (report: DataReport, action: 'draft' | 'submit') => void
  onError: (message: string) => void
}

export default function ReportSubmitModal({ open, record, initial, onClose, onSaved, onError }: ReportSubmitModalProps) {
  /** 打开表单时读取一次租户信息，档案变更后重新打开即生效 */
  const enterprise = useMemo(() => currentEnterpriseProfile(), [open])
  const [regionName, setRegionName] = useState(enterprise.regionName)
  const [qualityNote, setQualityNote] = useState('')
  const [processes, setProcesses] = useState<string[]>([])
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null)
  const [touched, setTouched] = useState(false)

  /** 核算记录中的工艺（上报时的唯一默认来源） */
  const recordProcessNames = useMemo(() => record?.processes.map((p) => p.name) ?? [], [record])
  const needSupplement = recordProcessNames.length === 0

  useEffect(() => {
    if (!open) return
    // 所属区域：新建上报取租户信息中的省 / 市 / 区；已有上报单沿用企业上次填写值
    setRegionName(initial?.regionName || enterprise.regionName)
    setQualityNote(initial?.dataQualityNote ?? '')
    // 工艺以核算记录为准；记录没有时才用上报单中已补充的值
    setProcesses(recordProcessNames.length > 0 ? recordProcessNames : initial?.processes ?? [])
    setSaving(null)
    setTouched(false)
  }, [
    open,
    enterprise.regionName,
    initial?.id,
    initial?.regionName,
    initial?.dataQualityNote,
    initial?.processes,
    record?.id,
    recordProcessNames,
  ])

  const stageRows = useMemo(() => record?.stageValues ?? [], [record])
  const regionSegments = useMemo(() => regionName.split(/\s*\/\s*/).filter(Boolean), [regionName])
  const regionError = touched && regionSegments.length < 3 ? '请选择到区县（省 / 市 / 区）' : undefined
  const processError =
    touched && needSupplement && processes.length === 0 ? '核算记录未填写工艺，请补充至少 1 项' : undefined
  const regionModified = regionName !== enterprise.regionName

  const handleSave = async (submit: boolean) => {
    setTouched(true)
    if (!record) return
    if (submit && regionSegments.length < 3) {
      onError('请选择到区县（省 / 市 / 区）')
      return
    }
    if (submit && needSupplement && processes.length === 0) {
      onError('核算记录未填写工艺类型，请补充后再提交')
      return
    }
    setSaving(submit ? 'submit' : 'draft')
    try {
      const saved = await createReportFromRecord({
        recordId: record.id,
        regionName,
        dataQualityNote: qualityNote.trim(),
        processes,
        submit,
      })
      onSaved(saved, submit ? 'submit' : 'draft')
    } catch (error) {
      onError(error instanceof Error ? error.message : '上报失败')
    } finally {
      setSaving(null)
    }
  }

  const standardText = record
    ? [record.standardNo, record.standardName].filter(Boolean).join(' ') || '—'
    : '—'

  return (
    <Modal
      open={open}
      size="lg"
      title="一键上报核算结果"
      onClose={onClose}
      className="dr-submit-modal"
      bodyClassName="dr-submit-modal-body"
      footerClassName="dr-submit-footer"
      footer={
        <>
          <Button onClick={onClose} disabled={!!saving}>
            取消
          </Button>
          <Button
            data-ann-target="dataset.report.submit.actions"
            onClick={() => void handleSave(false)}
            disabled={!!saving}
          >
            {saving === 'draft' ? '保存中…' : '暂存草稿'}
          </Button>
          <Button
            variant="primary"
            data-ann-target="dataset.report.submit.actions"
            onClick={() => void handleSave(true)}
            disabled={!!saving}
          >
            {saving === 'submit' ? '提交中…' : '提交审核'}
          </Button>
        </>
      }
    >
      <div className="dr-form dr-submit-form">
        {/* 本次上报结果 */}
        <section className="dr-summary-card dr-submit-summary" data-ann-target="dataset.report.submit.summary">
          <div className="dr-submit-summary-main">
            <span className="dr-submit-eyebrow">本次上报结果</span>
            <div className="dr-summary-name">
              {record?.productName ?? '—'}
              {record?.productCode && <span className="dr-summary-code">{record.productCode}</span>}
            </div>
            <div className="dr-summary-meta">
              {record ? `${BOUNDARY_TEXT[record.boundary]} · ${periodText(record)}` : '—'}
            </div>
          </div>
          <div className="dr-submit-total">
            <div className="dr-submit-total-value">
              <b>{record ? numText(record.totalEmission) : '—'}</b>
              <span>
                {emissionUnitText(record?.emissionUnit)} / {record?.unitCode ?? '单位'}
              </span>
            </div>
          </div>
        </section>

        {/* 上报信息 */}
        <section className="dr-form-block dr-submit-block" data-ann-target="dataset.report.submit.info">
          <header className="dr-submit-block-head">
            <span className="dr-submit-step">1</span>
            <div className="dr-submit-block-title">
              <h3>上报信息</h3>
            </div>
          </header>

          <div className={`dr-submit-region${regionError ? ' is-invalid' : ''}`}>
            <div className="dr-submit-region-head">
              <span className="dr-submit-field-label">
                <b className="dr-submit-required">*</b>所属区域
              </span>
            </div>
            <div className="dr-submit-region-control">
              <RegionCascader value={regionName} invalid={!!regionError} onChange={setRegionName} />
              {regionModified && (
                <button
                  type="button"
                  className="link dr-submit-reset"
                  onClick={() => setRegionName(enterprise.regionName)}
                >
                  恢复企业地址
                </button>
              )}
            </div>
            {regionError && <span className="form-error">{regionError}</span>}
          </div>

          {needSupplement && (
            <div className={`dr-submit-field dr-submit-alert${processError ? ' is-invalid' : ''}`}>
              <div className="dr-submit-field-head">
                <span className="dr-submit-field-label">
                  <b className="dr-submit-required">*</b>工艺类型
                </span>
                <span className="dr-submit-optional">待补充</span>
              </div>
              <MultiSelect
                value={processes}
                options={PROCESS_LIBRARY_OPTIONS}
                placeholder="请选择本次核算涉及的工艺"
                onChange={setProcesses}
              />
              {processError && <span className="form-error">{processError}</span>}
            </div>
          )}

          <div className="dr-submit-field">
            <div className="dr-submit-field-head">
              <span className="dr-submit-field-label">数据质量说明</span>
              <span className="dr-submit-optional">选填</span>
            </div>
            <Textarea
              rows={3}
              maxLength={200}
              value={qualityNote}
              placeholder="可说明计量方式、数据来源与分摊口径"
              onChange={(e) => setQualityNote(e.target.value)}
            />
            <div className="dr-submit-field-foot">
              <span className={qualityNote.length >= 180 ? 'dr-submit-count-near' : undefined}>
                {qualityNote.length}/200
              </span>
            </div>
          </div>
        </section>

        {/* 本次核算信息：来自核算记录，只读展示 */}
        <section className="dr-form-block dr-submit-block" data-ann-target="dataset.report.submit.record">
          <header className="dr-submit-block-head">
            <span className="dr-submit-step">2</span>
            <div className="dr-submit-block-title">
              <h3>本次核算信息</h3>
            </div>
          </header>
          <div className="dr-static-grid dr-submit-static-grid">
            <StaticField label="产品类别" value={record?.categoryPath || record?.categoryName || '—'} />
            <StaticField label="所属行业" value={record?.industryPath || record?.industryName || '—'} />
            <StaticField label="工艺类型" value={processes.join('、') || '—'} />
            <StaticField label="核算标准" value={standardText} />
            <StaticField label="系统边界" value={record ? BOUNDARY_TEXT[record.boundary] : '—'} />
            <StaticField label="统计时间" value={record ? periodText(record) : '—'} />
          </div>

          {stageRows.length > 0 && (
            <div className="dr-submit-stage">
              <table className="data-table dr-stage-table">
                <thead>
                  <tr>
                    <th>生命周期阶段</th>
                    <th style={{ textAlign: 'right' }}>碳排放量（{emissionUnitText(record?.emissionUnit)}）</th>
                    <th style={{ textAlign: 'right' }}>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {stageRows.map((stage) => (
                    <tr key={stage.stageCode} className={stage.stageLevel === 2 ? 'dr-stage-child' : undefined}>
                      <td>
                        {stage.stageLevel === 2 && <span className="dr-stage-indent">└ </span>}
                        {stage.stageName}
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">
                        {numText(stage.stageEmission)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{stage.stageShare}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}

function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="dr-static-field">
      <span className="dr-static-label">{label}</span>
      <span className="dr-static-value" title={value}>
        {value}
      </span>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Button, Modal, Textarea, useToast } from '@/shared/components'
import type { DataReport } from '@/types/dataReport'
import { approveReport, rejectReport } from '@/mock/dataReport'
import DrawerShell from './DrawerShell'
import { numFmt, reportPeriodText, reportStatusText } from './dataReportMeta'
import { BOUNDARY_TEXT, emissionUnitText } from './datasetMeta'
import './DatasetPage.css'
import './DataReport.css'

/**
 * 数据审核工作台（只读核对）。
 *
 * 平台不做自动异常判定、不提供标准化编辑：审核员只读核对企业上报内容，
 * 仅能「通过并入库」（按上报原值脱敏入库）或「驳回退回企业」。
 */

interface AuditWorkbenchDrawerProps {
  report: DataReport | null
  onClose: () => void
  /** 审核完成（通过 / 驳回）后刷新列表 */
  onDone: (message: string) => void
}

export default function AuditWorkbenchDrawer({ report, onClose, onDone }: AuditWorkbenchDrawerProps) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    setRejectOpen(false)
    setRejectReason('')
  }, [report?.id])

  if (!report) return null

  /** 已入库 / 已驳回：只读查看，不再提供审核动作 */
  const readOnly = report.status === 'archived' || report.status === 'rejected'
  const updatedMode = !!report.originReportId

  const handleApprove = async () => {
    setBusy(true)
    try {
      const result = await approveReport(report.id)
      onDone(
        result.updated
          ? `审核通过：已更新原入库记录 ${result.recordId}；到「公共数据库」发布新版本后企业端可见`
          : `审核通过：已入库 ${result.recordId}；到「公共数据库」发布新版本后企业端可见`,
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : '入库失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast('驳回必须填写原因', 'error')
      return
    }
    setBusy(true)
    try {
      await rejectReport(report.id, rejectReason.trim())
      setRejectOpen(false)
      onDone('已驳回并退回企业，企业可按原因修改后重新上报')
    } catch (error) {
      toast(error instanceof Error ? error.message : '驳回失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DrawerShell
        open={!!report}
        width={720}
        title={
          <span className="ds-detail-title">
            {report.productName}
            <span className="dr-muted">{reportStatusText(report, 'platform')}</span>
          </span>
        }
        subtitle={`${report.reportNo} · ${report.sourceRecordNo} · 第 ${report.resultVersion} 次核算`}
        onClose={onClose}
        footer={
          <div className="dr-audit-footer">
            {!readOnly && (
              <div className="flex gap-sm">
                <Button onClick={onClose} disabled={busy}>
                  取消
                </Button>
                <Button onClick={() => setRejectOpen(true)} disabled={busy}>
                  驳回
                </Button>
                <Button variant="primary" onClick={() => void handleApprove()} disabled={busy}>
                  {busy ? '入库中…' : updatedMode ? '通过并更新原记录' : '通过并入库'}
                </Button>
              </div>
            )}
            {readOnly && <Button onClick={onClose}>关闭</Button>}
          </div>
        }
      >
        <div className="dr-review">
          <div className="dr-panel">
            <div className="dr-panel-head">
              <span className="dr-panel-title">企业上报数据</span>
            </div>
            <div className="dr-panel-body">
              <div className="dr-pair-grid">
                <ReadBox label="上报企业" value={report.orgName} />
                <ReadBox label="提交时间" value={report.submittedAt ?? '—'} />
                <ReadBox label="产品名称" value={report.productName} />
                <ReadBox label="产品类别" value={report.categoryPath || report.categoryName} />
                <ReadBox label="所属行业" value={report.industryPath || report.industryName} />
                <ReadBox label="系统边界" value={BOUNDARY_TEXT[report.boundary]} />
                <ReadBox label="统计期间" value={reportPeriodText(report)} />
                <ReadBox label="声明单位" value={`${report.unitValue} ${report.unitCode}`} />
                <ReadBox label="所属区域" value={report.regionName || '未填'} />
                <ReadBox label="数据质量说明" value={report.dataQualityNote || '未填写'} />
              </div>

              <div className="dr-field">
                <span className="dr-field-label">总碳排放量</span>
                <span className="dr-review-total-value">
                  {numFmt(report.totalEmission)} {emissionUnitText(report.emissionUnit)} / {report.unitCode}
                </span>
              </div>

              <div className="dr-field">
                <span className="dr-field-label">阶段结果</span>
                {report.stageValues.length === 0 ? (
                  <span className="dr-muted">未提供阶段结果</span>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>阶段</th>
                        <th style={{ textAlign: 'right' }}>排放值</th>
                        <th style={{ textAlign: 'right' }}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.stageValues.map((stage) => (
                        <tr
                          key={stage.stageCode}
                          className={stage.stageLevel === 2 ? 'dr-stage-child' : undefined}
                        >
                          <td>{stage.stageName}</td>
                          <td style={{ textAlign: 'right' }} className="mono">
                            {numFmt(stage.stageEmission)}
                          </td>
                          <td style={{ textAlign: 'right' }}>{stage.stageShare}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </DrawerShell>

      {/* 驳回：退回企业 */}
      <Modal
        open={rejectOpen}
        size="sm"
        title="驳回上报"
        onClose={() => setRejectOpen(false)}
        footer={
          <>
            <Button onClick={() => setRejectOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void handleReject()} disabled={busy}>
              {busy ? '提交中…' : '确认驳回'}
            </Button>
          </>
        }
      >
        <div className="ds-void-modal">
          <Textarea
            rows={4}
            value={rejectReason}
            placeholder="驳回原因（必填）"
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </>
  )
}

function ReadBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="dr-field">
      <span className="dr-field-label">{label}</span>
      <span className="dr-field-value" title={value}>
        {value}
      </span>
    </div>
  )
}

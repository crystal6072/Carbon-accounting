import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Dialog,
  Drawer,
  Input,
  MessagePlugin,
  Select,
  Space,
  Steps,
  Tag,
} from 'tdesign-react'
import type { EnterpriseRecord } from '@/types/enterprise'
import type { PcfFootprintReport, EnterpriseInfo, ReportCover } from '@/types/report'
import {
  applyEnterpriseFromLibrary,
  exportReport,
  fetchReportDetail,
  finalizeReport,
  regenerateReport,
  saveReportCover,
  saveReportEnterprise,
} from '@/mock/report'
import { fetchEnterprises } from '@/mock/enterprise'
import ReportPreview from './ReportPreview'
import './ReportPage.css'

/** 编辑态（编制中）分步向导：① 企业信息补充 ② 预览与生成报告 */
const STEP_TITLES = ['企业信息补充', '预览与生成报告']

export default function ReportDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  /** 查看模式（列表「查看」/ 只读角色进入，仅浏览不可编辑）；默认按报告状态判断 */
  const viewOnly = searchParams.get('mode') === 'view'

  const [report, setReport] = useState<PcfFootprintReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  // 编辑态分步（仅「编制中」生效）
  const [step, setStep] = useState(0)
  // 封面字段编辑态（继承上游，缺失可补录）
  const [draftCover, setDraftCover] = useState<ReportCover>({
    companyName: '',
    companyAddress: '',
    unifiedSocialCreditCode: '',
    legalPerson: '',
    contactPhone: '',
    issuer: '',
    reportDate: '',
    productName: '',
    productSpecModel: '',
    generatedLabel: '',
    statisticalPeriod: '',
    systemBoundary: '',
    lifecycleBoundary: '',
    reportUnit: '',
    standardBasis: '',
    reportWriteDate: '',
    reportNo: '',
    conclusion: '',
  })

  // 企业信息库（报告管理 · 企业信息维护）：编制中可引用记录自动带入企业字段
  const [enterprises, setEnterprises] = useState<EnterpriseRecord[]>([])
  const [pickEnterpriseId, setPickEnterpriseId] = useState<string | undefined>(undefined)
  const [applying, setApplying] = useState(false)

  const load = () => {
    setLoading(true)
    fetchReportDetail(id)
      .then((r) => {
        setReport(r)
        setDraftCover({ ...r.cover })
        setPickEnterpriseId(r.sourceEnterpriseId ?? undefined)
      })
      .catch((e) => MessagePlugin.error((e as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetchEnterprises()
      .then(setEnterprises)
      .catch(() => setEnterprises([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="report-wrap">
        <Card>加载中…</Card>
      </div>
    )
  }
  if (!report) {
    return (
      <div className="report-wrap">
        <Card>报告不存在或已被删除。</Card>
      </div>
    )
  }

  /** 编辑模式：未强制 viewOnly 且处于编制中 */
  const editable = !viewOnly && report.status === 'reportEditing'
  const isReady = report.status === 'reportReady' || report.status === 'reportStale'
  const isStale = report.status === 'reportStale'
  const cover = editable ? draftCover : report.cover

  const pickEnterprise = (c: ReportCover): EnterpriseInfo => ({
    companyName: c.companyName,
    companyAddress: c.companyAddress,
    unifiedSocialCreditCode: c.unifiedSocialCreditCode,
    legalPerson: c.legalPerson,
    contactPhone: c.contactPhone,
    issuer: c.issuer,
    reportDate: c.reportDate,
  })

  // 封面与概况信息由系统自动取值，无需手动填写；此处仅校验企业信息必填项
  const validateCover = (c: ReportCover): string[] => {
    const missing: string[] = []
    if (!c.companyName.trim()) missing.push('生产者名称')
    return missing
  }

  /** 下一步：校验并保存企业信息，通过后进入「预览与生成报告」 */
  const handleGoPreview = async () => {
    const missing = validateCover(draftCover)
    if (missing.length) {
      MessagePlugin.error(`请完善企业信息：${missing.join('、')}`)
      return
    }
    setSaving(true)
    try {
      await saveReportCover(report!.id, {
        productName: draftCover.productName,
        productSpecModel: draftCover.productSpecModel,
      })
      await saveReportEnterprise(report!.id, pickEnterprise(draftCover))
      const r = await fetchReportDetail(report!.id)
      setReport(r)
      setDraftCover({ ...r.cover })
      MessagePlugin.success('企业信息已保存')
      setStep(1)
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /** 引用企业信息库记录：自动带入企业字段到封面 / 基本信息表（表 1），仍可继续手动修改 */
  const handleApplyEnterprise = async () => {
    if (!pickEnterpriseId) return
    setApplying(true)
    try {
      const r = await applyEnterpriseFromLibrary(report!.id, pickEnterpriseId)
      setReport(r)
      setDraftCover({ ...r.cover })
      MessagePlugin.success('已引用企业信息库记录，字段可继续修改')
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setApplying(false)
    }
  }

  // 生成正式报告：报告日期自动取生成时间，此处不再做校验
  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      await saveReportCover(report!.id, {
        productName: draftCover.productName,
        productSpecModel: draftCover.productSpecModel,
      })
      await saveReportEnterprise(report!.id, pickEnterprise(draftCover))
      const r = await finalizeReport(report!.id)
      setReport(r)
      setDraftCover({ ...r.cover })
      setStep(0)
      MessagePlugin.success('报告已生成')
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setFinalizing(false)
    }
  }

  const handleRegen = async () => {
    if (report.sourceDeleted) {
      MessagePlugin.error('来源核算项目已删除，无法重新生成')
      return
    }
    setRegenerating(true)
    try {
      const r = await regenerateReport(report.id)
      setReport(r)
      setDraftCover({ ...r.cover })
      setStep(0)
      MessagePlugin.success('已重新生成，请确认封面信息后生成正式报告')
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setRegenerating(false)
      setConfirmRegen(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { fileName, blob } = await exportReport(report.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      MessagePlugin.success('报告已导出')
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setExporting(false)
    }
  }

  /* ============ 编辑态：分步向导 ============ */
  if (editable) {
    /** 步骤② 预览：合并草稿封面（企业信息）；报告日期由系统取生成当日，正文取自已装配快照（只读） */
    const now = new Date()
    const pad = (v: number) => String(v).padStart(2, '0')
    const generatedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const editPreview: PcfFootprintReport = { ...report, cover: { ...draftCover, reportDate: generatedDate } }

    return (
      <div className="report-wrap">
        <div className="rp-breadcrumb">
          <span>产品碳足迹</span>
          <span className="rp-sep">/</span>
          <span>报告管理</span>
          <span className="rp-sep">/</span>
          <span>报告编制</span>
          <span className="rp-sep">/</span>
          <span>{report.reportNo}</span>
        </div>

        <div className="rp-title-row">
          <div>
            <h2 className="rp-detail-title">
              {draftCover.companyName || '（待补录）'}
              {draftCover.generatedLabel}
            </h2>
            <p className="rp-detail-sub">
              报告编号：{report.reportNo}（系统内部标识，不在报告正文打印）
            </p>
          </div>
        </div>

        <Alert
          theme="info"
          style={{ marginBottom: 16 }}
          message="当前为「编制中」草稿：系统已自动继承上游字段，请先补充企业信息，再预览并生成正式报告。"
        />

        <div className="rp-steps-wrap">
          <Steps
            current={step}
            options={STEP_TITLES.map((title) => ({ title }))}
            onChange={(value) => {
              const target = Number(value)
              if (target <= step) setStep(target)
            }}
          />
        </div>

        {/* ============ 步骤① 企业信息补充 ============ */}
        {step === 0 && (
          <>
            {/* 企业信息卡：报告信息、封面概况均由系统自动取值，不在本页展示 */}
            <Card title="企业信息" className="rp-step-card" data-ann-target="rp.detail.enterprise">
              <Alert
                theme="info"
                style={{ marginBottom: 16 }}
                message="封面与概况信息由系统按核算数据自动取值生成，报告正文由模板自动装配，均无需手动填写；此处仅需补充企业信息。"
              />

              <div className="rp-cover-edit">
                <div className="rp-cover-edit-title">
                  填写企业信息（可编辑 / 可补录）
                  {report.sourceEnterpriseId ? (
                    <Tag size="small" variant="light" theme="primary" style={{ marginLeft: 8 }}>
                      来源：企业信息库
                    </Tag>
                  ) : (
                    <Tag size="small" variant="light" style={{ marginLeft: 8 }}>
                      未引用企业信息库
                    </Tag>
                  )}
                </div>
                <div className="rp-enterprise-ref">
                  <span className="rp-label">从企业信息库引用</span>
                  <Select
                    value={pickEnterpriseId}
                    onChange={(v) => setPickEnterpriseId(v as string)}
                    filterable
                    clearable
                    placeholder="选择企业信息库记录，自动带入下方字段"
                    style={{ width: 320 }}
                    options={enterprises.map((e) => ({ label: e.companyName, value: e.id }))}
                  />
                  <Button
                    theme="primary"
                    variant="outline"
                    loading={applying}
                    disabled={!pickEnterpriseId}
                    onClick={handleApplyEnterprise}
                  >
                    引用
                  </Button>
                  <span className="rp-enterprise-ref-tip">引用后覆盖下方企业字段；如需调整可直接修改，仅影响本报告</span>
                </div>
                <div className="rp-cover-grid">
                  <FormLike label="报告主体 / 生产者名称 *">
                    <Input
                      value={draftCover.companyName}
                      onChange={(v) => setDraftCover((c) => ({ ...c, companyName: v as string }))}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="企业地址">
                    <Input
                      value={draftCover.companyAddress}
                      onChange={(v) => setDraftCover((c) => ({ ...c, companyAddress: v as string }))}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="统一社会信用代码">
                    <Input
                      value={draftCover.unifiedSocialCreditCode}
                      onChange={(v) => setDraftCover((c) => ({ ...c, unifiedSocialCreditCode: v as string }))}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="法定代表人">
                    <Input
                      value={draftCover.legalPerson}
                      onChange={(v) => setDraftCover((c) => ({ ...c, legalPerson: v as string }))}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="联系方式">
                    <Input
                      value={draftCover.contactPhone}
                      onChange={(v) => setDraftCover((c) => ({ ...c, contactPhone: v as string }))}
                      placeholder="请输入"
                    />
                  </FormLike>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* ============ 步骤② 预览与生成报告 ============ */}
        {step === 1 && (
          <>
            <Alert
              theme="info"
              className="rp-step-card"
              message="以下为按当前封面信息装配的报告预览（只读）。确认无误后点击「生成正式报告」。"
            />
            <div className="rp-step-card rp-inline-preview" data-ann-target="rp.detail.preview">
              <ReportPreview report={editPreview} />
            </div>
          </>
        )}

        {/* 底部冻结操作栏：按数据质量评价页一致，固定右下 */}
        <div className="rp-action-bar">
          <Space>
            <Button variant="outline" onClick={() => navigate('/report/prepare')}>
              返回
            </Button>
            {step === 1 && (
              <Button variant="outline" onClick={() => setStep(0)}>
                上一步
              </Button>
            )}
            {step === 0 && (
              <Button theme="primary" loading={saving} onClick={handleGoPreview}>
                下一步：预览与生成
              </Button>
            )}
            {step === 1 && (
              <Button theme="primary" loading={finalizing} onClick={handleFinalize}>
                生成正式报告
              </Button>
            )}
          </Space>
        </div>
      </div>
    )
  }

  /* ============ 查看态（已生成 / 待更新 / 只读）：只读 + 直接查看报告 ============ */
  return (
    <div className="report-wrap">
      <div className="rp-breadcrumb">
        <span>产品碳足迹</span>
        <span className="rp-sep">/</span>
        <span>报告管理</span>
        <span className="rp-sep">/</span>
        <span>报告编制</span>
        <span className="rp-sep">/</span>
        <span>{report.reportNo}</span>
      </div>

      <div className="rp-title-row">
        <div>
          <h2 className="rp-detail-title">
            {cover.companyName || '（待补录）'}
            {cover.generatedLabel}
          </h2>
          <p className="rp-detail-sub">
            报告编号：{report.reportNo}（系统内部标识，不在报告正文打印）
            {isStale && <Tag theme="warning" variant="light" style={{ marginLeft: 8 }}>待更新</Tag>}
          </p>
        </div>
      </div>

      {isStale && (
        <Alert
          theme="warning"
          style={{ marginBottom: 16 }}
          data-ann-target="rp.detail.alert"
          message={`上游数据已更新（${report.staleReason}），报告结论可能失效。`}
          operation={
            <Button theme="primary" size="small" loading={regenerating} onClick={() => setConfirmRegen(true)}>
              重新生成
            </Button>
          }
        />
      )}

      {viewOnly && (
        <Alert theme="info" style={{ marginBottom: 16 }} message="当前为只读查看模式，仅可浏览与下载报告。" />
      )}

      {/* 企业信息卡（只读） */}
      <Card title="企业信息" className="rp-section-gap" data-ann-target="rp.detail.enterprise">
        <Alert
          theme="info"
          style={{ marginBottom: 16 }}
          message="封面与概况信息由系统自动取值生成、已锁定（如需修改请重新生成并进入编制态）；报告正文由模板自动装配，请点击「查看报告」浏览全篇。"
        />
        <div className="rp-cover-grid">
          <FormLike label="报告主体 / 生产者名称"><span className="rp-value">{cover.companyName || '（待补录）'}</span></FormLike>
          <FormLike label="企业地址"><span className="rp-value">{cover.companyAddress || '-'}</span></FormLike>
          <FormLike label="统一社会信用代码"><span className="rp-value">{cover.unifiedSocialCreditCode || '-'}</span></FormLike>
          <FormLike label="法定代表人"><span className="rp-value">{cover.legalPerson || '-'}</span></FormLike>
          <FormLike label="联系方式"><span className="rp-value">{cover.contactPhone || '-'}</span></FormLike>
        </div>
      </Card>

      {/* 底部冻结操作栏：按数据质量评价页一致，固定右下 */}
      <div className="rp-action-bar">
        <Space>
          <Button variant="outline" onClick={() => navigate('/report/prepare')}>
            返回
          </Button>
          <Button
            variant="outline"
            disabled={!isReady || report.sourceDeleted}
            loading={regenerating}
            onClick={() => setConfirmRegen(true)}
          >
            重新生成
          </Button>
          <Button variant="outline" disabled={!isReady} loading={exporting} onClick={handleExport}>
            下载报告
          </Button>
          <Button theme="primary" disabled={!isReady} onClick={() => setPreviewVisible(true)} data-ann-target="rp.detail.view">
            查看报告
          </Button>
        </Space>
      </div>

      <Drawer
        size="1120px"
        header={(report).fileName}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
      >
        <ReportPreview report={report} />
      </Drawer>

      <Dialog
        header="重新生成"
        visible={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={handleRegen}
        confirmBtn={{ content: '确认重新生成', theme: 'primary', loading: regenerating }}
        cancelBtn={{ content: '取消' }}
      >
        重新生成将覆盖当前报告并同步最新上游数据，生成后回到「编制中」状态。确认重新生成？
      </Dialog>
    </div>
  )
}

/** 轻量标签包装（避免引入额外 Form 组件） */
function FormLike({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className="rp-cover-item" style={full ? { gridColumn: '1 / 3' } : undefined}>
      <span className="rp-label">{label}</span>
      {children}
    </div>
  )
}

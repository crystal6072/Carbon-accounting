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
  Textarea,
} from 'tdesign-react'
import type { EnterpriseRecord } from '@/types/enterprise'
import type { PcfFootprintReport, EnterpriseInfo, ReportCover, ReportProductInfo } from '@/types/report'
import {
  applyEnterpriseFromLibrary,
  fetchReportDetail,
  finalizeReport,
  regenerateReport,
  saveReportProductInfo,
  saveReportEnterprise,
} from '@/mock/report'
import { fetchEnterprises } from '@/mock/enterprise'
import ReportPreview from './ReportPreview'
import { formatEmission } from './reportMeta'
import { downloadReportFile } from './reportDownload'
import './ReportPage.css'

/** 编辑态（编制中）分步向导：① 产品信息 + 企业信息 ② 预览与生成报告 */
const STEP_TITLES = ['产品与企业信息', '预览与生成报告']

/** 企业信息字段：名称硬阻断，其余为空时生成前给出软提示 */
const ENTERPRISE_FIELDS: Array<{ key: keyof ReportCover; label: string }> = [
  { key: 'companyName', label: '报告主体 / 生产者名称' },
  { key: 'unifiedSocialCreditCode', label: '统一社会信用代码' },
  { key: 'companyAddress', label: '企业地址' },
  { key: 'legalPerson', label: '法定代表人' },
  { key: 'contactPhone', label: '联系方式' },
]

export default function ReportDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  /** 查看模式（列表「查看」/ 只读角色进入，仅浏览不可编辑）；默认按报告状态判断 */
  const viewOnly = searchParams.get('mode') === 'view'

  const [report, setReport] = useState<PcfFootprintReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  // 编辑态分步（仅「编制中」生效）
  const [step, setStep] = useState(0)
  /** 是否有未保存的企业信息修改（离开确认） */
  const [dirty, setDirty] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  /** 生成正式报告二次确认（含字段缺失提示 + 锁定说明） */
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  /** 更新报告（已生成 / 待更新报告）：直接同步数据并进入编制态 */
  const [regenerating, setRegenerating] = useState(false)
  /** 引用企业信息库：覆盖已有内容时二次确认 */
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false)
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

  /** 产品信息编辑态：默认继承核算记录，部分字段可编辑（产品图片 / 工艺图片 / 计算规则） */
  const [draftProduct, setDraftProduct] = useState<ReportProductInfo>({
    productName: '',
    productModel: '',
    declaredUnit: '',
    manufacturer: '',
    origin: '',
    description: '',
    images: [],
    processDescription: '',
    processImages: [],
    systemBoundary: '',
    statisticalPeriod: '',
    lifecycleBoundary: '',
    cutOffRule: '',
    allocationRule: '',
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
        setDraftProduct({ ...r.productInfo, images: [...r.productInfo.images], processImages: [...r.productInfo.processImages] })
        setPickEnterpriseId(r.sourceEnterpriseId ?? undefined)
        setDirty(false)
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

  /** 编辑模式：未强制 viewOnly 且处于编制中（含系统生成占位态） */
  const editable = !viewOnly && (report.status === 'reportEditing' || report.status === 'reportGenerating')
  const isDraft = report.status === 'reportEditing' || report.status === 'reportGenerating'
  const isReady = report.status === 'reportReady' || report.status === 'reportStale'
  const isStale = report.status === 'reportStale'
  const cover = editable ? draftCover : report.cover
  const info = report.productInfo
  const calc = report.snapshot.calcResultSnapshot

  /** 引用记录是否仍在企业信息库中（已被删除时需引导重选） */
  const sourceEnterpriseMissing =
    !!report.sourceEnterpriseId && enterprises.length > 0 && !enterprises.some((e) => e.id === report.sourceEnterpriseId)

  const pickEnterprise = (c: ReportCover): EnterpriseInfo => ({
    companyName: c.companyName,
    companyAddress: c.companyAddress,
    unifiedSocialCreditCode: c.unifiedSocialCreditCode,
    legalPerson: c.legalPerson,
    contactPhone: c.contactPhone,
    issuer: c.issuer,
    reportDate: c.reportDate,
  })

  const patchCover = (patch: Partial<ReportCover>) => {
    setDraftCover((c) => ({ ...c, ...patch }))
    setDirty(true)
  }

  const patchProduct = (patch: Partial<ReportProductInfo>) => {
    setDraftProduct((p) => ({ ...p, ...patch }))
    setDirty(true)
  }

  /** 硬校验：报告主体必须填写；其余字段为空时在生成前提示 */
  const missingLabels = () =>
    ENTERPRISE_FIELDS.filter((f) => !String(draftCover[f.key] ?? '').trim()).map((f) => f.label)

  const handleLeave = () => {
    if (!dirty) {
      navigate('/report/prepare')
      return
    }
    setLeaveOpen(true)
  }

  /** 下一步：校验并保存企业信息，通过后进入「预览与生成报告」 */
  const handleGoPreview = async () => {
    if (!draftCover.companyName.trim()) {
      MessagePlugin.error('请完善企业信息：报告主体 / 生产者名称')
      return
    }
    setSaving(true)
    try {
      await saveReportProductInfo(report!.id, draftProduct)
      await saveReportEnterprise(report!.id, pickEnterprise(draftCover))
      const r = await fetchReportDetail(report!.id)
      setReport(r)
      setDraftCover({ ...r.cover })
      setDraftProduct({ ...r.productInfo, images: [...r.productInfo.images], processImages: [...r.productInfo.processImages] })
      setDirty(false)
      MessagePlugin.success('产品信息与企业信息已保存')
      setStep(1)
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /** 引用企业信息库记录：已有手填内容且与目标记录不同时二次确认，避免静默覆盖 */
  const handleApplyEnterprise = () => {
    if (!pickEnterpriseId) return
    const target = enterprises.find((e) => e.id === pickEnterpriseId)
    const hasManualInput = ENTERPRISE_FIELDS.some(
      (f) => String(draftCover[f.key] ?? '').trim() && String(draftCover[f.key] ?? '').trim() !== String(target?.[f.key as keyof EnterpriseRecord] ?? '').trim(),
    )
    if (hasManualInput) {
      setApplyConfirmOpen(true)
      return
    }
    void doApplyEnterprise()
  }

  const doApplyEnterprise = async () => {
    if (!pickEnterpriseId) return
    setApplying(true)
    try {
      const r = await applyEnterpriseFromLibrary(report!.id, pickEnterpriseId)
      setReport(r)
      setDraftCover({ ...r.cover })
      setDirty(false)
      MessagePlugin.success('已引用企业信息库记录，字段可继续修改')
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setApplying(false)
      setApplyConfirmOpen(false)
    }
  }

  // 生成正式报告：报告日期自动取生成时间，此处不再做校验
  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      await saveReportProductInfo(report!.id, draftProduct)
      await saveReportEnterprise(report!.id, pickEnterprise(draftCover))
      const r = await finalizeReport(report!.id)
      setReport(r)
      setDraftCover({ ...r.cover })
      setDraftProduct({ ...r.productInfo, images: [...r.productInfo.images], processImages: [...r.productInfo.processImages] })
      setDirty(false)
      setFinalizeOpen(false)
      setStep(0)
      MessagePlugin.success('报告已生成')
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setFinalizing(false)
    }
  }

  /** 已生成 / 待更新报告：重新装配并进入编制态（同时清除只读查看参数） */
  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const rebuilt = await regenerateReport(report.id)
      setReport(rebuilt)
      setDraftCover({ ...rebuilt.cover })
      setDraftProduct({
        ...rebuilt.productInfo,
        images: [...rebuilt.productInfo.images],
        processImages: [...rebuilt.productInfo.processImages],
      })
      setDirty(false)
      setStep(0)
      // 从「查看」进入时地址带 mode=view，需清除后才能切换为可编辑状态
      navigate(`/report/prepare/${rebuilt.id}`, { replace: true })
      MessagePlugin.success('已同步最新核算数据，请调整产品与企业信息后生成正式报告')
    } catch (e) {
      MessagePlugin.error((e as Error).message || '更新报告失败')
    } finally {
      setRegenerating(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadReportFile(report.id)
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
              <Tag theme="warning" variant="light" style={{ marginLeft: 8 }}>
                编制中
              </Tag>
            </p>
          </div>
        </div>

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

        {/* ============ 步骤① 产品信息 + 企业信息 ============ */}
        {step === 0 && (
          <>
            {/* 产品信息：默认继承核算记录；核算口径字段只读，其余字段报告内可编辑 */}
            <Card title="产品信息" className="rp-step-card" data-ann-target="rp.detail.summary">
              <div className="rp-cover-grid">
                <FormLike label="产品名称" readonly>
                  <span className="rp-value">{draftProduct.productName || '-'}</span>
                </FormLike>
                <FormLike label="产品型号">
                  <Input
                    value={draftProduct.productModel}
                    onChange={(v) => patchProduct({ productModel: v as string })}
                    placeholder="请输入产品型号"
                  />
                </FormLike>
                <FormLike label="声明 / 功能单位" readonly>
                  <span className="rp-value">{draftProduct.declaredUnit || '-'}</span>
                </FormLike>
                <FormLike label="产品生产厂家">
                  <Input
                    value={draftProduct.manufacturer}
                    onChange={(v) => patchProduct({ manufacturer: v as string })}
                    placeholder="请输入产品生产厂家"
                  />
                </FormLike>
                <FormLike label="产品产地">
                  <Input
                    value={draftProduct.origin}
                    onChange={(v) => patchProduct({ origin: v as string })}
                    placeholder="请输入产品产地"
                  />
                </FormLike>
                <FormLike label="来源核算项目">
                  <a className="rp-link" onClick={() => navigate(`/pcf/project/${report.sourceProjectId}`)}>
                    {report.sourceProjectName}
                  </a>
                </FormLike>
                <FormLike label="系统边界" readonly>
                  <span className="rp-value">{draftProduct.systemBoundary || '-'}</span>
                </FormLike>
                <FormLike label="统计时间" readonly>
                  <span className="rp-value">{draftProduct.statisticalPeriod || '-'}</span>
                </FormLike>
                <FormLike label="生命阶段" full readonly>
                  <span className="rp-value">{draftProduct.lifecycleBoundary || '-'}</span>
                </FormLike>
              </div>

              {/* 碳足迹结果：重点凸显 */}
              <div className="rp-emission-highlight">
                <div className="rp-emission-label">碳足迹结果</div>
                <div className="rp-emission-value">
                  {formatEmission(calc.totalEmission)}
                  <span className="rp-emission-unit">kgCO₂eq / {calc.unit}</span>
                </div>
              </div>

              <div className="rp-subsection-title">产品资料</div>
              <div className="rp-cover-grid">
                <FormLike label="产品介绍" full>
                  <Textarea
                    value={draftProduct.description}
                    onChange={(v) => patchProduct({ description: v as string })}
                    placeholder="请输入产品介绍"
                    autosize={{ minRows: 3, maxRows: 6 }}
                  />
                </FormLike>
                <FormLike label="产品图片" full hint="支持上传多张">
                  <ReportImageUpload
                    value={draftProduct.images}
                    onChange={(images) => patchProduct({ images })}
                  />
                </FormLike>
                <FormLike label="工艺描述" full>
                  <Textarea
                    value={draftProduct.processDescription}
                    onChange={(v) => patchProduct({ processDescription: v as string })}
                    placeholder="请输入工艺描述"
                    autosize={{ minRows: 3, maxRows: 6 }}
                  />
                </FormLike>
                <FormLike label="工艺流程图片" full hint="支持上传多张">
                  <ReportImageUpload
                    value={draftProduct.processImages}
                    onChange={(processImages) => patchProduct({ processImages })}
                  />
                </FormLike>
              </div>

              <div className="rp-subsection-title">计算规则</div>
              <div className="rp-cover-grid">
                <FormLike label="取舍规则" full>
                  <Textarea
                    value={draftProduct.cutOffRule}
                    onChange={(v) => patchProduct({ cutOffRule: v as string })}
                    placeholder="请输入取舍规则"
                    autosize={{ minRows: 2, maxRows: 5 }}
                  />
                </FormLike>
                <FormLike label="分配规则" full>
                  <Textarea
                    value={draftProduct.allocationRule}
                    onChange={(v) => patchProduct({ allocationRule: v as string })}
                    placeholder="请输入分配规则"
                    autosize={{ minRows: 2, maxRows: 5 }}
                  />
                </FormLike>
              </div>
            </Card>

            {/* 企业信息卡：报告信息、封面概况均由系统自动取值，不在本页展示 */}
            <Card title="企业信息" className="rp-step-card" data-ann-target="rp.detail.enterprise">
              {enterprises.length === 0 && (
                <Alert
                  theme="warning"
                  style={{ marginBottom: 12 }}
                  message={
                    <Space>
                      <span>企业信息库暂无记录，请先前往「企业信息维护」建档后再引用。</span>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => navigate('/report/enterprise')}
                      >
                        前往企业信息维护
                      </Button>
                    </Space>
                  }
                />
              )}

              {sourceEnterpriseMissing && (
                <Alert
                  theme="warning"
                  style={{ marginBottom: 12 }}
                  message="本报告引用的企业信息库记录已被删除，请重新选择记录引用，或直接在下方补录企业信息。"
                />
              )}

              <div className="rp-cover-edit">
                <div className="rp-cover-edit-title">
                  填写企业信息（可编辑 / 可补录）
                  {report.sourceEnterpriseId && !sourceEnterpriseMissing ? (
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
                      onChange={(v) => patchCover({ companyName: v as string })}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="企业地址">
                    <Input
                      value={draftCover.companyAddress}
                      onChange={(v) => patchCover({ companyAddress: v as string })}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="统一社会信用代码">
                    <Input
                      value={draftCover.unifiedSocialCreditCode}
                      onChange={(v) => patchCover({ unifiedSocialCreditCode: v as string })}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="法定代表人">
                    <Input
                      value={draftCover.legalPerson}
                      onChange={(v) => patchCover({ legalPerson: v as string })}
                      placeholder="请输入"
                    />
                  </FormLike>
                  <FormLike label="联系方式">
                    <Input
                      value={draftCover.contactPhone}
                      onChange={(v) => patchCover({ contactPhone: v as string })}
                      placeholder="请输入"
                    />
                  </FormLike>
                </div>
                <div className="rp-enterprise-note">
                  现场补录仅作用于本报告，执行「更新报告」时会被企业信息库记录覆盖；建议先在「企业信息维护」建档后引用。
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
              message="以下为按当前产品与企业信息装配的报告预览（只读）。确认无误后点击「生成正式报告」。"
            />
            <div className="rp-step-card rp-inline-preview" data-ann-target="rp.detail.preview">
              <ReportPreview report={editPreview} />
            </div>
          </>
        )}

        {/* 底部冻结操作栏：按数据质量评价页一致，固定右下 */}
        <div className="rp-action-bar">
          <Space>
            <Button variant="outline" onClick={handleLeave}>
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
              <Button theme="primary" onClick={() => setFinalizeOpen(true)}>
                生成正式报告
              </Button>
            )}
          </Space>
        </div>

        {/* 离开确认：仅在存在未保存内容时弹出 */}
        <Dialog
          visible={leaveOpen}
          header="确认离开"
          width="420px"
          onClose={() => setLeaveOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setLeaveOpen(false)}>
                继续编辑
              </Button>
              <Button theme="danger" onClick={() => navigate('/report/prepare')}>
                确认离开
              </Button>
            </>
          }
        >
          离开后未保存的产品 / 企业信息将丢失，确认离开？
        </Dialog>

        {/* 生成正式报告：缺失项提示 + 正文锁定说明 */}
        <Dialog
          header="生成正式报告"
          visible={finalizeOpen}
          onClose={() => setFinalizeOpen(false)}
          onConfirm={handleFinalize}
          confirmBtn={{ content: '确认生成', theme: 'primary', loading: finalizing }}
          cancelBtn={{ content: '再检查一下' }}
          width={560}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0 }}>
              生成后报告状态变为「已生成」，正文按当前产品 / 企业信息与核算数据锁定；如需调整产品信息，可在列表执行「更新报告」。
            </p>
            {missingLabels().length > 0 && (
              <Alert
                theme="warning"
                message={`以下企业信息为空，报告中将以「（待补录）」呈现：${missingLabels().join('、')}`}
              />
            )}
            <p style={{ margin: 0, color: 'var(--td-text-color-secondary, #8a8f99)', fontSize: 13 }}>
              报告日期将自动取生成当日：{generatedDate}
            </p>
          </div>
        </Dialog>

        {/* 引用企业信息库：覆盖手填内容前确认 */}
        <Dialog
          header="引用企业信息库记录"
          visible={applyConfirmOpen}
          onClose={() => setApplyConfirmOpen(false)}
          onConfirm={doApplyEnterprise}
          confirmBtn={{ content: '覆盖并引用', theme: 'primary', loading: applying }}
          cancelBtn={{ content: '取消' }}
          width={480}
        >
          当前已填写的企业信息与所选记录不一致，引用后将用企业信息库记录覆盖下方企业字段（仅影响本报告）。确认引用？
        </Dialog>
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
            {isDraft && <Tag theme="warning" variant="light" style={{ marginLeft: 8 }}>编制中</Tag>}
          </p>
        </div>
      </div>

      {isStale && (
        <Alert
          theme="warning"
          style={{ marginBottom: 16 }}
          data-ann-target="rp.detail.alert"
          message={`上游数据已更新（${report.staleReason}），报告结论可能失效；请点击下方「更新报告」同步最新数据并调整报告内容。`}
        />
      )}

      {viewOnly && (
        <Alert theme="info" style={{ marginBottom: 16 }} message="当前为只读查看模式，仅可浏览与下载报告。" />
      )}

      {/* 产品信息：默认继承核算记录，已随报告锁定 */}
      <Card title="产品信息" className="rp-section-gap" data-ann-target="rp.detail.summary">
        <div className="rp-cover-grid">
          <FormLike label="产品名称">
            <span className="rp-value">{info.productName || '-'}</span>
          </FormLike>
          <FormLike label="产品型号">
            <span className="rp-value">{info.productModel || '-'}</span>
          </FormLike>
          <FormLike label="声明 / 功能单位">
            <span className="rp-value">{info.declaredUnit || '-'}</span>
          </FormLike>
          <FormLike label="产品生产厂家">
            <span className="rp-value">{info.manufacturer || '-'}</span>
          </FormLike>
          <FormLike label="产品产地">
            <span className="rp-value">{info.origin || '-'}</span>
          </FormLike>
          <FormLike label="来源核算项目">
            <a className="rp-link" onClick={() => navigate(`/pcf/project/${report.sourceProjectId}`)}>
              {report.sourceProjectName}
            </a>
          </FormLike>
          <FormLike label="系统边界">
            <span className="rp-value">{info.systemBoundary || '-'}</span>
          </FormLike>
          <FormLike label="统计时间">
            <span className="rp-value">{info.statisticalPeriod || '-'}</span>
          </FormLike>
          <FormLike label="生命阶段" full>
            <span className="rp-value">{info.lifecycleBoundary || '-'}</span>
          </FormLike>
        </div>

        <div className="rp-emission-highlight">
          <div className="rp-emission-label">碳足迹结果</div>
          <div className="rp-emission-value">
            {formatEmission(calc.totalEmission)}
            <span className="rp-emission-unit">kgCO₂eq / {calc.unit}</span>
          </div>
        </div>

        <div className="rp-subsection-title">产品资料</div>
        <div className="rp-cover-grid">
          <FormLike label="产品介绍" full>
            <span className="rp-value rp-pre">{info.description || '-'}</span>
          </FormLike>
          <FormLike label="产品图片" full>
            {info.images.length > 0 ? (
              <div className="rp-image-grid">
                {info.images.map((url, index) => (
                  <img key={`${index}-${url.slice(-12)}`} className="rp-image-item" src={url} alt={`产品图片 ${index + 1}`} />
                ))}
              </div>
            ) : (
              <span className="rp-value">-</span>
            )}
          </FormLike>
          <FormLike label="工艺描述" full>
            <span className="rp-value rp-pre">{info.processDescription || '-'}</span>
          </FormLike>
          <FormLike label="工艺流程图片" full>
            {info.processImages.length > 0 ? (
              <div className="rp-image-grid">
                {info.processImages.map((url, index) => (
                  <img key={`${index}-${url.slice(-12)}`} className="rp-image-item" src={url} alt={`工艺流程图 ${index + 1}`} />
                ))}
              </div>
            ) : (
              <span className="rp-value">-</span>
            )}
          </FormLike>
        </div>

        <div className="rp-subsection-title">计算规则</div>
        <div className="rp-cover-grid">
          <FormLike label="取舍规则" full>
            <span className="rp-value rp-pre">{info.cutOffRule || '-'}</span>
          </FormLike>
          <FormLike label="分配规则" full>
            <span className="rp-value rp-pre">{info.allocationRule || '-'}</span>
          </FormLike>
        </div>

        <div className="rp-cover-grid" style={{ marginTop: 12 }}>
          <FormLike label="生成时间">
            <span className="rp-value">{report.generatedAt || '未生成'}</span>
          </FormLike>
        </div>
      </Card>

      {/* 企业信息卡（只读） */}
      <Card title="企业信息" className="rp-section-gap" data-ann-target="rp.detail.enterprise">
        <Alert
          theme="info"
          style={{ marginBottom: 16 }}
          message="企业信息引用自「企业信息维护」，已随报告锁定；如需修改请在列表执行「更新报告」并回到编制态。"
        />
        <div className="rp-cover-grid">
          <FormLike label="报告主体 / 生产者名称"><span className="rp-value">{cover.companyName || '（待补录）'}</span></FormLike>
          <FormLike label="企业地址"><span className="rp-value">{cover.companyAddress || '-'}</span></FormLike>
          <FormLike label="统一社会信用代码"><span className="rp-value">{cover.unifiedSocialCreditCode || '-'}</span></FormLike>
          <FormLike label="法定代表人"><span className="rp-value">{cover.legalPerson || '-'}</span></FormLike>
          <FormLike label="联系方式"><span className="rp-value">{cover.contactPhone || '-'}</span></FormLike>
          <FormLike label="出具报告机构"><span className="rp-value">{cover.issuer || '-'}</span></FormLike>
        </div>
      </Card>

      {/* 底部冻结操作栏：按数据质量评价页一致，固定右下 */}
      <div className="rp-action-bar">
        <Space>
          <Button variant="outline" onClick={handleLeave}>
            返回
          </Button>
          {!isDraft && (
            <>
              <Button variant="outline" disabled={!isReady} loading={exporting} onClick={handleExport}>
                下载报告
              </Button>
              <Button
                variant="outline"
                loading={regenerating}
                onClick={handleRegenerate}
                data-ann-target="rp.list.regen"
              >
                更新报告
              </Button>
              <Button
                theme="primary"
                onClick={() => setPreviewVisible(true)}
                data-ann-target="rp.detail.view"
              >
                查看报告
              </Button>
            </>
          )}
        </Space>
      </div>

      <Drawer
        size="1120px"
        header={report.fileName}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
      >
        <div style={{ height: '100%' }}>
          <ReportPreview report={report} downloadable={isReady} />
        </div>
      </Drawer>

    </div>
  )
}

/** 轻量标签包装（避免引入额外 Form 组件） */
function FormLike({
  label,
  full,
  hint,
  readonly,
  children,
}: {
  label: string
  full?: boolean
  /** 字段下方提示（如「支持上传多张」） */
  hint?: string
  /** 核算口径继承字段：只读展示 */
  readonly?: boolean
  children: ReactNode
}) {
  return (
    <div className={['rp-cover-item', readonly ? 'is-readonly' : ''].filter(Boolean).join(' ')} style={full ? { gridColumn: '1 / 3' } : undefined}>
      <span className="rp-label">{label}</span>
      {children}
      {hint && <span className="rp-field-hint">{hint}</span>}
    </div>
  )
}

/** 读取本地图片为 data URL（原型仅做本地预览，不落真实文件服务） */
function readImageFiles(files: File[]): Promise<string[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => resolve('')
          reader.readAsDataURL(file)
        }),
    ),
  )
}

/** 报告内图片上传（产品图片支持多张，工艺流程图片 1 张） */
function ReportImageUpload({
  value,
  onChange,
  max = 6,
}: {
  value: string[]
  onChange: (images: string[]) => void
  max?: number
}) {
  const handlePick = async (files: File[]) => {
    if (files.length === 0) return
    const room = max - value.length
    if (room <= 0) {
      MessagePlugin.error(`最多上传 ${max} 张图片`)
      return
    }
    const picked = files.filter((file) => file.type.startsWith('image/')).slice(0, room)
    if (picked.length === 0) {
      MessagePlugin.error('请选择图片文件')
      return
    }
    if (picked.length < files.length) MessagePlugin.warning(`最多上传 ${max} 张图片，已按上限截取`)
    const urls = (await readImageFiles(picked)).filter(Boolean)
    onChange([...value, ...urls])
  }

  return (
    <div className="rp-image-upload">
      {value.map((url, index) => (
        <div className="rp-image-tile" key={`${index}-${url.slice(-12)}`}>
          <img src={url} alt={`图片 ${index + 1}`} />
          <button
            type="button"
            className="rp-image-remove"
            title="移除该图片"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      {value.length < max && (
        <label className="rp-image-add">
          + 上传图片
          <input
            type="file"
            accept="image/*"
            multiple={max > 1}
            hidden
            onChange={(e) => {
              void handlePick(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

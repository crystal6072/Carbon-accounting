import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Alert,
  Input,
  Textarea,
  Drawer,
  Dialog,
  MessagePlugin,
  Select,
} from 'tdesign-react'
import type { PcfFootprintReport, EnterpriseInfo, ReportCover, ReportSection } from '@/types/report'
import type { EnterpriseRecord } from '@/types/enterprise'
import {
  fetchReportDetail,
  saveReportEnterprise,
  saveReportCover,
  saveReportSections,
  regenerateReport,
  finalizeReport,
  exportReport,
  applyEnterpriseFromLibrary,
} from '@/mock/report'
import { fetchEnterprises } from '@/mock/enterprise'
import { REPORT_STATUS_TEXT, REPORT_STATUS_TAG, SECTION_TYPE_TEXT } from './reportMeta'
import ReportPreview from './ReportPreview'
import './ReportPage.css'

export default function ReportDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState<PcfFootprintReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  // 预览用报告副本（编辑态下合并草稿封面，避免异步保存时序问题）
  const [previewReport, setPreviewReport] = useState<PcfFootprintReport | null>(null)

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

  // 正文编辑态（章节段落 + 表格可编辑 / 可补录；除封面 S00 外）
  const [draftSections, setDraftSections] = useState<ReportSection[]>([])

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
        setDraftSections(r.sections.map((s) => ({ ...s })))
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

  const tag = REPORT_STATUS_TAG[report.status]
  const isEditing = report.status === 'reportEditing'
  const isReady = report.status === 'reportReady' || report.status === 'reportStale'
  const isStale = report.status === 'reportStale'
  const cover = isEditing ? draftCover : report.cover

  const pickEnterprise = (c: ReportCover): EnterpriseInfo => ({
    companyName: c.companyName,
    companyAddress: c.companyAddress,
    unifiedSocialCreditCode: c.unifiedSocialCreditCode,
    legalPerson: c.legalPerson,
    contactPhone: c.contactPhone,
    issuer: c.issuer,
    reportDate: c.reportDate,
  })

  const validateCover = (c: ReportCover): string[] => {
    const missing: string[] = []
    if (!c.productName.trim()) missing.push('产品名称')
    if (!c.productSpecModel.trim()) missing.push('产品规格型号')
    if (!c.companyName.trim()) missing.push('生产者名称')
    if (!c.reportDate.trim()) missing.push('报告日期')
    return missing
  }

  const handleSaveCover = async () => {
    const missing = validateCover(draftCover)
    if (missing.length) {
      MessagePlugin.error(`请填写：${missing.join('、')}`)
      return
    }
    setSaving(true)
    try {
      await saveReportCover(report!.id, {
        productName: draftCover.productName,
        productSpecModel: draftCover.productSpecModel,
      })
      await saveReportEnterprise(report!.id, pickEnterprise(draftCover))
      MessagePlugin.success('封面信息已保存')
      load()
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

  const updateSectionContent = (secIdx: number, text: string) => {
    setDraftSections((prev) =>
      prev.map((s, i) => {
        if (i !== secIdx) return s
        // 有则装配 / 无则留白的章节：内容为空恢复留白，否则转正文
        const blankFlag = s.sectionType === 'autoBlank' ? !text.trim() : s.blankFlag
        return { ...s, content: text, blankFlag }
      }),
    )
  }

  const updateTableCell = (
    secIdx: number,
    tableIdx: number,
    rowIdx: number,
    col: string,
    value: string,
  ) => {
    setDraftSections((prev) =>
      prev.map((s, i) => {
        if (i !== secIdx) return s
        const tables = s.tables.map((t, ti) => {
          if (ti !== tableIdx) return t
          const rows = t.rows.map((r, ri) =>
            ri === rowIdx ? { ...r, [col]: value } : r,
          )
          return { ...t, rows }
        })
        return { ...s, tables }
      }),
    )
  }

  const addTableRow = (secIdx: number, tableIdx: number) => {
    setDraftSections((prev) =>
      prev.map((s, i) => {
        if (i !== secIdx) return s
        const tables = s.tables.map((t, ti) => {
          if (ti !== tableIdx) return t
          const emptyRow: Record<string, string> = {}
          t.columns.forEach((c) => (emptyRow[c] = ''))
          return { ...t, rows: [...t.rows, emptyRow] }
        })
        return { ...s, tables }
      }),
    )
  }

  const removeTableRow = (secIdx: number, tableIdx: number, rowIdx: number) => {
    setDraftSections((prev) =>
      prev.map((s, i) => {
        if (i !== secIdx) return s
        const tables = s.tables.map((t, ti) => {
          if (ti !== tableIdx) return t
          return { ...t, rows: t.rows.filter((_, ri) => ri !== rowIdx) }
        })
        return { ...s, tables }
      }),
    )
  }

  const handleSaveSections = async () => {
    setSaving(true)
    try {
      await saveReportSections(report!.id, draftSections)
      MessagePlugin.success('报告正文已保存')
      load()
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    if (isEditing) {
      const missing = validateCover(draftCover)
      if (missing.length) {
        MessagePlugin.error(`预览前请先填写：${missing.join('、')}`)
        return
      }
      setPreviewReport({ ...report!, cover: { ...draftCover }, sections: draftSections })
    } else {
      setPreviewReport(report)
    }
    setPreviewVisible(true)
  }

  const handleFinalize = async () => {
    const missing = validateCover(draftCover)
    if (missing.length) {
      MessagePlugin.error(`请完善封面信息：${missing.join('、')}`)
      return
    }
    setFinalizing(true)
    try {
      await saveReportCover(report!.id, {
        productName: draftCover.productName,
        productSpecModel: draftCover.productSpecModel,
      })
      await saveReportEnterprise(report!.id, pickEnterprise(draftCover))
      await saveReportSections(report!.id, draftSections)
      const r = await finalizeReport(report!.id)
      setReport(r)
      setDraftCover({ ...r.cover })
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
        <Space>
          <Button variant="outline" onClick={() => navigate('/report/prepare')}>
            返回
          </Button>
          {isReady && (
            <Button variant="outline" loading={regenerating} onClick={() => setConfirmRegen(true)}>
              重新生成
            </Button>
          )}
        </Space>
      </div>

      {isStale && (
        <Alert
          theme="warning"
          style={{ marginBottom: 16 }}
          message={`上游数据已更新（${report.staleReason}），报告结论可能失效。`}
          operation={
            <Button theme="primary" size="small" loading={regenerating} onClick={() => setConfirmRegen(true)}>
              重新生成
            </Button>
          }
        />
      )}

      {isEditing && (
        <Alert
          theme="info"
          style={{ marginBottom: 16 }}
          message="当前为「编制中」草稿：系统已自动继承上游字段，缺失项可直接编辑补录；填写完整后点击「生成正式报告」。"
        />
      )}

      {/* 报告信息卡 */}
      <Card title="报告信息" className="rp-section-gap">
        <Descriptions column={3} bordered>
          <Descriptions.DescriptionsItem label="报告编号">
            {report.reportNo}
            <span style={{ color: '#bbbfc6', marginLeft: 6 }}>（内部标识，不打印）</span>
          </Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="报告模板">
            {report.templateName} {report.templateVersion}
          </Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="来源核算项目">
            {report.sourceDeleted ? (
              <Tag theme="default">来源已删除</Tag>
            ) : (
              <span>{report.sourceProjectName}</span>
            )}
          </Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="核算结果版本">V{report.sourceCalcVersion}</Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="报告状态">
            <Tag theme={tag.theme} variant={tag.variant}>
              {REPORT_STATUS_TEXT[report.status]}
            </Tag>
          </Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="报告生成时间">{report.generatedAt || '-'}</Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="下载文件名">{report.fileName}</Descriptions.DescriptionsItem>
        </Descriptions>
      </Card>

      {/* 封面与概况信息卡 */}
      <Card title="封面与概况信息" className="rp-section-gap">
        <Alert
          theme="info"
          style={{ marginBottom: 16 }}
          message={isEditing
            ? '灰色背景项为核算数据自动装配、只读；白色背景项可编辑 / 可补录。'
            : '封面信息已锁定，如需修改请重新生成并进入编制态。'}
        />

        <div className="rp-cover-grid">
          <FormLike label="产品名称 *">
            {isEditing ? (
              <Input
                value={draftCover.productName}
                onChange={(v) => setDraftCover((c) => ({ ...c, productName: v as string }))}
                placeholder="请输入"
              />
            ) : (
              <span className="rp-value">{cover.productName}</span>
            )}
          </FormLike>
          <FormLike label="产品规格型号 *">
            {isEditing ? (
              <Input
                value={draftCover.productSpecModel}
                onChange={(v) => setDraftCover((c) => ({ ...c, productSpecModel: v as string }))}
                placeholder="请输入"
              />
            ) : (
              <span className="rp-value">{cover.productSpecModel}</span>
            )}
          </FormLike>
          <FormLike label="报告生成">
            <span className="rp-value">{cover.generatedLabel}</span>
          </FormLike>
          <FormLike label="报告日期 *">
            {isEditing ? (
              <input
                type="date"
                className="rp-date-input"
                value={draftCover.reportDate}
                onChange={(e) => setDraftCover((c) => ({ ...c, reportDate: e.target.value }))}
              />
            ) : (
              <span className="rp-value">{cover.reportDate}</span>
            )}
          </FormLike>
          <FormLike label="报告编号">
            <span className="rp-value">{cover.reportNo}</span>
          </FormLike>
          <FormLike label="出具报告机构（若有）">
            {isEditing ? (
              <Input
                value={draftCover.issuer}
                onChange={(v) => setDraftCover((c) => ({ ...c, issuer: v as string }))}
                placeholder="请输入"
              />
            ) : (
              <span className="rp-value">{cover.issuer || '-'}</span>
            )}
          </FormLike>
          <FormLike label="碳足迹核算周期">
            <span className="rp-value">{cover.statisticalPeriod}</span>
          </FormLike>
          <FormLike label="系统边界">
            <span className="rp-value">{cover.systemBoundary}</span>
          </FormLike>
          <FormLike label="生命周期边界" full>
            <span className="rp-value">{cover.lifecycleBoundary}</span>
          </FormLike>
          <FormLike label="报告单位">
            <span className="rp-value">{cover.reportUnit}</span>
          </FormLike>
          <FormLike label="标准依据" full>
            <span className="rp-value">{cover.standardBasis}</span>
          </FormLike>
        </div>

        <div className="rp-cover-edit rp-section-gap">
          <div className="rp-cover-edit-title">
            企业信息（可编辑 / 可补录）
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
          {isEditing && (
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
          )}
          <div className="rp-cover-grid">
            <FormLike label="报告主体 / 生产者名称 *">
              {isEditing ? (
                <Input
                  value={draftCover.companyName}
                  onChange={(v) => setDraftCover((c) => ({ ...c, companyName: v as string }))}
                  placeholder="请输入"
                />
              ) : (
                <span className="rp-value">{cover.companyName}</span>
              )}
            </FormLike>
            <FormLike label="企业地址">
              {isEditing ? (
                <Input
                  value={draftCover.companyAddress}
                  onChange={(v) => setDraftCover((c) => ({ ...c, companyAddress: v as string }))}
                  placeholder="请输入"
                />
              ) : (
                <span className="rp-value">{cover.companyAddress || '-'}</span>
              )}
            </FormLike>
            <FormLike label="统一社会信用代码">
              {isEditing ? (
                <Input
                  value={draftCover.unifiedSocialCreditCode}
                  onChange={(v) => setDraftCover((c) => ({ ...c, unifiedSocialCreditCode: v as string }))}
                  placeholder="请输入"
                />
              ) : (
                <span className="rp-value">{cover.unifiedSocialCreditCode || '-'}</span>
              )}
            </FormLike>
            <FormLike label="法定代表人">
              {isEditing ? (
                <Input
                  value={draftCover.legalPerson}
                  onChange={(v) => setDraftCover((c) => ({ ...c, legalPerson: v as string }))}
                  placeholder="请输入"
                />
              ) : (
                <span className="rp-value">{cover.legalPerson || '-'}</span>
              )}
            </FormLike>
            <FormLike label="联系方式">
              {isEditing ? (
                <Input
                  value={draftCover.contactPhone}
                  onChange={(v) => setDraftCover((c) => ({ ...c, contactPhone: v as string }))}
                  placeholder="请输入"
                />
              ) : (
                <span className="rp-value">{cover.contactPhone || '-'}</span>
              )}
            </FormLike>
          </div>
          {isEditing && (
            <Button theme="primary" loading={saving} style={{ marginTop: 12 }} onClick={handleSaveCover}>
              保存封面信息
            </Button>
          )}
        </div>
      </Card>

      {/* 报告正文编辑卡 */}
      {isEditing && (
        <Card title="报告正文（可编辑 / 可补录）" className="rp-section-gap">
          <Alert
            theme="info"
            style={{ marginBottom: 16 }}
            message="正文段落与表格均可在本页编辑：前序未提供数据的章节可在此补录，已有内容可自由改写与组合；编辑后点击「保存正文」。"
          />
          <div className="rp-section-edit-list">
            {draftSections.map((s, realIdx) => {
              if (s.sectionCode === 'S00') return null
              return (
                <SectionEditor
                  key={s.id}
                  section={s}
                  onContent={(text) => updateSectionContent(realIdx, text)}
                  onCell={(ti, ri, col, val) => updateTableCell(realIdx, ti, ri, col, val)}
                  onAddRow={(ti) => addTableRow(realIdx, ti)}
                  onRemoveRow={(ti, ri) => removeTableRow(realIdx, ti, ri)}
                />
              )
            })}
          </div>
          <Button theme="primary" loading={saving} style={{ marginTop: 12 }} onClick={handleSaveSections}>
            保存正文
          </Button>
        </Card>
      )}

      {/* 动作区 */}
      <Card className="rp-section-gap">
        <Space>
          {isEditing ? (
            <>
              <Button theme="primary" loading={finalizing} onClick={handleFinalize}>
                生成正式报告
              </Button>
              <Button variant="outline" loading={saving} onClick={handlePreview}>
                预览草稿
              </Button>
            </>
          ) : (
            <>
              <Button theme="primary" disabled={!isReady} onClick={() => setPreviewVisible(true)}>
                查看报告
              </Button>
              <Button variant="outline" disabled={!isReady} loading={exporting} onClick={handleExport}>
                下载报告
              </Button>
              <Button variant="outline" disabled={!isReady || report.sourceDeleted} loading={regenerating} onClick={() => setConfirmRegen(true)}>
                重新生成
              </Button>
            </>
          )}
        </Space>
      </Card>

      <Drawer
        size="1120px"
        header={(previewReport ?? report).fileName}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
      >
        <ReportPreview report={previewReport ?? report} />
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

/** 单个正文章节编辑器：段落文本 + 可编辑表格（单元格 / 增行 / 删行） */
function SectionEditor({
  section,
  onContent,
  onCell,
  onAddRow,
  onRemoveRow,
}: {
  section: ReportSection
  onContent: (text: string) => void
  onCell: (tableIdx: number, rowIdx: number, col: string, value: string) => void
  onAddRow: (tableIdx: number) => void
  onRemoveRow: (tableIdx: number, rowIdx: number) => void
}) {
  return (
    <div className="rp-section-edit">
      <div className="rp-section-edit-head">
        <span className="rp-section-edit-title">{section.sectionTitle}</span>
        <Tag size="small" variant="light" theme={section.sectionType === 'fixed' ? 'default' : 'primary'}>
          {SECTION_TYPE_TEXT[section.sectionType]}
        </Tag>
        {section.blankFlag && (
          <Tag size="small" variant="light" theme="warning">
            前序未提供
          </Tag>
        )}
      </div>
      {section.blankFlag && (
        <Alert theme="warning" style={{ marginBottom: 8 }} message="前序环节未提供本项内容，可在下方直接补录；填写后将以正式内容呈现。" />
      )}
      <Textarea
        value={section.content}
        onChange={(v) => onContent(String(v))}
        autosize={{ minRows: 2, maxRows: 10 }}
        placeholder="请输入本章节正文内容（可自由组合字段）"
      />
      {section.tables.map((t, ti) => (
        <div key={t.id} className="rp-table-edit">
          <div className="rp-table-edit-title">{t.title}</div>
          <div className="rp-table-edit-scroll">
            <table className="rp-edit-table">
              <thead>
                <tr>
                  {t.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th className="rp-edit-op">操作</th>
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, ri) => (
                  <tr key={ri}>
                    {t.columns.map((c) => (
                      <td key={c}>
                        <Input
                          value={r[c] ?? ''}
                          onChange={(val) => onCell(ti, ri, c, String(val))}
                          size="small"
                          borderless
                        />
                      </td>
                    ))}
                    <td className="rp-edit-op">
                      <Button size="small" variant="text" theme="danger" onClick={() => onRemoveRow(ti, ri)}>
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
                {t.totalRow && (
                  <tr className="rp-edit-total">
                    {t.columns.map((c) => (
                      <td key={c}>{t.totalRow![c] ?? ''}</td>
                    ))}
                    <td className="rp-edit-op" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Button size="small" variant="text" theme="primary" onClick={() => onAddRow(ti)}>
            + 添加行
          </Button>
        </div>
      ))}
    </div>
  )
}

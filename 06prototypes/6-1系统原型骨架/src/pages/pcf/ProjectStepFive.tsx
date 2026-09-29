import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Input, Modal, Select, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  confirmPcfReport,
  exportPcfReport,
  fetchPcfReport,
  fetchPcfReportDraft,
  fetchPcfReportTemplates,
  generatePcfReport,
  resumePcfReport,
  savePcfReportCover,
  updatePcfReportSection,
} from '@/mock'
import type {
  PcfProject,
  PcfReport,
  PcfReportCover,
  PcfReportDraft,
  PcfReportSection,
  PcfReportSystemBlock,
  PcfReportTemplate,
  PcfResultDetail,
  PcfStageSummary,
} from '@/types'
import PcfWordPreview from './PcfWordPreview'
import './PcfPage.css'
import './PcfReport.css'

interface ProjectStepFiveProps {
  project: PcfProject
  onSaved: (project: PcfProject) => void
}

/** 数值展示：保留最多 4 位小数、去掉尾随 0 */
function formatNumber(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, '')
}

/** 活动量描述拆分「数量 / 单位」（如「0.692 kWh」） */
function splitActivity(text: string): { qty: string; unit: string } {
  const index = text.lastIndexOf(' ')
  if (index < 0) return { qty: text || '-', unit: '' }
  return { qty: text.slice(0, index), unit: text.slice(index + 1) }
}

/** 只读字段（报告正文 · 概况） */
function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="pcf-report-kv-row">
      <span className="pcf-report-kv-label">{label}</span>
      <span className="pcf-report-kv-value">{value || '——'}</span>
    </div>
  )
}

/** 表单字段壳（封面与概况信息区） */
function Field({
  label,
  required,
  error,
  full,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  /** 在两列栅格中占满整行（图片上传等宽内容） */
  full?: boolean
  children: ReactNode
}) {
  return (
    <div className={['pcf-report-field', full ? 'pcf-report-field-full' : ''].filter(Boolean).join(' ')}>
      <span className="pcf-report-field-label">
        {label}
        {required && <em className="pcf-report-req">*</em>}
      </span>
      <div className="pcf-report-field-value">{children}</div>
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

/**
 * 产品图片上传（本期支持，选填）：
 * 原型仅本地读取为 data URL 做预览与报告内展示，随封面信息一并保存 / 导出，不做真实文件存储。
 */
function ProductImageUpload({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const toast = useToast()

  const handleFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件（支持 jpg / png）', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('图片大小不能超过 5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  return (
    <div className="pcf-report-image-upload">
      {value ? (
        <img className="pcf-report-image-thumb" src={value} alt="产品图片" />
      ) : (
        <div className="pcf-report-image-thumb pcf-report-image-thumb-empty">暂无图片</div>
      )}
      <div className="pcf-report-image-actions">
        {!disabled && (
          <label className="btn btn-sm">
            选择图片
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        )}
        {!disabled && value && (
          <button type="button" className="link link-danger" onClick={() => onChange('')}>
            移除
          </button>
        )}
        <span className="toolbar-tip">
          选填；建议 jpg / png，单张 ≤ 5MB（原型本地预览，不做真实文件存储）
        </span>
      </div>
    </div>
  )
}

/**
 * 生成报告前必须补充的信息（业务 PRD R-052）：
 * 系统带出字段（产品名称 / 规格 / 生产者 / 报告编号）无需填写，其余手工字段与「结果说明」需先填齐。
 */
const REQUIRED_COVER_FIELDS: Array<{ key: keyof PcfReportCover; label: string }> = [
  { key: 'reportDate', label: '报告日期' },
  { key: 'address', label: '地址' },
  { key: 'legalPerson', label: '法定代表人' },
  { key: 'contactPerson', label: '授权人（联系人）' },
  { key: 'contactPhone', label: '联系电话' },
  { key: 'companyProfile', label: '企业概况' },
  { key: 'productFunction', label: '产品功能' },
  { key: 'productIntro', label: '产品介绍' },
]

/** 「六、结果解释 · 结果说明」章节编码（模板无默认文案，生成前必填） */
const REQUIRED_SECTION_CODES = ['S06A']

/** 演示用示例内容（原型「一键填充」；mock 数据已清空，无预置示例） */
const DEMO_COVER_FILL: Partial<PcfReportCover> = {}

const DEMO_SECTION_FILL: Record<string, string> = {}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface ReportInfoFormProps {
  cover: PcfReportCover
  sections: PcfReportSection[]
  /** 章节 id → 正文（当前编辑值） */
  sectionText: Record<string, string>
  /** 校验错误：字段名 / `section:${id}` → 提示 */
  errors: Record<string, string>
  /** 只读（报告已完成 / 锁定） */
  readOnly?: boolean
  /** 模板展示文案 */
  templateLabel: string
  /** 报告编号展示文案（草稿为「生成后由系统自动编号」） */
  reportNoText: string
  onChangeCover: (patch: Partial<PcfReportCover>) => void
  onChangeSection: (sectionId: string, value: string) => void
}

/**
 * 报告基本信息表单（封面 + 概况 + 产品信息 + 说明性章节）：
 * 生成前「填写报告信息」与生成后「编辑 / 查看报告信息」共用，统一在弹窗中承载，不在页面平铺。
 */
function ReportInfoForm({
  cover,
  sections,
  sectionText,
  errors,
  readOnly,
  templateLabel,
  reportNoText,
  onChangeCover,
  onChangeSection,
}: ReportInfoFormProps) {
  /** 只读态统一以文本展示 */
  const readonly = (value: string) => <span className="pcf-report-readonly">{value || '——'}</span>
  const textInput = (key: keyof PcfReportCover, placeholder?: string) =>
    readOnly ? (
      readonly(String(cover[key] ?? ''))
    ) : (
      <Input
        value={String(cover[key] ?? '')}
        placeholder={placeholder}
        invalid={!!errors[key]}
        onChange={(e) => onChangeCover({ [key]: e.target.value } as Partial<PcfReportCover>)}
      />
    )

  return (
    <div className="pcf-report-form-body">
      <div className="pcf-report-sub-title">报告基本信息</div>
      <div className="pcf-report-grid">
        <Field label="报告模板">{readonly(templateLabel)}</Field>
        <Field label="产品名称">{readonly(cover.productName)}</Field>
        <Field label="产品规格型号">{readonly(cover.productSpec)}</Field>
        <Field label="生产者名称">{readonly(cover.companyName)}</Field>
        <Field label="报告编号">
          <span className="pcf-report-readonly mono">{reportNoText}</span>
        </Field>
        <Field label="报告日期" required error={errors.reportDate}>
          {readOnly ? (
            readonly(cover.reportDate)
          ) : (
            <Input
              type="date"
              value={cover.reportDate}
              invalid={!!errors.reportDate}
              onChange={(e) => onChangeCover({ reportDate: e.target.value })}
            />
          )}
        </Field>
        <Field label="出具报告机构">{textInput('issuer', '（若有）')}</Field>
      </div>

      <div className="pcf-report-sub-title">生产者信息</div>
      <div className="pcf-report-grid">
        <Field label="地址" required error={errors.address}>
          {textInput('address')}
        </Field>
        <Field label="法定代表人" required error={errors.legalPerson}>
          {textInput('legalPerson')}
        </Field>
        <Field label="授权人（联系人）" required error={errors.contactPerson}>
          {textInput('contactPerson')}
        </Field>
        <Field label="联系电话" required error={errors.contactPhone}>
          {textInput('contactPhone')}
        </Field>
        <Field label="企业概况" required error={errors.companyProfile} full>
          {readOnly ? (
            readonly(cover.companyProfile)
          ) : (
            <Textarea
              rows={2}
              value={cover.companyProfile}
              invalid={!!errors.companyProfile}
              onChange={(e) => onChangeCover({ companyProfile: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="pcf-report-sub-title">产品信息</div>
      <div className="pcf-report-grid">
        <Field label="产品功能" required error={errors.productFunction}>
          {textInput('productFunction')}
        </Field>
        <Field label="产品介绍" required error={errors.productIntro}>
          {textInput('productIntro')}
        </Field>
        <Field label="产品图片" full>
          {readOnly ? (
            cover.productImage ? (
              <img className="pcf-report-image-thumb" src={cover.productImage} alt="产品图片" />
            ) : (
              readonly('')
            )
          ) : (
            <ProductImageUpload
              value={cover.productImage}
              onChange={(value) => onChangeCover({ productImage: value })}
            />
          )}
        </Field>
      </div>

      <div className="pcf-report-sub-title">说明性章节内容</div>
      <div className="pcf-report-section-form">
        {sections.map((item) => {
          const required = REQUIRED_SECTION_CODES.includes(item.code)
          const error = errors[`section:${item.id}`]
          return (
            <div className="pcf-report-section-item" key={item.id}>
              <span className="pcf-report-section-label">
                {item.title}
                {!readOnly && required && <em className="pcf-report-req">*</em>}
              </span>
              {readOnly ? (
                <span className="pcf-report-readonly">{sectionText[item.id] || '——'}</span>
              ) : (
                <>
                  <Textarea
                    rows={3}
                    value={sectionText[item.id] ?? ''}
                    invalid={!!error}
                    placeholder={required ? '请结合本次核算结果填写' : undefined}
                    onChange={(e) => onChangeSection(item.id, e.target.value)}
                  />
                  {error && <span className="form-error">{error}</span>}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 工作台步骤⑤「报告」内容区（批次 6，《报告生成_Demo》）：
 * - **生成前**：点击「填写报告信息」在弹窗中补充必要信息（必填校验）→「预览报告」按当前填写
 *   内容在 Word 预览控件中查看 → 确认无误后由用户自行「生成报告」（业务 PRD R-052）；
 * - 生成区：模板选择 + 生成 / 重新生成；
 * - **报告文件卡**：报告主体以文件形态承载，正文**不在页面上平铺**，点击「查看报告」在
 *   Word 预览控件（`PcfWordPreview`）中分页查看；
 * - **报告基本信息（封面与概况 + 说明性章节）同样不在页面平铺**，统一在弹窗中编辑 / 查看
 *   （`ReportInfoForm`，仅「报告编制中」可编辑，完成后只读）；
 * - 动作区：确认完成（确认后锁定）。
 */
export default function ProjectStepFive({ project, onSaved }: ProjectStepFiveProps) {
  const toast = useToast()

  const [templates, setTemplates] = useState<PcfReportTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [report, setReport] = useState<PcfReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(() => project.status === 'reportGenerating')
  const [saving, setSaving] = useState(false)
  const [cover, setCover] = useState<PcfReportCover | null>(null)
  const [sectionText, setSectionText] = useState<Record<string, string>>({})
  /** 预览来源：`draft` 生成前草稿 / `edit` 编辑中（含未保存修改）/ `report` 已保存报告；`null` = 未打开 */
  const [previewMode, setPreviewMode] = useState<'draft' | 'edit' | 'report' | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  /* 报告信息弹窗：`create` 生成前填写 / `edit` 生成后编辑或查看；`null` = 未打开 */
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  /** 生成前信息草稿（未落库） */
  const [draft, setDraft] = useState<PcfReportDraft | null>(null)
  const [formCover, setFormCover] = useState<PcfReportCover | null>(null)
  const [formSections, setFormSections] = useState<Record<string, string>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const resumedRef = useRef('')

  const applyReport = useCallback((next: PcfReport | null) => {
    setReport(next)
    setCover(next ? { ...next.cover } : null)
    setSectionText(next ? Object.fromEntries(next.sections.map((item) => [item.id, item.content])) : {})
  }, [])

  useEffect(() => {
    void (async () => {
      const list = await fetchPcfReportTemplates()
      setTemplates(list)
      setTemplateId((prev) => prev || list[0]?.templateId || '')
    })()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      applyReport(await fetchPcfReport(project.id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [applyReport, project.id, toast])

  useEffect(() => {
    void load()
  }, [load])

  // 切换项目 / 状态变化时同步生成态
  useEffect(() => {
    setGenerating(project.status === 'reportGenerating')
  }, [project.id, project.status])

  /**
   * 「报告生成中」的项目（如预置样本 PJ08）进入本步骤即自动推进到「报告编制中」，
   * 真实系统由服务端回调 / 轮询驱动（原型模拟异步）。
   */
  useEffect(() => {
    if (project.status !== 'reportGenerating' || resumedRef.current === project.id) return
    resumedRef.current = project.id
    let cancelled = false
    void (async () => {
      try {
        const next = await resumePcfReport(project.id)
        if (cancelled) return
        applyReport(next)
        onSaved({ ...project, status: 'reportEditing', currentStep: 5 })
        toast('报告已生成')
      } catch (error) {
        if (!cancelled) toast(error instanceof Error ? error.message : '报告生成失败', 'error')
      } finally {
        if (!cancelled) setGenerating(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.status])

  const isDone = project.status === 'done'
  /** 准入：已核算且尚无报告（业务 PRD R-052） */
  const canGenerate = project.status === 'calculated' && !report
  /** 报告编制中（唯一可编辑态，R-057） */
  const isEditing = project.status === 'reportEditing' && !!report && !report.locked
  const system = report?.system

  const templateOptions: SelectOption[] = useMemo(
    () =>
      templates.map((item) => ({
        label: `${item.templateName}（${item.templateVersion}）`,
        value: item.templateId,
      })),
    [templates],
  )

  /** 生成 / 重新生成（重新生成 = 覆盖当前报告，R-059） */
  const runGenerate = async () => {
    setGenerating(true)
    try {
      const next = await generatePcfReport(project.id, templateId)
      applyReport(next)
      onSaved({ ...project, status: 'reportEditing', currentStep: 5 })
      toast('报告已生成')
    } catch (error) {
      toast(error instanceof Error ? error.message : '报告生成失败', 'error')
      void load()
    } finally {
      setGenerating(false)
      setRegenOpen(false)
    }
  }

  /* ---------- 报告信息弹窗：生成前填写 / 生成后编辑与查看 ---------- */

  /** 生成前：打开「填写报告信息」弹窗，取草稿（系统带出字段已填，手工字段留空待填） */
  const openGenerateForm = async () => {
    try {
      const next = await fetchPcfReportDraft(project.id, templateId)
      setDraft(next)
      setFormCover({ ...next.cover, reportDate: next.cover.reportDate || today() })
      setFormSections(Object.fromEntries(next.sections.map((item) => [item.id, item.content])))
      setFormErrors({})
      setFormMode('create')
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载报告信息失败', 'error')
    }
  }

  /** 生成后：打开「编辑 / 查看报告信息」弹窗（已完成态只读） */
  const openEditForm = () => {
    if (!report || !cover) return
    setFormCover({ ...cover })
    setFormSections(Object.fromEntries(report.sections.map((item) => [item.id, item.content])))
    setFormErrors({})
    setFormMode('edit')
  }

  /** 弹窗内章节来源：生成前取草稿，生成后取已生成报告 */
  const formSectionsSource = formMode === 'create' ? draft?.sections ?? [] : report?.sections ?? []

  /** 必填校验：未填齐时定位到具体字段并提示 */
  const validateForm = (): boolean => {
    if (!formCover) return false
    const errors: Record<string, string> = {}
    for (const item of REQUIRED_COVER_FIELDS) {
      if (!String(formCover[item.key] ?? '').trim()) errors[item.key] = `请填写${item.label}`
    }
    for (const item of formSectionsSource) {
      if (REQUIRED_SECTION_CODES.includes(item.code) && !(formSections[item.id] ?? '').trim()) {
        errors[`section:${item.id}`] = `请填写「${item.title}」内容`
      }
    }
    setFormErrors(errors)
    if (Object.keys(errors).length) {
      toast(`请先完善 ${Object.keys(errors).length} 项必填信息`, 'error')
      return false
    }
    return true
  }

  /** 一键填充示例内容（原型演示用，仅生成前提供） */
  const fillDemo = () => {
    if (!formCover) return
    setFormCover((prev) => (prev ? { ...prev, ...DEMO_COVER_FILL } : prev))
    setFormSections((prev) => {
      const next = { ...prev }
      for (const [code, text] of Object.entries(DEMO_SECTION_FILL)) {
        const section = formSectionsSource.find((item) => item.code === code)
        if (section) next[section.id] = text
      }
      return next
    })
    setFormErrors({})
    toast('已填充示例内容（仅演示用，可自行修改）')
  }

  /** 预览草稿：按当前填写内容装配报告，未落库 */
  const handleDraftPreview = () => {
    if (!validateForm()) return
    setPreviewMode('draft')
  }

  /** 预览编辑中的内容（含未保存修改） */
  const handleEditPreview = () => {
    if (!formCover) return
    setPreviewMode('edit')
  }

  /** 生成前确认生成：提交填写内容，报告落库并进入「报告编制中」 */
  const handleDraftGenerate = async () => {
    if (!formCover || !validateForm()) return
    setGenerating(true)
    try {
      const next = await generatePcfReport(project.id, templateId, {
        cover: formCover,
        sections: formSections,
      })
      applyReport(next)
      onSaved({ ...project, status: 'reportEditing', currentStep: 5 })
      setFormMode(null)
      toast('报告已生成')
    } catch (error) {
      toast(error instanceof Error ? error.message : '报告生成失败', 'error')
    } finally {
      setGenerating(false)
    }
  }

  /** 生成后保存：封面 / 概况信息与说明性章节一并提交（R-056 / R-057） */
  const handleEditSave = async () => {
    if (!formCover || !validateForm()) return
    setSaving(true)
    try {
      let next = await savePcfReportCover(project.id, formCover)
      const changed = next.sections.filter(
        (item) => item.content !== (formSections[item.id] ?? item.content),
      )
      for (const item of changed) {
        next = await updatePcfReportSection(project.id, item.id, formSections[item.id] ?? '')
      }
      applyReport(next)
      setFormMode(null)
      toast('报告信息已保存')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  /** 查看报告：在 Word 预览控件中打开已保存正文（分页只读） */
  const handleView = () => setPreviewMode('report')

  const handleDownload = async () => {
    try {
      const { filename, content } = await exportPcfReport(project.id)
      const blob = new Blob([`\uFEFF${content}`], { type: 'application/msword;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast('已导出报告')
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'error')
    }
  }

  const handleConfirm = async () => {
    try {
      const next = await confirmPcfReport(project.id)
      applyReport(next)
      onSaved({ ...project, status: 'done', currentStep: 5 })
      setConfirmOpen(false)
      toast('报告已确认完成，数据已锁定')
    } catch (error) {
      toast(error instanceof Error ? error.message : '确认失败', 'error')
    }
  }

  /* ---------- 报告版式（Word 预览控件内的分页内容） ---------- */

  /** 章节 id → 正文 映射为 章节 code → 正文（预览按 code 取正文） */
  const toSectionMap = (
    sections: PcfReportDraft['sections'],
    values: Record<string, string>,
  ): Record<string, string> =>
    Object.fromEntries(sections.map((item) => [item.code, values[item.id] ?? item.content]))

  const listColumns: Column<PcfResultDetail>[] = [
    { key: 'opName', title: '工序', width: 70 },
    { key: 'stage', title: '阶段', width: 78 },
    {
      key: 'direction',
      title: '投入/产出',
      width: 70,
      render: (row) => (row.direction === 'input' ? '投入' : '产出'),
    },
    { key: 'flowName', title: '名称', width: 104 },
    {
      key: 'qty',
      title: '数量',
      width: 74,
      render: (row) => (row.direction === 'input' ? splitActivity(row.activityText).qty : '—'),
    },
    {
      key: 'unit',
      title: '单位',
      width: 52,
      render: (row) => (row.direction === 'input' ? splitActivity(row.activityText).unit || '—' : '—'),
    },
    { key: 'factorName', title: '排放因子', width: 104, render: (row) => row.factorName || '—' },
    {
      key: 'emission',
      title: '排放量（kgCO₂e）',
      align: 'right',
      render: (row) =>
        row.direction === 'output' && !row.emission ? '不重复计算' : formatNumber(row.emission),
    },
  ]

  const stageColumns: Column<PcfStageSummary>[] = [
    { key: 'stage', title: '生命周期阶段' },
    {
      key: 'emission',
      title: `碳足迹（kgCO₂e / ${system?.unit ?? ''}）`,
      align: 'right',
      render: (row) => formatNumber(row.emission),
    },
    { key: 'ratio', title: '百分比（%）', align: 'right', render: (row) => `${formatNumber(row.ratio)}%` },
  ]

  /**
   * 报告分页（一「页」= 一张 A4 纸张）：
   * 第 1 页 封面 + 一、概况；第 2 页 二、量化目的 + 三、量化范围；
   * 第 3 页 四、清单分析（表 1）；第 4 页 五、影响评价 + 六、结果解释（表 2 + 图 2 占位）。
   *
   * 生成前预览取「草稿 + 当前填写内容」，生成后预览取「已保存报告」，两者版式一致。
   */
  const buildPages = (
    coverData: PcfReportCover,
    systemData: PcfReportSystemBlock,
    sectionMap: Record<string, string>,
  ): ReactNode[] => {
    const stageData: PcfStageSummary[] = [
      ...systemData.stageSummary,
      { stage: '总计', emission: systemData.totalEmission, ratio: 100 },
    ]
    const sectionPara = (code: string) => (
      <p className="pcf-report-para">{sectionMap[code]?.trim() || '——'}</p>
    )
    return [
      <>
        <div className="pcf-report-preview-head">
          <h3 className="pcf-report-preview-title">{coverData.productName} 碳足迹核算报告</h3>
          <p>产品名称：{coverData.productName}　产品规格型号：{coverData.productSpec || '——'}</p>
          <p>
            生产者名称：{coverData.companyName}　报告编号：
            <span className="mono">{coverData.reportNo}</span>
          </p>
          <p>
            出具报告机构：{coverData.issuer || '——'}　日期：{coverData.reportDate || '——'}
          </p>
        </div>

        <h4 className="pcf-report-chapter">一、概况</h4>
        <p className="pcf-report-para">1. 生产者信息</p>
        <div className="pcf-report-kv">
          <Kv label="生产者名称" value={coverData.producerName} />
          <Kv label="地址" value={coverData.address} />
          <Kv label="法定代表人" value={coverData.legalPerson} />
          <Kv label="授权人（联系人）" value={coverData.contactPerson} />
          <Kv label="联系电话" value={coverData.contactPhone} />
          <Kv label="企业概况" value={coverData.companyProfile} />
        </div>
        <p className="pcf-report-para">2. 产品信息</p>
        <div className="pcf-report-kv">
          <Kv label="产品名称" value={coverData.productName} />
          <Kv label="产品功能" value={coverData.productFunction} />
          <Kv label="产品介绍" value={coverData.productIntro} />
          <div className="pcf-report-kv-row">
            <span className="pcf-report-kv-label">产品图片</span>
            <span className="pcf-report-kv-value">
              {coverData.productImage ? (
                <img className="pcf-report-kv-image" src={coverData.productImage} alt="产品图片" />
              ) : (
                '——'
              )}
            </span>
          </div>
        </div>
        <p className="pcf-report-para">3. 量化方法：{systemData.standard}</p>
      </>,

      <>
        <h4 className="pcf-report-chapter">二、量化目的</h4>
        {sectionPara('S02')}

        <h4 className="pcf-report-chapter">三、量化范围</h4>
        <p className="pcf-report-para">
          1. 功能单位或声明单位：以 {systemData.unit} 为功能单位或声明单位。
        </p>
        <p className="pcf-report-para">2. 系统边界：{systemData.boundaryText}</p>
        <p className="pcf-report-para">3. 取舍准则</p>
        {sectionPara('S03C')}
        <p className="pcf-report-para">4. 时间范围：{systemData.period}</p>
      </>,

      <>
        <h4 className="pcf-report-chapter">四、清单分析</h4>
        <p className="pcf-report-para">1. 数据来源说明</p>
        {sectionPara('S04A')}
        <p className="pcf-report-para">2. 分配原则与程序：{systemData.allocation}</p>
        <p className="pcf-report-para">3. 清单结果及计算（表 1）</p>
        <div className="pcf-table-wrap">
          <Table
            columns={listColumns}
            data={systemData.details}
            rowKey={(row) => row.id}
            emptyText="暂无清单数据"
          />
        </div>
        <p className="pcf-report-para">
          合计排放量：{formatNumber(systemData.totalEmission)} kgCO₂e（单位 {systemData.unit}）
        </p>
        <p className="pcf-report-para">4. 数据质量评价</p>
        {sectionPara('S04D')}
      </>,

      <>
        <h4 className="pcf-report-chapter">五、影响评价</h4>
        <p className="pcf-report-para">
          1. 影响类型和特征化因子选择：一般选择 IPCC 给出的 100 年 GWP（全球变暖潜势），采用
          IPCC 第六次评估报告中的推荐值。
        </p>
        <p className="pcf-report-para">
          2. 产品碳足迹结果计算：{coverData.productName} 每声明单位（{systemData.unit}）碳足迹为{' '}
          {formatNumber(systemData.unitEmission)} kgCO₂e（结果版本 V{systemData.resultVersion}）。
        </p>

        <h4 className="pcf-report-chapter">六、结果解释</h4>
        <p className="pcf-report-para">1. 结果说明</p>
        {sectionPara('S06A')}
        <p className="pcf-report-para">
          {coverData.companyName} 生产的 {coverData.productName}，系统边界为 {systemData.boundaryText}
          ，生命周期碳足迹为 {formatNumber(systemData.unitEmission)} kgCO₂e / {systemData.unit}
          。各生命周期阶段的温室气体排放情况如下（表 2）：
        </p>
        <div className="pcf-table-wrap">
          <Table columns={stageColumns} data={stageData} rowKey={(row) => row.stage} emptyText="暂无阶段数据" />
        </div>
        <div className="pcf-report-figure">
          <span>图 2　{coverData.productName} 各生命周期阶段碳排放分布图</span>
          <span className="pcf-report-figure-tip">本期占位（真实图表后置）</span>
        </div>
      </>,
    ]
  }

  /** 预览内容：草稿 / 编辑中取当前填写内容，报告预览取已保存内容 */
  const previewPages: ReactNode[] =
    previewMode === 'draft' && draft && formCover
      ? buildPages(formCover, draft.system, toSectionMap(draft.sections, formSections))
      : previewMode === 'edit' && report && formCover && system
        ? buildPages(formCover, system, toSectionMap(report.sections, formSections))
        : previewMode === 'report' && report && cover && system
          ? buildPages(cover, system, toSectionMap(report.sections, sectionText))
          : []

  /** 未落库 / 未保存内容的预览：不可下载 */
  const isUnsavedPreview = previewMode === 'draft' || previewMode === 'edit'
  const previewBadge =
    previewMode === 'draft'
      ? '草稿预览 · 尚未生成报告'
      : previewMode === 'edit'
        ? '预览 · 含未保存修改'
        : 'Word 预览（原型模拟）'

  return (
    <div className="pcf-step-form">
      {/* 生成区（未完成时展示；已完成后报告只读、无生成入口） */}
      {!isDone && (
        <div className="pcf-panel">
          <div className="pcf-panel-head">
            <span className="pcf-panel-title">报告生成</span>
            <span className="pcf-panel-tip">
              生成前需先补充必要信息并可预览确认；「重新生成」将覆盖当前报告内容
            </span>
          </div>
          <div className="pcf-report-gen">
            <span className="pcf-report-gen-label">报告模板</span>
            <Select
              options={templateOptions}
              value={templateId}
              disabled={!!report}
              onChange={(e) => setTemplateId(e.target.value)}
            />
            {canGenerate && (
              <Button variant="primary" onClick={() => void openGenerateForm()} disabled={generating}>
                {generating ? '报告生成中…' : '填写报告信息'}
              </Button>
            )}
            {generating && !report && <span className="pcf-report-gen-hint">正在按模板装配报告…</span>}
          </div>
          {canGenerate && (
            <div className="pcf-report-gen-tip">
              报告正文由模板与核算结果自动装配；点击「填写报告信息」补充企业信息 / 产品信息与说明性章节后，
              可先预览再生成报告。
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="pcf-placeholder">加载中…</div>
      ) : !report ? (
        <div className="pcf-placeholder">
          {generating || project.status === 'reportGenerating'
            ? '报告生成中，请稍候…'
            : isDone
              ? '暂无报告'
              : '尚未生成报告，请点击上方「填写报告信息」，补充完成并预览确认后生成报告'}
        </div>
      ) : (
        <>
          <div className="pcf-form-tip">
            报告已按模板自动填入核算结果，正文与基本信息均以文件形态承载、不在页面平铺；点击「查看报告」
            在 Word 预览控件中查看全文，点击「编辑报告信息」在弹窗中补充企业信息 / 产品信息与说明性章节。
            报告确认完成后不可修改，仅保留查看与下载。
          </div>

          {/* 报告文件卡：正文不平铺，统一在 Word 预览控件中查看 */}
          <div className="pcf-panel">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">报告文件</span>
              <span className="pcf-panel-tip">
                点击「查看报告」在 Word 预览控件中分页查看全文
              </span>
            </div>
            <div className="pcf-report-file">
              <span className="pcf-report-file-icon">W</span>
              <div className="pcf-report-file-main">
                <div className="pcf-report-file-name">{report.fileName}</div>
                <div className="pcf-report-file-meta">
                  <span>报告编号：{report.reportNo}</span>
                  <span>
                    模板：{report.templateName} {report.templateVersion}
                  </span>
                  <span>生成时间：{report.generatedAt}</span>
                  <span>
                    状态：
                    {report.status === 'done' ? (
                      <Tag tone="success">已完成</Tag>
                    ) : report.status === 'reportGenerating' ? (
                      <Tag tone="info">报告生成中</Tag>
                    ) : (
                      <Tag tone="warning">报告编制中</Tag>
                    )}
                  </span>
                </div>
              </div>
              <div className="pcf-report-file-actions">
                <Button variant="primary" onClick={() => void handleView()}>
                  查看报告
                </Button>
                <Button onClick={() => void handleDownload()}>下载报告</Button>
                <Button onClick={() => void openEditForm()}>
                  {isEditing ? '编辑报告信息' : '查看报告信息'}
                </Button>
                {isEditing && (
                  <Button onClick={() => setRegenOpen(true)} disabled={generating || saving}>
                    重新生成
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 动作区：正文与基本信息均不在页面平铺，编辑统一走弹窗 */}
          <div className="pcf-report-actions">
            {isEditing && (
              <Button variant="primary" onClick={() => setConfirmOpen(true)} disabled={saving}>
                确认完成
              </Button>
            )}
          </div>
        </>
      )}

      {/* 报告信息弹窗：生成前填写 / 生成后编辑或查看（正文与基本信息均不在页面平铺） */}
      <Modal
        open={formMode !== null}
        title={formMode === 'create' ? '填写报告信息' : isEditing ? '编辑报告信息' : '查看报告信息'}
        size="lg"
        onClose={() => setFormMode(null)}
        footer={
          formMode === 'create' ? (
            <>
              <Button onClick={() => setFormMode(null)} disabled={generating}>
                取消
              </Button>
              <Button onClick={fillDemo} disabled={generating}>
                填充示例内容
              </Button>
              <Button onClick={handleDraftPreview} disabled={generating}>
                预览报告
              </Button>
              <Button variant="primary" onClick={() => void handleDraftGenerate()} disabled={generating}>
                {generating ? '生成中…' : '生成报告'}
              </Button>
            </>
          ) : isEditing ? (
            <>
              <Button onClick={() => setFormMode(null)} disabled={saving}>
                取消
              </Button>
              <Button onClick={handleEditPreview} disabled={saving}>
                预览报告
              </Button>
              <Button variant="primary" onClick={() => void handleEditSave()} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setFormMode(null)}>
              关闭
            </Button>
          )
        }
      >
        {formMode === 'create' ? (
          <>
            <div className="pcf-form-tip">
              报告正文由模板与核算结果自动装配，以下信息需企业补充；带{' '}
              <em className="pcf-report-req">*</em>{' '}
              为必填项。填写完成后点击「预览报告」核对版式与内容，确认无误再点击「生成报告」。
            </div>
            {draft && formCover ? (
              <ReportInfoForm
                cover={formCover}
                sections={draft.sections}
                sectionText={formSections}
                errors={formErrors}
                templateLabel={`${templates.find((item) => item.templateId === templateId)?.templateName ?? '——'}（${
                  templates.find((item) => item.templateId === templateId)?.templateVersion ?? '——'
                }）`}
                reportNoText="生成后由系统自动编号"
                onChangeCover={(patch) => setFormCover((prev) => (prev ? { ...prev, ...patch } : prev))}
                onChangeSection={(id, value) =>
                  setFormSections((prev) => ({ ...prev, [id]: value }))
                }
              />
            ) : (
              <div className="pcf-placeholder">加载中…</div>
            )}
          </>
        ) : report && formCover ? (
          <ReportInfoForm
            cover={formCover}
            sections={report.sections}
            sectionText={formSections}
            errors={formErrors}
            readOnly={!isEditing}
            templateLabel={`${report.templateName}（${report.templateVersion}）`}
            reportNoText={report.reportNo}
            onChangeCover={(patch) => setFormCover((prev) => (prev ? { ...prev, ...patch } : prev))}
            onChangeSection={(id, value) => setFormSections((prev) => ({ ...prev, [id]: value }))}
          />
        ) : (
          <div className="pcf-placeholder">加载中…</div>
        )}
      </Modal>

      {/* 报告预览：Word 控件（原型模拟 Office 在线阅读器）；草稿预览不可下载 */}
      <PcfWordPreview
        open={previewMode !== null}
        fileName={
          previewMode === 'draft'
            ? draft?.fileName ?? '产品碳足迹报告.doc'
            : report?.fileName ?? '产品碳足迹报告.doc'
        }
        badge={previewBadge}
        pages={previewPages}
        onClose={() => setPreviewMode(null)}
        onDownload={isUnsavedPreview ? undefined : () => void handleDownload()}
      />

      {/* 重新生成二次确认（覆盖当前报告内容，R-059） */}
      <Modal
        open={regenOpen}
        title="确认重新生成报告"
        size="sm"
        onClose={() => setRegenOpen(false)}
        footer={
          <>
            <Button onClick={() => setRegenOpen(false)}>取消</Button>
            <Button variant="primary" onClick={() => void runGenerate()}>
              确认重新生成
            </Button>
          </>
        }
      >
        <p>重新生成将按当前核算结果重新装配报告，并覆盖已补充的企业信息与已编辑的说明性内容，是否继续？</p>
      </Modal>

      {/* 确认完成二次确认（确认后锁定，R-063 / R-064） */}
      <Modal
        open={confirmOpen}
        title="确认完成报告"
        size="sm"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button variant="primary" onClick={() => void handleConfirm()}>
              确认完成
            </Button>
          </>
        }
      >
        <p>确认后报告正式版只读，本次产品碳足迹核算已完成，步骤①~④数据不可再修改，仅保留查看与下载。是否确认完成？</p>
      </Modal>
    </div>
  )
}

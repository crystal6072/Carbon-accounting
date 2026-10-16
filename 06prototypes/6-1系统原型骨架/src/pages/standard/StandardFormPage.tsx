import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Input, PageHeader, useToast } from '@/shared/components'
import { createStandard, fetchStandard, fetchStandards, updateStandard } from '@/mock'
import type { StandardPayload } from '@/mock'
import type { StandardAttachment, StandardItem } from '@/types'
import StandardAttachmentPreview from './StandardAttachmentPreview'
import { attachmentSizeText, STANDARD_STATUS_PRESETS } from './standardMeta'
import './StandardPage.css'

interface FormState {
  code: string
  nameZh: string
  nameEn: string
  /** 标准状态：录入框（自由文本）；新建默认「现行」 */
  status: string
  publishDate: string
  implementDate: string
  publisher: string
  /** 来源链接（选填，与附件二选一） */
  sourceUrl: string
  competentDept: string
  responsibleDept: string
  attachments: StandardAttachment[]
}

const EMPTY_FORM: FormState = {
  code: '',
  nameZh: '',
  nameEn: '',
  status: '现行',
  publishDate: '',
  implementDate: '',
  publisher: '',
  sourceUrl: '',
  competentDept: '',
  responsibleDept: '',
  attachments: [],
}

/** 附件上传时间戳（原型按本地时间格式化） */
function nowText(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}`
}

/** 支持在线预览的附件格式（PDF / 图片） */
const PREVIEWABLE_EXT = /\.(pdf|png|jpe?g|gif|webp|bmp|svg)$/i

/** 读取本地文件为 data URL（原型环境用，正式环境由附件管理下发地址） */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

export default function StandardFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [all, setAll] = useState<StandardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  /** 在线预览的附件 */
  const [previewTarget, setPreviewTarget] = useState<StandardAttachment | null>(null)
  /** 附件选择（隐藏的 file input，由按钮触发） */
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAll(await fetchStandards())
      if (isEdit && id) {
        const detail = await fetchStandard(id)
        setForm({
          code: detail.code,
          nameZh: detail.nameZh,
          nameEn: detail.nameEn,
          status: detail.status,
          publishDate: detail.publishDate,
          implementDate: detail.implementDate,
          publisher: detail.publisher,
          sourceUrl: detail.sourceUrl,
          competentDept: detail.competentDept,
          responsibleDept: detail.responsibleDept,
          attachments: detail.attachments.map((att) => ({ ...att })),
        })
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit, toast])

  useEffect(() => {
    void load()
  }, [load])

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const validate = (): string => {
    const nextErrors: Record<string, string> = {}
    if (!form.code.trim()) nextErrors.code = '请输入标准号'
    if (!form.nameZh.trim()) nextErrors.nameZh = '请输入中文标准名称'
    if (!form.status.trim()) nextErrors.status = '请输入标准状态'
    if (!form.publishDate) nextErrors.publishDate = '请选择发布日期'
    if (!form.implementDate) nextErrors.implementDate = '请选择实施日期'
    if (form.publishDate && form.implementDate && form.implementDate < form.publishDate) {
      nextErrors.implementDate = '实施日期不得早于发布日期（D04）'
    }
    if (!form.publisher.trim()) nextErrors.publisher = '请输入发布单位'
    if (form.sourceUrl.trim() && !/^https?:\/\/.+/i.test(form.sourceUrl.trim())) {
      nextErrors.sourceUrl = '来源链接须为合法 URL（http:// 或 https://，D05）'
    }
    if (!form.sourceUrl.trim() && form.attachments.length === 0) {
      nextErrors.sourceUrl = '「来源链接」与「附件」二选一，请至少填写一个（D03）'
    }
    if (all.some((item) => item.id !== id && item.code === form.code.trim())) {
      nextErrors.code = `标准号「${form.code.trim()}」已存在，标准号唯一（R-001 / D01）`
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length > 0 ? '请先完善必填项' : ''
  }

  const buildPayload = (): StandardPayload => ({
    code: form.code.trim(),
    nameZh: form.nameZh.trim(),
    nameEn: form.nameEn.trim(),
    status: form.status.trim(),
    publishDate: form.publishDate,
    implementDate: form.implementDate,
    publisher: form.publisher.trim(),
    sourceUrl: form.sourceUrl.trim(),
    competentDept: form.competentDept.trim(),
    responsibleDept: form.responsibleDept.trim(),
    attachments: form.attachments.map((att) => ({ ...att })),
  })

  const submit = async () => {
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateStandard(id, buildPayload())
        toast('保存成功')
        navigate(`/basic/standard/${id}`)
      } else {
        const created = await createStandard(buildPayload())
        toast('保存成功')
        navigate(`/basic/standard/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (validate()) {
      toast('请先完善必填项', 'error')
      return
    }
    await submit()
  }

  const handleAttachPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const picked: StandardAttachment[] = await Promise.all(
      Array.from(files).map(async (file, index) => ({
        id: `ATT${Date.now().toString().slice(-6)}-${index}`,
        name: file.name,
        size: file.size,
        uploadedAt: nowText(),
        // PDF / 图片读取为 data URL，支持在线预览；其余格式不携带预览内容
        url: PREVIEWABLE_EXT.test(file.name) ? await readAsDataURL(file) : undefined,
      })),
    )
    updateForm({ attachments: [...form.attachments, ...picked] })
  }

  const removeAttachment = (attId: string) =>
    updateForm({ attachments: form.attachments.filter((att) => att.id !== attId) })

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumb={['系统管理', '基础库', '标准文件库']}
          title={isEdit ? '编辑标准文件' : '新增标准文件'}
        />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '基础库', '标准文件库', isEdit ? '编辑标准文件' : '新增标准文件']}
        title={isEdit ? '编辑标准文件' : '新增标准文件'}
        description={
          isEdit ? '标准号唯一；「来源链接」与「附件」二选一（D03）' : '一个标准号 = 一条记录；新建默认「现行」'
        }
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="standard-stack">
        <section className="card">
          <div className="standard-section-header">
            <span className="standard-section-title">基本信息</span>
          </div>
          <div className="standard-section-body">
            <div className="form-grid">
              <FormField label="标准号" required error={errors.code} annTarget="standard.form.code" hint="含年份，如 GB/T 24067-2024、ISO 14067:2018">
                <Input
                  value={form.code}
                  placeholder="如 GB/T 24067-2024"
                  invalid={!!errors.code}
                  onChange={(e) => updateForm({ code: e.target.value })}
                />
              </FormField>
              <FormField
                label="标准状态"
                required
                error={errors.status}
                annTarget="standard.form.status"
                hint={`录入框，自由文本；常用：${STANDARD_STATUS_PRESETS.join(' / ')}`}
              >
                <Input
                  value={form.status}
                  placeholder="如 现行"
                  invalid={!!errors.status}
                  onChange={(e) => updateForm({ status: e.target.value })}
                />
              </FormField>
              <FormField label="中文标准名称" required error={errors.nameZh} full annTarget="standard.form.nameZh">
                <Input
                  value={form.nameZh}
                  placeholder="如 温室气体 产品碳足迹 量化要求和指南"
                  invalid={!!errors.nameZh}
                  onChange={(e) => updateForm({ nameZh: e.target.value })}
                />
              </FormField>
              <FormField label="英文标准名称" error={errors.nameEn} full annTarget="standard.form.nameEn">
                <Input
                  value={form.nameEn}
                  placeholder="如 Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification"
                  invalid={!!errors.nameEn}
                  onChange={(e) => updateForm({ nameEn: e.target.value })}
                />
              </FormField>
              <FormField label="发布日期" required error={errors.publishDate} annTarget="standard.form.publishDate">
                <Input
                  type="date"
                  value={form.publishDate}
                  invalid={!!errors.publishDate}
                  onChange={(e) => updateForm({ publishDate: e.target.value })}
                />
              </FormField>
              <FormField label="实施日期" required error={errors.implementDate} annTarget="standard.form.implementDate" hint="须 ≥ 发布日期（D04）">
                <Input
                  type="date"
                  value={form.implementDate}
                  invalid={!!errors.implementDate}
                  onChange={(e) => updateForm({ implementDate: e.target.value })}
                />
              </FormField>
              <FormField label="发布单位" required error={errors.publisher} full annTarget="standard.form.publisher">
                <Input
                  value={form.publisher}
                  placeholder="如 国家市场监督管理总局、国家标准化管理委员会"
                  invalid={!!errors.publisher}
                  onChange={(e) => updateForm({ publisher: e.target.value })}
                />
              </FormField>
              <FormField label="主管部门" annTarget="standard.form.competentDept">
                <Input
                  value={form.competentDept}
                  placeholder="如 国家标准化管理委员会"
                  onChange={(e) => updateForm({ competentDept: e.target.value })}
                />
              </FormField>
              <FormField label="归口部门" annTarget="standard.form.responsibleDept">
                <Input
                  value={form.responsibleDept}
                  placeholder="如 全国环境管理标准化技术委员会（SAC/TC 207）"
                  onChange={(e) => updateForm({ responsibleDept: e.target.value })}
                />
              </FormField>
              <FormField
                label="来源链接"
                error={errors.sourceUrl}
                full
                annTarget="standard.form.sourceUrl"
                hint="选填；与「附件」二选一（至少填一个，D03）；须为 http/https 链接"
              >
                <Input
                  value={form.sourceUrl}
                  placeholder="如 https://openstd.samr.gov.cn/..."
                  invalid={!!errors.sourceUrl}
                  onChange={(e) => updateForm({ sourceUrl: e.target.value })}
                />
              </FormField>
            </div>
          </div>
          <div className="standard-section-body standard-section-tip">
            标准状态为录入框（自由文本），常用取值：现行（新建默认）/ 被替代 / 作废。标准号含年份，不再单独维护版本。必填：
            标准号 / 中文标准名称 / 标准状态 / 发布日期 / 实施日期 / 发布单位。
          </div>
        </section>

        <section className="card" data-ann-target="standard.form.attachments">
          <div className="standard-section-header">
            <span className="standard-section-title">标准文件附件</span>
            <span className="toolbar-tip">选填 · 可多个 · 与「来源链接」二选一</span>
          </div>
          <div className="standard-section-body">
            {form.attachments.length > 0 && (
              <div className="standard-attach-list">
                {form.attachments.map((att) => (
                  <div className="standard-attach-item" key={att.id}>
                    <span className="standard-attach-name" title={att.name}>
                      {att.name}
                    </span>
                    <span className="standard-attach-meta">
                      {attachmentSizeText(att.size)} · {att.uploadedAt}
                    </span>
                    <button className="link" onClick={() => setPreviewTarget(att)}>
                      在线预览
                    </button>
                    <button className="link link-danger" onClick={() => removeAttachment(att.id)}>
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="standard-attach-picker">
              <input
                ref={fileRef}
                type="file"
                multiple
                onChange={(e) => {
                  void handleAttachPick(e.target.files)
                  e.target.value = ''
                }}
              />
              <Button size="small" onClick={() => fileRef.current?.click()}>
                选择附件
              </Button>
            </div>
            <div className="standard-attach-tip">
              附件缺失不影响模型绑定、核算与报告（核算基于元数据与来源链接，A4）。GB/T 与 ISO
              标准文本受版权保护：仅限企业内部查阅，不得作为对外交付物、不得跨租户共享（A3 / A6）。
            </div>
          </div>
        </section>

        <section className="card">
          <div className="standard-form-footer">
            <Button data-ann-target="standard.form.cancel" onClick={() => navigate(-1)}>取消</Button>
            <Button variant="primary" data-ann-target="standard.form.save" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </div>
        </section>
      </div>

      <StandardAttachmentPreview
        open={!!previewTarget}
        attachment={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </>
  )
}

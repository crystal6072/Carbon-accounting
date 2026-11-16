import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Icon, Input, PageHeader, RichTextEditor, Select, Textarea, useToast } from '@/shared/components'
import { canMaintainKnowledge, createCase, fetchCase, updateCase } from '@/mock'
import type { CarbonCase } from '@/types'
import { CASE_TYPE_OPTIONS } from './caseLibraryMeta'
import './CaseLibraryPage.css'

interface FormState {
  caseName: string
  caseType: 'reduction' | 'accounting' | 'optimization' | ''
  industry: string
  subjectName: string
  reductionAmount: string
  coverUrl: string
  summary: string
  content: string
  attachmentUrl: string
  attachmentName: string
  linkUrl: string
}

const EMPTY_FORM: FormState = {
  caseName: '',
  caseType: '',
  industry: '',
  subjectName: '',
  reductionAmount: '',
  coverUrl: '',
  summary: '',
  content: '',
  attachmentUrl: '',
  attachmentName: '',
  linkUrl: '',
}

/** 读取本地文件为 data URL（原型环境用；生产由附件管理下发地址） */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

export default function CaseLibraryFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [item, setItem] = useState<CarbonCase | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const detail = await fetchCase(id)
      setItem(detail)
      setForm({
        caseName: detail.caseName,
        caseType: detail.caseType,
        industry: detail.industry,
        subjectName: detail.subjectName,
        reductionAmount: detail.reductionAmount == null ? '' : String(detail.reductionAmount),
        coverUrl: detail.coverUrl,
        summary: detail.summary,
        content: detail.content,
        attachmentUrl: detail.attachmentUrl,
        attachmentName: detail.attachmentName,
        linkUrl: detail.linkUrl || '',
      })
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.caseName.trim()) next.caseName = '请输入案例名称'
    if (!form.caseType) next.caseType = '请选择案例类型'
    if (!form.industry.trim()) next.industry = '请输入所属行业'
    if (!form.content.trim()) next.content = '请输入详情内容'
    if (form.summary.length > 200) next.summary = '摘要不超过 200 字'
    if (form.reductionAmount !== '' && Number.isNaN(Number(form.reductionAmount))) {
      next.reductionAmount = '减排量必须为数字'
    }
    setErrors(next)
    return Object.keys(next).length > 0
  }

  const buildPayload = () => ({
    caseName: form.caseName,
    caseType: form.caseType as 'reduction' | 'accounting' | 'optimization',
    industry: form.industry,
    subjectName: form.subjectName,
    reductionAmount: form.reductionAmount === '' ? null : Number(form.reductionAmount),
    coverUrl: form.coverUrl,
    summary: form.summary,
    content: form.content,
    attachmentUrl: form.attachmentUrl,
    attachmentName: form.attachmentName,
    linkUrl: form.linkUrl.trim(),
  })

  const submit = async () => {
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateCase(id, buildPayload())
        toast('保存成功')
        navigate(`/case/library/${id}`)
      } else {
        const created = await createCase(buildPayload())
        toast('保存成功')
        navigate(`/case/library/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (validate()) {
      toast('请先完善必填项', 'error')
      return
    }
    void submit()
  }

  const handleAttachmentPick = async (files: File[] | null) => {
    if (!files || files.length === 0) return
    try {
      const url = await readFileAsDataURL(files[0])
      updateForm({ attachmentUrl: url, attachmentName: files[0].name })
    } catch (error) {
      toast(error instanceof Error ? error.message : '附件读取失败', 'error')
    }
  }

  const handleCoverPick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件', 'error')
      return
    }
    try {
      const url = await readFileAsDataURL(file)
      updateForm({ coverUrl: url })
    } catch (error) {
      toast(error instanceof Error ? error.message : '封面上传失败', 'error')
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '碳核算知识库', '典型案例库', isEdit ? '编辑案例' : '新增案例']} title={isEdit ? '编辑案例' : '新增案例'} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '碳核算知识库', '典型案例库', isEdit ? '编辑案例' : '新增案例']}
        title={isEdit ? '编辑案例' : '新增案例'}
        description="内容由平台运营统一维护；发布后企业业务端只读查阅"
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="case-form-stack">
        <section className="card">
          <div className="case-section-header"><span className="case-section-title">基础信息</span></div>
          <div className="case-section-body">
            <div className="form-grid">
              <FormField label="案例名称" required error={errors.caseName} full>
                <Input value={form.caseName} placeholder="如 竹制品行业减排标杆案例" invalid={!!errors.caseName} onChange={(e) => updateForm({ caseName: e.target.value })} />
              </FormField>
              <FormField label="案例类型" required error={errors.caseType}>
                <Select
                  value={form.caseType}
                  placeholder="请选择类型"
                  options={CASE_TYPE_OPTIONS}
                  invalid={!!errors.caseType}
                  onChange={(e) => updateForm({ caseType: e.target.value as FormState['caseType'] })}
                />
              </FormField>
              <FormField label="所属行业" required error={errors.industry}>
                <Input value={form.industry} placeholder="如 木材加工和木、竹、藤、棕、草制品业" invalid={!!errors.industry} onChange={(e) => updateForm({ industry: e.target.value })} />
              </FormField>
              <FormField label="实施主体 / 企业名称">
                <Input value={form.subjectName} placeholder="如 某竹业集团" onChange={(e) => updateForm({ subjectName: e.target.value })} />
              </FormField>
              <FormField label="年减排量(tCO2e)" error={errors.reductionAmount}>
                <Input value={form.reductionAmount} placeholder="选填，如 12500.5" invalid={!!errors.reductionAmount} onChange={(e) => updateForm({ reductionAmount: e.target.value })} />
              </FormField>
              <FormField label="链接配置（选填）">
                <Input value={form.linkUrl} placeholder="选填，如 https://example.com/report" onChange={(e) => updateForm({ linkUrl: e.target.value })} />
              </FormField>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="case-section-header"><span className="case-section-title">展示与内容</span></div>
          <div className="case-section-body">
            <div className="form-grid">
              <FormField label="封面图" full>
                <div
                  className={`case-cover-drop${form.coverUrl ? ' has-img' : ''}`}
                  onClick={() => coverRef.current?.click()}
                >
                  {form.coverUrl ? (
                    <>
                      <img src={form.coverUrl} alt="封面" className="case-cover-drop-img" />
                      <button
                        type="button"
                        className="case-cover-drop-remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          updateForm({ coverUrl: '' })
                        }}
                      >
                        移除
                      </button>
                    </>
                  ) : (
                    <div className="case-cover-drop-empty">
                      <Icon name="bookmark" size={30} />
                      <span className="case-cover-drop-text">点击上传封面图</span>
                      <span className="case-cover-drop-tip">建议尺寸 16:9，支持 JPG / PNG</span>
                    </div>
                  )}
                  <input
                    ref={coverRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => { void handleCoverPick(e.target.files); e.target.value = '' }}
                  />
                </div>
              </FormField>
              <FormField label="案例摘要" error={errors.summary} full>
                <Textarea
                  value={form.summary}
                  placeholder="一句话概述（限 200 字）"
                  maxLength={200}
                  rows={2}
                  invalid={!!errors.summary}
                  onChange={(e) => updateForm({ summary: e.target.value })}
                />
                <div className="case-char-count">{form.summary.length}/200</div>
              </FormField>
              <FormField label="详情内容（富文本）" required error={errors.content} full>
                <RichTextEditor
                  value={form.content}
                  placeholder="录入案例详情：项目背景、核算边界、优化措施等，支持图文混排与表格"
                  invalid={!!errors.content}
                  minHeight={400}
                  showCount
                  onChange={(html) => updateForm({ content: html })}
                />
              </FormField>
              <FormField label="案例报告（PDF 附件）" full>
                <div className="case-attachment">
                  <div className="case-attachment-row">
                    <span className="case-attachment-name">{form.attachmentName || '未上传附件'}</span>
                    <div className="case-attachment-actions">
                      <input ref={fileRef} type="file" accept=".pdf" hidden onChange={(e) => { void handleAttachmentPick(Array.from(e.target.files ?? [])); e.target.value = '' }} />
                      <Button size="small" onClick={() => fileRef.current?.click()}>选择 PDF</Button>
                      {form.attachmentUrl && (
                        <Button size="small" variant="ghost" onClick={() => updateForm({ attachmentUrl: '', attachmentName: '' })}>移除</Button>
                      )}
                    </div>
                  </div>
                </div>
              </FormField>
            </div>
          </div>
        </section>

        <div className="case-form-footer">
          {!canMaintainKnowledge() && <span className="toolbar-tip">企业端只读，内容由平台运营统一维护</span>}
          <Button onClick={() => navigate(-1)}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !canMaintainKnowledge()}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
    </>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Icon, Input, PageHeader, RichTextEditor, Select, useToast } from '@/shared/components'
import {
  canMaintainKnowledge,
  createBambooCarbonTopic,
  fetchBambooCarbonTopic,
  updateBambooCarbonTopic,
} from '@/mock'
import type { BambooCarbonAttachment, BambooCarbonCategory, BambooCarbonTopic } from '@/types'
import { BAMBOO_CATEGORY_OPTIONS } from './bambooCarbonMeta'
import './BambooCarbonPage.css'

interface FormState {
  title: string
  category: BambooCarbonCategory | ''
  summary: string
  coverUrl: string
  content: string
  attachments: BambooCarbonAttachment[]
  /** 外部链接（选填）：配置后业务前端提供跳转入口 */
  link: string
}

const EMPTY_FORM: FormState = {
  title: '',
  category: '',
  summary: '',
  coverUrl: '',
  content: '',
  attachments: [],
  link: '',
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

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function BambooCarbonFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [topic, setTopic] = useState<BambooCarbonTopic | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const coverRef = useRef<HTMLInputElement>(null)
  const attachRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const detail = await fetchBambooCarbonTopic(id)
      setTopic(detail)
      setForm({
        title: detail.title,
        category: detail.category,
        summary: detail.summary,
        coverUrl: detail.coverUrl,
        content: detail.content,
        attachments: detail.attachments ?? [],
        link: detail.link,
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
    if (!form.title.trim()) next.title = '请输入文章标题'
    if (!form.category) next.category = '请选择所属分类'
    if (!form.content.trim()) next.content = '请输入富文本正文'
    setErrors(next)
    return Object.keys(next).length > 0
  }

  const buildPayload = () => ({
    title: form.title,
    category: form.category as BambooCarbonCategory,
    summary: form.summary,
    coverUrl: form.coverUrl,
    content: form.content,
    attachments: form.attachments,
    link: form.link.trim(),
  })

  const submit = async () => {
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateBambooCarbonTopic(id, buildPayload())
        toast('保存成功')
        navigate(`/basic/bamboo-carbon/${id}`)
      } else {
        const created = await createBambooCarbonTopic(buildPayload())
        toast('保存成功（已自动发布）')
        navigate(`/basic/bamboo-carbon/${created.id}`)
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

  const handleCoverPick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    try {
      const url = await readFileAsDataURL(file)
      updateForm({ coverUrl: url })
    } catch (error) {
      toast(error instanceof Error ? error.message : '封面上传失败', 'error')
    }
  }

  const handleAttachments = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const added: BambooCarbonAttachment[] = []
      for (const file of Array.from(files)) {
        const url = await readFileAsDataURL(file)
        added.push({ id: `att-${Date.now()}-${added.length}`, name: file.name, url, size: file.size, type: file.type })
      }
      updateForm({ attachments: [...form.attachments, ...added] })
    } catch (error) {
      toast(error instanceof Error ? error.message : '附件上传失败', 'error')
    }
  }

  const removeAttachment = (attId: string) => {
    updateForm({ attachments: form.attachments.filter((a) => a.id !== attId) })
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '碳核算知识库', '木竹碳专题库', isEdit ? '编辑文章' : '新增文章']} title={isEdit ? '编辑文章' : '新增文章'} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '碳核算知识库', '木竹碳专题库', isEdit ? '编辑文章' : '新增文章']}
        title={isEdit ? '编辑文章' : '新增文章'}
        description="内容由平台运营统一维护；保存即发布，发布后企业业务端只读查阅"
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="bamboo-stack">
        <section className="card">
          <div className="bamboo-section-header">
            <span className="bamboo-section-title">基本信息</span>
          </div>
          <div className="bamboo-section-body">
            <div className="form-grid">
              <FormField label="标题" required error={errors.title} full>
                <Input
                  value={form.title}
                  placeholder="如 竹材碳固存机理与计量方法"
                  invalid={!!errors.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                />
              </FormField>
              <FormField label="所属分类" required error={errors.category}>
                <Select
                  value={form.category}
                  placeholder="请选择分类"
                  options={BAMBOO_CATEGORY_OPTIONS}
                  invalid={!!errors.category}
                  onChange={(e) => updateForm({ category: e.target.value as BambooCarbonCategory })}
                />
              </FormField>
              <FormField label="摘要">
                <Input
                  value={form.summary}
                  placeholder="一句话概述，选填；将作为业务前端列表的导语"
                  onChange={(e) => updateForm({ summary: e.target.value })}
                />
              </FormField>
              <FormField label="链接配置（选填）" full>
                <Input
                  value={form.link}
                  placeholder="外部跳转链接，如 https://...；配置后业务前端展示「访问原文/外部链接」入口"
                  onChange={(e) => updateForm({ link: e.target.value })}
                />
              </FormField>
              <FormField label="封面图" full>
                <div
                  className={`bamboo-cover-drop${form.coverUrl ? ' has-img' : ''}`}
                  onClick={() => coverRef.current?.click()}
                >
                  {form.coverUrl ? (
                    <>
                      <img src={form.coverUrl} alt="封面" className="bamboo-cover-drop-img" />
                      <button
                        type="button"
                        className="bamboo-cover-drop-remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          updateForm({ coverUrl: '' })
                        }}
                      >
                        移除
                      </button>
                    </>
                  ) : (
                    <div className="bamboo-cover-drop-empty">
                      <Icon name="bookmark" size={30} />
                      <span className="bamboo-cover-drop-text">点击上传封面图</span>
                      <span className="bamboo-cover-drop-tip">建议尺寸 16:9，支持 JPG / PNG</span>
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
              <FormField label="富文本正文" required error={errors.content} full>
                <RichTextEditor
                  value={form.content}
                  invalid={!!errors.content}
                  placeholder="支持图文混排、列表、表格、链接、图片上传……"
                  minHeight={400}
                  showCount
                  onChange={(html) => updateForm({ content: html })}
                />
                <div className="bamboo-rich-hint">正文支持富文本编辑：加粗 / 标题 / 列表 / 链接 / 图片 / 表格。</div>
              </FormField>
              <FormField label="附件上传" full>
                <div className="bamboo-attach">
                  <input
                    ref={attachRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => { void handleAttachments(e.target.files); e.target.value = '' }}
                  />
                  <Button size="small" onClick={() => attachRef.current?.click()}>选择文件上传</Button>
                  <span className="bamboo-rich-hint">支持任意格式，业务前端将提供下载（如 .xlsx 工具模板）。</span>
                  {form.attachments.length > 0 && (
                    <ul className="bamboo-attach-list">
                      {form.attachments.map((a) => (
                        <li key={a.id}>
                          <span className="bamboo-attach-name">📎 {a.name}</span>
                          <span className="bamboo-attach-size">{formatSize(a.size)}</span>
                          <button type="button" className="link link-danger" onClick={() => removeAttachment(a.id)}>移除</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </FormField>
            </div>
          </div>
        </section>

        <div className="bamboo-form-footer">
          {!canMaintainKnowledge() && <span className="toolbar-tip">企业端只读，内容由平台运营统一维护</span>}
          <Button onClick={() => navigate(-1)}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !canMaintainKnowledge()}>
            {submitting ? '保存中…' : '保存并发布'}
          </Button>
        </div>
      </div>
    </>
  )
}

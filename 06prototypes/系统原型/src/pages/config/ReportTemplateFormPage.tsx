import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Modal, PageHeader, RichTextEditor, Select, Textarea, useToast } from '@/shared/components'
import {
  INDUSTRY_OPTIONS,
  REPORT_TEMPLATES,
  saveReportTemplate,
  type ReportTemplate,
  type TemplateField,
} from '@/mock/config'
import './config.css'

const TYPE_OPTS = [
  { label: '碳足迹报告', value: '碳足迹报告' },
  { label: '碳标签报告', value: '碳标签报告' },
]
const INDUSTRY_OPTS = [{ label: '全行业', value: '' }, ...INDUSTRY_OPTIONS]

/** 预览取值：按取值字段编码填演示值，不写入模板 */
const PREVIEW_VALUES: Record<string, string> = {
  PRODUCT_NAME: '整竹砧板 ZB13002',
  PRODUCT_SPEC: 'Φ280 × 20 mm',
  PRODUCER: '示例竹业有限公司',
  STANDARD: 'GB/T 24067-2024',
  BOUNDARY: '摇篮到大门',
  FUNCTIONAL_UNIT: '1 件整竹砧板',
  UNIT_EMISSION: '2.36 kgCO₂e/件',
  TOTAL_EMISSION: '23,600 kgCO₂e',
  REPORT_NO: 'PCF-2026-0001',
}

/** 原型内存态：保存后的正文 HTML 在页面间暂存 */
const BODY_CACHE = new Map<string, string>()

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 取值字段标签：插入正文后只读，由系统按编码取值 */
const chipHtml = (f: TemplateField) =>
  `<span class="field-chip" contenteditable="false" data-locked="1" data-field-code="${f.code}">${escapeHtml(f.label)}<span class="field-chip-code">{{${f.code}}}</span></span>`

/** 章节内容块 → 富文本 HTML */
function toEditorHtml(tpl: ReportTemplate): string {
  return tpl.sections
    .map((s) => {
      const head = `<h3>${escapeHtml(s.title)}${s.locked ? ' <span class="ed-sec-lock">系统装配 · 只读</span>' : ''}</h3>`
      const body = s.blocks
        .map((b) => {
          if (b.kind === 'text') return escapeHtml(b.content)
          if (b.kind === 'field') {
            const f = tpl.fields.find((x) => x.id === b.fieldId)
            return f ? chipHtml(f) : ''
          }
          return `<span class="system-block" contenteditable="false" data-locked="1">${escapeHtml(b.label)}</span>`
        })
        .join('')
      return `${head}<p>${body || '<br/>'}</p>`
    })
    .join('')
}

/** 预览：把只读标签替换为演示取值 */
function toPreviewHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll<HTMLElement>('[data-field-code]').forEach((el) => {
    const code = el.getAttribute('data-field-code') ?? ''
    const val = document.createElement('span')
    val.className = 'preview-value'
    val.textContent = PREVIEW_VALUES[code] ?? `〔${code}〕`
    el.replaceWith(val)
  })
  return tmp.innerHTML
}

function blank(name = '', templateType: ReportTemplate['templateType'] = '碳足迹报告', industry = ''): ReportTemplate {
  return {
    id: `RPT-${Date.now()}`,
    templateNo: `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
    name,
    templateType,
    industry,
    boundary: '全部',
    standardNo: '',
    standardName: '不限标准',
    source: '自定义',
    status: 'disabled',
    version: 1,
    fields: [],
    sections: [],
    updatedAt: new Date().toLocaleString('zh-CN').slice(0, 16).replace('/', '-'),
  }
}

const cloneSections = (src: ReportTemplate): ReportTemplate['sections'] => {
  const stamp = Date.now()
  return src.sections.map((s, si) => ({
    ...s,
    id: `${s.id}-copy${stamp}-${si}`,
    blocks: s.blocks.map((b, bi) => ({ ...b, id: `${b.id}-copy${stamp}-${si}-${bi}` })),
  }))
}

export default function ReportTemplateFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const readonly = !loc.pathname.includes('/edit') && !loc.pathname.endsWith('/new') && id !== undefined
  const [tpl, setTpl] = useState<ReportTemplate>(blank())
  const [bodyHtml, setBodyHtml] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const editorWrapRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)

  useEffect(() => {
    const copyId = new URLSearchParams(loc.search).get('copy')
    if (copyId) {
      const src = REPORT_TEMPLATES.find((t) => t.id === copyId)
      if (src) {
        const copy = {
          ...blank(`${src.name} 副本`, src.templateType, src.industry),
          sourceTemplateId: src.id,
          fields: src.fields.map((f) => ({ ...f })),
          sections: cloneSections(src),
          remark: src.remark,
        }
        setTpl(copy)
        setBodyHtml(toEditorHtml(copy))
      }
    } else if (id) {
      const found = REPORT_TEMPLATES.find((t) => t.id === id)
      if (found) {
        const detail = {
          ...found,
          fields: found.fields.map((f) => ({ ...f })),
          sections: found.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b })) })),
        }
        setTpl(detail)
        setBodyHtml(BODY_CACHE.get(found.id) ?? toEditorHtml(detail))
      }
    } else {
      setBodyHtml('')
    }
    setLoaded(true)
  }, [id, loc.search])

  const isPreset = tpl.source === '系统预置'
  const canEdit = !readonly && !isPreset

  const setField = <K extends keyof ReportTemplate>(k: K, v: ReportTemplate[K]) => {
    setTpl((p) => ({ ...p, [k]: v }))
  }

  /** 记住编辑器内光标，点击左侧标签后仍可插回原位置 */
  const rememberSelection = () => {
    const el = editorWrapRef.current?.querySelector('.rich-editor-content')
    const sel = window.getSelection()
    if (el && sel && sel.rangeCount > 0 && sel.anchorNode && el.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const insertField = (f: TemplateField) => {
    if (!canEdit) return
    const el = editorWrapRef.current?.querySelector<HTMLElement>('.rich-editor-content')
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    const range = savedRange.current && el.contains(savedRange.current.commonAncestorContainer)
      ? savedRange.current
      : (() => {
          const r = document.createRange()
          r.selectNodeContents(el)
          r.collapse(false)
          return r
        })()
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.execCommand('insertHTML', false, `${chipHtml(f)}&nbsp;`)
    setBodyHtml(el.innerHTML)
    savedRange.current = null
    toast(`已插入字段「${f.label}」`)
  }

  /** 锁定标签不可被退格 / Delete 删除 */
  const guardLocked = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return
    const node = window.getSelection()?.anchorNode
    const el = (node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement) ?? null
    if (el?.closest('[data-locked="1"]') || el?.previousElementSibling?.hasAttribute('data-locked')) {
      e.preventDefault()
    }
  }

  const handleSave = async () => {
    if (!tpl.name.trim()) {
      setErrors({ name: '请填写模板名称' })
      return toast('请填写模板名称', 'error')
    }
    setErrors({})
    // 写回系统管理后台的报告模板配置，业务前台新增报告下拉可立即读到
    await saveReportTemplate(tpl)
    BODY_CACHE.set(tpl.id, bodyHtml)
    toast('保存成功')
    navigate(`/config/report-template/${tpl.id}`, { replace: true })
  }

  if (!loaded) return <div className="loading">加载中…</div>

  const previewButton = <span data-ann-target="config.report.form.preview"><Button onClick={() => setPreview(true)}>预览最终报告</Button></span>
  const actions = isPreset ? (
    <>
      {previewButton}
      <Button variant="primary" onClick={() => navigate(`/config/report-template/new?copy=${tpl.id}`)}>复制为新模板</Button>
    </>
  ) : canEdit ? (
    <>
      {previewButton}
      <span data-ann-target="config.report.form.save"><Button variant="primary" onClick={handleSave}>保存模板</Button></span>
    </>
  ) : (
    <>
      {previewButton}
      <Button variant="primary" onClick={() => navigate(`/config/report-template/${tpl.id}/edit`)}>编辑模板</Button>
    </>
  )

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '报告模板', canEdit ? '编辑模板' : '查看模板']}
        title={canEdit ? '编辑报告模板' : '报告模板详情'}
        onBack={() => navigate('/config/report-template')}
        actions={actions}
      />

      <div className="card calc-section" data-ann-target="config.report.form.info">
        <div className="card-body">
          <div className="block-title">模板信息</div>
          <div className="summary-box" style={{ marginBottom: 12 }} data-ann-target="config.report.form.locked">
            {isPreset
              ? '系统预置模板只读，需通过「复制为新模板」生成可编辑副本；取值字段标签由研发维护，正文可自由编辑固定文字并插入标签。'
              : '模板编号由系统生成；固定文字与取值字段标签可在模板正文中编辑，字段取值与系统装配由系统维护。'}
          </div>
          <div className="tpl-info-grid">
            <Field label="模板名称" required error={errors.name}>
              {canEdit ? (
                <Input value={tpl.name} invalid={!!errors.name} onChange={(e) => { setField('name', e.target.value); setErrors({}) }} />
              ) : <div className="form-static">{tpl.name}</div>}
            </Field>
            <Field label="模板类型">
              {canEdit ? (
                <Select options={TYPE_OPTS} value={tpl.templateType} onChange={(e) => setField('templateType', e.target.value as ReportTemplate['templateType'])} />
              ) : <div className="form-static">{tpl.templateType}</div>}
            </Field>
            <Field label="适用行业">
              {canEdit ? (
                <Select options={INDUSTRY_OPTS} value={tpl.industry} onChange={(e) => setField('industry', e.target.value)} />
              ) : <div className="form-static">{tpl.industry || '全行业'}</div>}
            </Field>
            <Field label="模板编号">
              <div className="form-static mono">{tpl.templateNo}</div>
            </Field>
            <Field label="模板说明" full>
              {canEdit ? (
                <Textarea value={tpl.remark ?? ''} maxLength={200} placeholder="模板说明（≤200 字）" onChange={(e) => setField('remark', e.target.value)} />
              ) : <div className="form-static">{tpl.remark ?? '-'}</div>}
            </Field>
          </div>
        </div>
      </div>

      <div className="card calc-section" style={{ marginTop: 16 }} data-ann-target="config.report.form.body">
        <div className="card-body">
          <div className="tpl-editor-layout">
            <aside className="tpl-field-panel">
              <div className="tpl-panel-head">
                <span className="tpl-panel-title">取值字段标签</span>
                <span className="tpl-panel-count">{tpl.fields.length} 个</span>
              </div>
              <div className="tpl-panel-tip">
                {canEdit
                  ? '点击标签即可插入到右侧正文的光标处。标签取值由系统维护，插入后不可编辑。'
                  : '只读视图下不可插入标签，复制为新模板后可编辑正文。'}
              </div>
              <div className="tpl-field-list">
                {tpl.fields.length ? (
                  tpl.fields.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      className="tpl-field-item"
                      disabled={!canEdit}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertField(f)}
                    >
                      <span className="tpl-field-item-top">
                        <span className="tpl-field-label">{f.label}</span>
                        <span className="tpl-field-plus">＋</span>
                      </span>
                      <span className="tpl-field-code mono">{`{{${f.code}}}`}</span>
                      <span className="tpl-field-source">{f.source}</span>
                    </button>
                  ))
                ) : (
                  <div className="empty-box">暂无字段标签，请从列表「复制」已有模板。</div>
                )}
              </div>
            </aside>

            <div className="tpl-editor-main">
              <div className="tpl-editor-head">
                <span className="block-title" style={{ marginBottom: 0 }}>模板正文</span>
                <span className="text-tertiary">{canEdit ? '富文本编辑 · 支持加粗 / 标题 / 列表 / 表格 / 插入字段标签' : '只读视图'}</span>
              </div>
              {!bodyHtml ? (
                <div className="empty-box">暂无模板正文。请从列表「复制」已有模板后编辑。</div>
              ) : canEdit ? (
                <div ref={editorWrapRef} onKeyDown={guardLocked} onKeyUp={rememberSelection} onMouseUp={rememberSelection}>
                  <RichTextEditor
                    value={bodyHtml}
                    onChange={setBodyHtml}
                    placeholder="输入报告正文固定文字，或从左侧插入取值字段标签……"
                    minHeight={520}
                    showCount
                  />
                </div>
              ) : (
                <div className="tpl-doc-readonly" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={preview}
        title="预览最终报告"
        size="lg"
        onClose={() => setPreview(false)}
        footer={<Button onClick={() => setPreview(false)}>关闭</Button>}
      >
        <div className="summary-box" style={{ marginBottom: 12 }}>按当前内容生成的报告预览，预览不保存任何修改。</div>
        <div className="preview-doc">
          <div className="preview-doc-title">{tpl.name || '未命名模板'}</div>
          <div className="tpl-doc-readonly" dangerouslySetInnerHTML={{ __html: preview ? toPreviewHtml(bodyHtml) : '' }} />
        </div>
      </Modal>
    </>
  )
}

function Field({ label, required, error, full, children }: { label: string; required?: boolean; error?: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={['form-item', full ? 'form-item-full' : ''].filter(Boolean).join(' ')}>
      <label className={['form-label', required ? 'required' : ''].filter(Boolean).join(' ')}>{label}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

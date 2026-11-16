import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Modal, PageHeader, Select, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { REPORT_TEMPLATES, type ReportSection, type ReportTemplate } from '@/mock/config'
import './config.css'

const BOUNDARY_OPTS = [
  { label: '全部', value: '全部' },
  { label: '摇篮到大门', value: '摇篮到大门' },
  { label: '大门到大门', value: '大门到大门' },
  { label: '摇篮到坟墓', value: '摇篮到坟墓' },
]
const SECTION_TYPE_TONE: Record<ReportSection['type'], 'primary' | 'default' | 'warning'> = {
  系统装配: 'primary',
  可编辑文案: 'default',
  固定文案: 'warning',
}

function blank(name = '', boundary = '全部', standardNo = '', standardName = '不限标准'): ReportTemplate {
  return {
    id: `RPT-${Date.now()}`,
    templateNo: `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
    name,
    boundary: boundary as ReportTemplate['boundary'],
    standardNo,
    standardName,
    source: '自定义',
    status: 'draft',
    version: 1,
    sections: [],
    updatedAt: new Date().toLocaleString('zh-CN').slice(0, 16).replace('/', '-'),
  }
}

export default function ReportTemplateFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const search = loc.search
  const readonly = !loc.pathname.includes('/edit') && !loc.pathname.endsWith('/new') && id !== undefined
  const [tpl, setTpl] = useState<ReportTemplate>(blank())
  const [loaded, setLoaded] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [textModal, setTextModal] = useState<{ idx: number; value: string } | null>(null)
  const dirty = useRef(false)

  useEffect(() => {
    const copyId = new URLSearchParams(search).get('copy')
    if (copyId) {
      const src = REPORT_TEMPLATES.find((t) => t.id === copyId)
      if (src) {
        setTpl({ ...blank(`${src.name} 副本`, src.boundary, src.standardNo, src.standardName), sections: src.sections.map((s) => ({ ...s, id: `${s.id}-copy${Date.now()}` })) })
      }
    } else if (id) {
      const found = REPORT_TEMPLATES.find((t) => t.id === id)
      if (found) setTpl({ ...found, sections: found.sections.map((s) => ({ ...s })) })
    }
    setLoaded(true)
  }, [id, search])

  const isPreed = tpl.source === '系统预置'
  const canEdit = !readonly && !isPreed

  const setField = <K extends keyof ReportTemplate>(k: K, v: ReportTemplate[K]) => {
    dirty.current = true
    setTpl((p) => ({ ...p, [k]: v }))
  }
  const setSections = (s: ReportSection[]) => {
    dirty.current = true
    setTpl((p) => ({ ...p, sections: s }))
  }

  const move = (idx: number, dir: -1 | 1) => {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === tpl.sections.length - 1)) return
    const arr = [...tpl.sections]
    ;[arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]]
    setSections(arr)
  }
  const toggleVisible = (idx: number) => {
    const s = tpl.sections[idx]
    if (s.locked) return toast('该章节为报告必需章节，不可隐藏', 'error')
    setSections(tpl.sections.map((x, i) => (i === idx ? { ...x, visible: !x.visible } : x)))
  }
  const remove = (idx: number) => {
    const s = tpl.sections[idx]
    if (s.locked) return
    setSections(tpl.sections.filter((_, i) => i !== idx))
  }
  const addCustom = () => {
    const n = tpl.sections.filter((s) => s.code.startsWith('CUS-')).length + 1
    setSections([...tpl.sections, { id: `CUS-${Date.now()}`, code: `CUS-${String(n).padStart(3, '0')}`, title: `自定义章节 ${n}`, type: '可编辑文案', visible: true, locked: false, fixedText: '' }])
  }
  const saveText = () => {
    if (!textModal) return
    setSections(tpl.sections.map((s, i) => (i === textModal.idx ? { ...s, fixedText: textModal.value } : s)))
    setTextModal(null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!tpl.name.trim()) e.name = '请填写模板名称'
    const codes = tpl.sections.map((s) => s.code)
    if (new Set(codes).size !== codes.length) e.sections = '章节编码重复'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const handleSave = () => {
    if (!validate()) return toast('共 ' + Object.keys(errors).length + ' 项待修正', 'error')
    toast('保存成功')
    navigate(`/config/report-template/${tpl.id}`, { replace: true })
  }

  if (!loaded) return <div className="loading">加载中…</div>

  const columns: Column<ReportSection>[] = [
    { key: 'order', title: '顺序', width: 80, render: (_s, idx) => <span className="flex gap-xs"><button className="icon-btn" disabled={!canEdit || idx === 0} onClick={() => move(idx, -1)}>↑</button><button className="icon-btn" disabled={!canEdit || idx === tpl.sections.length - 1} onClick={() => move(idx, 1)}>↓</button></span> },
    { key: 'visible', title: '显示', width: 80, align: 'center', render: (s, idx) => (canEdit ? <input type="checkbox" checked={s.visible} onChange={() => toggleVisible(idx)} disabled={s.locked} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} /> : <Tag tone={s.visible ? 'success' : 'default'}>{s.visible ? '显示' : '隐藏'}</Tag>) },
    { key: 'code', title: '章节编码', width: 160, render: (s) => <span className="mono">{s.code}{s.locked && <span className="lock-badge" style={{ marginLeft: 4 }}><LockIcon /></span>}</span> },
    { key: 'title', title: '章节标题', render: (s) => (canEdit && !s.locked ? <Input value={s.title} onChange={(e) => setSections(tpl.sections.map((x, i) => (i === tpl.sections.indexOf(s) ? { ...x, title: e.target.value } : x)))} /> : s.title) },
    { key: 'type', title: '类型', width: 110, align: 'center', render: (s) => <Tag tone={SECTION_TYPE_TONE[s.type]}>{s.type}</Tag> },
    { key: 'text', title: '固定文案', width: 120, render: (s) => (canEdit && s.type === '可编辑文案' ? <button className="link" onClick={() => setTextModal({ idx: tpl.sections.indexOf(s), value: s.fixedText ?? '' })}>编辑文案</button> : s.fixedText ? <span className="cell-ellipsis">{s.fixedText}</span> : <span className="text-tertiary">-（系统装配）</span>) },
    {
      key: 'actions',
      title: '操作',
      width: 80,
      render: (s) => (canEdit && !s.locked ? <button className="link link-danger" onClick={() => remove(tpl.sections.indexOf(s))}>删除</button> : <span className="text-tertiary">不可操作</span>),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '报告模板', canEdit ? '编辑模板' : '查看模板']}
        title={canEdit ? '编辑报告模板' : '报告模板详情'}
        description={isPreed ? '系统预置模板只读，可通过「复制为新模板」进行自定义。' : undefined}
        onBack={() => navigate('/config/report-template')}
        actions={
          isPreed ? (
            <Button variant="primary" onClick={() => navigate(`/config/report-template/new?copy=${tpl.id}`)}>复制为新模板</Button>
          ) : canEdit ? (
            <Button variant="primary" onClick={handleSave}>保存</Button>
          ) : undefined
        }
      />

      <div className="card calc-section">
        <div className="card-body">
          <div className="block-title">基本信息</div>
          <div className="form-grid">
            <Field label="模板名称" required error={errors.name}>
              {canEdit ? <Input value={tpl.name} invalid={!!errors.name} onChange={(e) => { setField('name', e.target.value); setErrors((p) => ({ ...p, name: '' })) }} /> : <div className="form-static">{tpl.name}</div>}
            </Field>
            <Field label="适用边界">
              {canEdit ? <Select options={BOUNDARY_OPTS} value={tpl.boundary} onChange={(e) => setField('boundary', e.target.value as ReportTemplate['boundary'])} /> : <div className="form-static">{tpl.boundary}</div>}
            </Field>
            <Field label="适用标准">
              {canEdit ? <Input value={tpl.standardNo} placeholder="标准号（留空=不限标准）" onChange={(e) => setField('standardNo', e.target.value)} /> : <div className="form-static">{tpl.standardNo || '不限标准'}</div>}
            </Field>
            <Field label="来源">
              <Tag tone={tpl.source === '系统预置' ? 'primary' : 'default'}>{tpl.source}</Tag>
              {tpl.sourceTemplateId && <span className="text-tertiary" style={{ marginLeft: 8 }}>（复制自 {tpl.sourceTemplateId}）</span>}
            </Field>
            <Field label="说明" full>
              {canEdit ? <Textarea value={tpl.remark ?? ''} maxLength={200} placeholder="模板说明（≤200 字）" onChange={(e) => setField('remark', e.target.value)} /> : <div className="form-static">{tpl.remark ?? '-'}</div>}
            </Field>
          </div>
        </div>
      </div>

      <div className="card calc-section" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="subtable-head">
            <span className="block-title" style={{ marginBottom: 0 }}>章节配置（共 {tpl.sections.length} 章，锁定 {tpl.sections.filter((s) => s.locked).length} 章）</span>
            {canEdit && <Button size="small" onClick={addCustom}><PlusIcon /> 添加自定义章节</Button>}
          </div>
          {errors.sections && <div className="form-error" style={{ marginBottom: 8 }}>{errors.sections}</div>}
          <Table columns={columns} data={tpl.sections} rowKey={(s) => s.id} />
          <div className="summary-box" style={{ marginTop: 12 }}>锁定章节为报告必需章节，不可隐藏、不可删除；隐藏的章节在生成报告中不出现。</div>
        </div>
      </div>

      <Modal open={!!textModal} title="编辑固定文案" size="default" onClose={() => setTextModal(null)} footer={<><Button onClick={() => setTextModal(null)}>取消</Button><Button variant="primary" onClick={saveText}>保存</Button></>}>
        <Textarea className="mono" value={textModal?.value ?? ''} maxLength={2000} placeholder="可插入变量：{产品名称} {项目编号} {租户名称}" onChange={(e) => setTextModal((p) => (p ? { ...p, value: e.target.value } : null))} />
        <span className="char-count">{(textModal?.value ?? '').length}/2000</span>
      </Modal>
    </>
  )
}

function Field({ label, required, error, full, children }: { label: string; required?: boolean; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={['form-item', full ? 'form-item-full' : ''].filter(Boolean).join(' ')}>
      <label className={['form-label', required ? 'required' : ''].filter(Boolean).join(' ')}>{label}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
function LockIcon() {
  return <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
}
function PlusIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
}

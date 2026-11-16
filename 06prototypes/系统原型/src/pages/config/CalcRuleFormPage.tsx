import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Input, MultiCascaderSelect, PageHeader, Select, Textarea, useToast } from '@/shared/components'
import { fetchIndustryTreeOptions } from '@/mock'
import type { TreeOption } from '@/types'
import { ALLOC_METHOD_OPTIONS, CALC_RULES, STANDARD_OPTIONS, buildRuleSummary, type CalcRule } from '@/mock/config'
import ConfirmModal from './ConfirmModal'
import './config.css'

const SECTIONS = ['基础信息', '取舍准则', '可忽略排放项', '分配'] as const
type SectionName = (typeof SECTIONS)[number]

function blankRule(): CalcRule {
  return {
    id: `RULE-${Date.now()}`,
    ruleName: '',
    standardNo: '',
    standardName: '',
    standardStatus: '现行',
    applicableIndustry: [],
    status: 'draft',
    remark: '',
    updatedAt: new Date().toLocaleString('zh-CN').slice(0, 16).replace('/', '-'),
    allowExclude: 'yes',
    singleThreshold: 1,
    cumulativeThreshold: 5,
    excludeRemark: '',
    ignoreRule: '',
    allowAllocate: 'yes',
    allocDefault: '质量',
    allocRuleDesc: '',
    changeLogs: [],
  }
}

export default function CalcRuleFormPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const editing = location.pathname.includes('/edit') || location.pathname.endsWith('/new')
  const [rule, setRule] = useState<CalcRule>(blankRule())
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState<SectionName>('基础信息')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmExit, setConfirmExit] = useState(false)
  const [industryTree, setIndustryTree] = useState<TreeOption[]>([])
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (id) {
      const found = CALC_RULES.find((r) => r.id === id)
      if (found) setRule({ ...found })
    }
    setLoaded(true)
  }, [id])

  useEffect(() => {
    void fetchIndustryTreeOptions().then(setIndustryTree)
  }, [])

  const readonly = !editing
  const setField = <K extends keyof CalcRule>(k: K, v: CalcRule[K]) => {
    dirtyRef.current = true
    setRule((p) => ({ ...p, [k]: v }))
  }
  const setError = (k: string, v: string) => setErrors((p) => ({ ...p, [k]: v }))

  const summary = useMemo(() => buildRuleSummary(rule), [rule])

  const scrollTo = (name: SectionName) => {
    setActive(name)
    document.getElementById(`sec-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const collectErrors = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!rule.ruleName.trim()) e.ruleName = '请填写规则名称'
    if (!rule.standardNo) e.standardNo = '请选择标准号'
    return e
  }

  const handleSave = () => {
    const e = collectErrors()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast(`共 ${Object.keys(e).length} 项待修正`, 'error')
      const map: Record<string, SectionName> = { ruleName: '基础信息', standardNo: '基础信息' }
      const firstKey = Object.keys(e)[0]
      if (map[firstKey]) scrollTo(map[firstKey])
      return
    }
    toast('保存成功')
    dirtyRef.current = false
    navigate(`/config/calc-rule/${rule.id}`, { replace: true })
  }

  const handleBack = () => {
    if (dirtyRef.current && editing) setConfirmExit(true)
    else navigate('/config/calc-rule')
  }

  if (!loaded) return <div className="loading">加载中…</div>

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '核算规则', editing ? '编辑规则' : '查看规则']}
        title={editing ? '编辑核算规则' : '核算规则详情'}
        description={readonly ? undefined : rule.standardName}
        onBack={handleBack}
        actions={!readonly ? <span data-ann-target="config.calc.form.save"><Button variant="primary" onClick={handleSave}>保存</Button></span> : undefined}
      />

      {!readonly && (
        <div className="alert alert-info" data-ann-target="config.calc.form.note">
          <IconAlert />
          <span>本配置仅用于标准口径记录与展示，不参与核算求值，不影响核算结果。</span>
        </div>
      )}
      {rule.standardStatus !== '现行' && (
        <div className="alert alert-warning">
          <IconAlert />
          <span>该标准已被「{rule.standardStatus}」，请确认是否继续沿用此规则。</span>
        </div>
      )}

      <div className="calc-layout">
        <div className="calc-nav" data-ann-target="config.calc.form.nav">
          {SECTIONS.map((s) => (
            <button key={s} className={active === s ? 'active' : ''} onClick={() => scrollTo(s)}>
              <span>{s}</span>
              {errors[navErrorKey(s)] && <span className="nav-dot" />}
            </button>
          ))}
          {readonly && <button style={{ cursor: 'default' }}>只读引用</button>}
        </div>

        <div>
          <CardWrap name="基础信息" active={active} onActive={setActive} annTarget="config.calc.form.base">
            <div className="form-grid">
              <Field label="规则名称" required error={errors.ruleName}>
                {readonly ? (
                  <div className="form-static">{rule.ruleName || '-'}</div>
                ) : (
                  <Input value={rule.ruleName} invalid={!!errors.ruleName} onChange={(e) => { setField('ruleName', e.target.value); setError('ruleName', '') }} />
                )}
              </Field>
              <Field label="标准号" required error={errors.standardNo}>
                {readonly || id ? (
                  <div className="form-static mono">{rule.standardNo || '-'}</div>
                ) : (
                  <Select
                    placeholder="请选择标准规范库"
                    options={STANDARD_OPTIONS}
                    value={rule.standardNo}
                    invalid={!!errors.standardNo}
                    onChange={(e) => {
                      const opt = STANDARD_OPTIONS.find((o) => o.value === e.target.value)
                      setRule((p) => ({ ...p, standardNo: e.target.value, standardName: opt?.label.split(' ').slice(1).join(' ') ?? '', standardStatus: '现行' }))
                      setError('standardNo', '')
                    }}
                  />
                )}
              </Field>
              <Field label="标准名称">
                <div className="form-static">{rule.standardName || '-'}</div>
              </Field>
              <Field label="适用行业">
                {readonly ? (
                  <div className="form-static">{rule.applicableIndustry.length ? rule.applicableIndustry.join('、') : '全行业'}</div>
                ) : (
                  <MultiCascaderSelect
                    value={rule.applicableIndustry}
                    options={industryTree}
                    placeholder="请选择适用行业（可多选，空 = 全行业）"
                    searchPlaceholder="搜索行业名称 / 编码"
                    onChange={(v) => setField('applicableIndustry', v)}
                  />
                )}
              </Field>
              <Field label="备注" full>
                {readonly ? (
                  <div className="form-static" style={{ whiteSpace: 'pre-wrap', height: 'auto', alignItems: 'flex-start' }}>{rule.remark || '-'}</div>
                ) : (
                  <>
                    <Textarea rows={3} value={rule.remark} maxLength={500} placeholder="补充说明（≤500 字）" onChange={(e) => setField('remark', e.target.value)} />
                    <span className="char-count">{rule.remark.length}/500</span>
                  </>
                )}
              </Field>
            </div>
          </CardWrap>

          <CardWrap name="取舍准则" active={active} onActive={setActive} annTarget="config.calc.form.exclude">
            <div className="form-grid calc-cutoff-grid">
              <Field label="是否允许舍弃">
                <div className="radio-row">
                  {(['yes', 'no'] as const).map((v) => (
                    <label key={v}><input type="radio" name="allowExclude" checked={rule.allowExclude === v} disabled={readonly} onChange={() => setField('allowExclude', v)} />{v === 'yes' ? '是' : '否'}</label>
                  ))}
                </div>
              </Field>
              <Field label="单环节舍弃阈值(%)">
                {readonly ? <div className="form-static">{rule.singleThreshold ?? '-'}</div> : <Input type="number" value={rule.singleThreshold ?? ''} disabled={rule.allowExclude === 'no'} onChange={(e) => setField('singleThreshold', Number(e.target.value))} />}
              </Field>
              <Field label="舍弃累计上限(%)">
                {readonly ? <div className="form-static">{rule.cumulativeThreshold ?? '-'}</div> : <Input type="number" value={rule.cumulativeThreshold ?? ''} disabled={rule.allowExclude === 'no'} onChange={(e) => setField('cumulativeThreshold', Number(e.target.value))} />}
              </Field>
              <Field label="补充说明" full>
                {readonly ? (
                  <div className="form-static" style={{ whiteSpace: 'pre-wrap', height: 'auto', alignItems: 'flex-start' }}>{rule.excludeRemark || '-'}</div>
                ) : (
                  <>
                    <Textarea rows={3} value={rule.excludeRemark} maxLength={500} onChange={(e) => setField('excludeRemark', e.target.value)} />
                    <span className="char-count">{rule.excludeRemark.length}/500</span>
                  </>
                )}
              </Field>
            </div>
            <div className="summary-box" style={{ marginTop: 12 }}>摘要预览：{summary.split('\n')[0].replace('【取舍准则】', '')}</div>
          </CardWrap>

          <CardWrap name="可忽略排放项" active={active} onActive={setActive} annTarget="config.calc.form.ignore">
            <Field label="可忽略排放项" full>
              {readonly ? (
                <div className="form-static" style={{ whiteSpace: 'pre-wrap', height: 'auto', alignItems: 'flex-start' }}>{rule.ignoreRule || '-'}</div>
              ) : (
                <>
                  <Textarea
                    rows={4}
                    maxLength={500}
                    value={rule.ignoreRule}
                    onChange={(e) => setField('ignoreRule', e.target.value)}
                  />
                  <span className="char-count">{rule.ignoreRule.length}/500</span>
                </>
              )}
            </Field>
          </CardWrap>

          <CardWrap name="分配" active={active} onActive={setActive} annTarget="config.calc.form.alloc">
            <div className="form-item calc-inline-field">
              <label className="form-label">分配方法</label>
              {readonly ? (
                <div className="form-static">{rule.allocDefault || '-'}</div>
              ) : (
                <Select options={ALLOC_METHOD_OPTIONS} value={rule.allocDefault} onChange={(e) => setField('allocDefault', e.target.value)} />
              )}
            </div>
            <Field label="分配规则说明" full>
              {readonly ? (
                <div className="form-static" style={{ whiteSpace: 'pre-wrap', height: 'auto', alignItems: 'flex-start' }}>{rule.allocRuleDesc || '-'}</div>
              ) : (
                <>
                  <Textarea
                    rows={4}
                    maxLength={500}
                    value={rule.allocRuleDesc}
                    onChange={(e) => setField('allocRuleDesc', e.target.value)}
                  />
                  <span className="char-count">{rule.allocRuleDesc.length}/500</span>
                </>
              )}
            </Field>
            <div className="alert alert-tip calc-footer-tip"><IconAlert /><span>实际分配计算在「分配计算」与项目侧执行，本页仅记录标准规定。</span></div>
          </CardWrap>
        </div>
      </div>

      <ConfirmModal
        open={confirmExit}
        title="放弃修改"
        message="当前有未保存的修改，确定离开吗？"
        confirmText="放弃离开"
        danger
        onClose={() => setConfirmExit(false)}
        onConfirm={() => { setConfirmExit(false); dirtyRef.current = false; navigate('/config/calc-rule') }}
      />
    </>
  )
}

/* ===================== 局部组件 ===================== */
function CardWrap({ name, active, onActive, children, annTarget }: { name: SectionName; active: SectionName; onActive: (s: SectionName) => void; children: ReactNode; annTarget?: string }) {
  return (
    <div id={`sec-${name}`} className="card calc-section" data-ann-target={annTarget} onMouseEnter={() => onActive(name)}>
      <div className="calc-section-title"><span>{name}</span></div>
      <div className="card-body">{children}</div>
    </div>
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
function IconAlert() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  )
}
function navErrorKey(s: SectionName): string {
  return (
    {
      基础信息: 'ruleName',
      取舍准则: '',
      可忽略排放项: '',
      分配: '',
    } as Record<SectionName, string>
  )[s]
}

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Input, PageHeader, Select, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  CALC_RULES,
  STANDARD_OPTIONS,
  buildRuleSummary,
  evalExpression,
  type CalcRule,
  type FormulaVar,
  type IgnoreItem,
} from '@/mock/config'
import IgnoreItemModal from './IgnoreItemModal'
import ConfirmModal from './ConfirmModal'
import './config.css'

const SECTIONS = ['基础信息', '取舍准则', '可忽略排放项', 'GWP口径', '计算公式', '分配'] as const
type SectionName = (typeof SECTIONS)[number]

function blankRule(): CalcRule {
  return {
    id: `RULE-${Date.now()}`,
    ruleNo: `RULE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}001`,
    ruleName: '',
    standardNo: '',
    standardName: '',
    standardStatus: '现行',
    applicableIndustry: [],
    status: 'draft',
    revisionNo: 1,
    remark: '',
    updatedAt: new Date().toLocaleString('zh-CN').slice(0, 16).replace('/', '-'),
    allowExclude: 'yes',
    singleThreshold: 1,
    cumulativeThreshold: 5,
    minContribution: 80,
    excludeRemark: '',
    gwpScope: '总量',
    gwpVersion: 'AR6',
    gwpIncludeBio: 'no',
    gwpBioTreatment: '不计入',
    resultUnit: 'kgCO₂e',
    significantDigits: 4,
    formulaMethod: '因子法',
    expression: 'SUM({活动数据} × {排放因子})',
    formulaRemark: '',
    variables: [
      { id: 'v1', name: '活动数据', meaning: '活动量', unit: 'kg', source: '活动数据', sample: 100 },
      { id: 'v2', name: '排放因子', meaning: '单位活动量碳排放', unit: 'kgCO₂e/kg', source: '因子', sample: 2.5 },
    ],
    allocLevels: [
      { name: '避免分配', enabled: true },
      { name: '物理关系', enabled: true },
      { name: '经济价值', enabled: false },
    ],
    allocDefault: '质量',
    byproduct: '分摊法',
    allocNeedReason: 'yes',
    allocClause: '',
    allocRemark: '',
    ignoreItems: [],
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
  const [ignoreModal, setIgnoreModal] = useState<IgnoreItem | null>(null)
  const [editIdx, setEditIdx] = useState<number>(-1)
  const [confirmExit, setConfirmExit] = useState(false)
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (id) {
      const found = CALC_RULES.find((r) => r.id === id)
      if (found)
        setRule({
          ...found,
          ignoreItems: found.ignoreItems.map((i) => ({ ...i })),
          variables: found.variables.map((v) => ({ ...v })),
          allocLevels: found.allocLevels.map((l) => ({ ...l })),
        })
    }
    setLoaded(true)
  }, [id])

  const readonly = !editing
  const setField = <K extends keyof CalcRule>(k: K, v: CalcRule[K]) => {
    dirtyRef.current = true
    setRule((p) => ({ ...p, [k]: v }))
  }
  const setError = (k: string, v: string) => setErrors((p) => ({ ...p, [k]: v }))

  const summary = useMemo(() => buildRuleSummary(rule), [rule])
  const trial = useMemo(() => evalExpression(rule.expression, rule.variables), [rule.expression, rule.variables])

  const scrollTo = (name: SectionName) => {
    setActive(name)
    document.getElementById(`sec-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!rule.ruleName.trim()) e.ruleName = '请填写规则名称'
    if (!rule.standardNo) e.standardNo = '请选择标准号'
    if (rule.gwpIncludeBio === 'no' && rule.gwpBioTreatment === '负值计入') e.gwpBioTreatment = '生物碳不计入时不能选择「负值计入」'
    if (!rule.allocClause.trim()) e.allocClause = '请填写依据条款'
    const varNames = rule.variables.map((v) => v.name)
    if (varNames.some((n) => !n.trim())) e.variables = '变量名不能为空'
    if (new Set(varNames).size !== varNames.length) e.variables = '变量名不可重复'
    const keys = rule.ignoreItems.map((i) => `${i.objectType}|${i.objectCode}`)
    if (new Set(keys).size !== keys.length) e.ignoreItems = '存在重复的「对象类型 + 对象」'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) {
      toast('共 ' + Object.keys(errors).length + ' 项待修正', 'error')
      const firstKey = Object.keys(errors)[0]
      const map: Record<string, SectionName> = {
        ruleName: '基础信息', standardNo: '基础信息', gwpBioTreatment: 'GWP口径', allocClause: '分配', variables: '计算公式', ignoreItems: '可忽略排放项',
      }
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

  const saveIgnore = (item: IgnoreItem) => {
    setRule((p) => {
      const items = [...p.ignoreItems]
      if (editIdx >= 0) items[editIdx] = { ...item, sort: items[editIdx].sort }
      else items.push({ ...item, sort: items.length + 1 })
      return { ...p, ignoreItems: items }
    })
    setIgnoreModal(null)
    setEditIdx(-1)
  }

  const moveAlloc = (idx: number, dir: -1 | 1) => {
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === rule.allocLevels.length - 1)) {
      toast('层级顺序不可颠倒', 'error')
      return
    }
    const arr = [...rule.allocLevels]
    ;[arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]]
    setField('allocLevels', arr)
  }

  if (!loaded) return <div className="loading">加载中…</div>

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '核算规则', editing ? '编辑规则' : '查看规则']}
        title={editing ? '编辑核算规则' : '核算规则详情'}
        description={readonly ? undefined : rule.ruleNo}
        onBack={handleBack}
        actions={!readonly ? <Button variant="primary" onClick={handleSave}>保存</Button> : undefined}
      />

      {!readonly && (
        <div className="alert alert-info">
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
        <div className="calc-nav">
          {SECTIONS.map((s) => (
            <button key={s} className={active === s ? 'active' : ''} onClick={() => scrollTo(s)}>
              <span>{s}</span>
              {errors[navErrorKey(s)] && <span className="nav-dot" />}
            </button>
          ))}
          {readonly && <button style={{ cursor: 'default' }}>只读引用</button>}
        </div>

        <div>
          <CardWrap name="基础信息" active={active} onActive={setActive}>
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
                    placeholder="请选择标准文件库"
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
                  <MultiSelectTags
                    options={[{ label: '竹木制品', value: '竹木制品' }, { label: '人造板', value: '人造板' }, { label: '家具制造', value: '家具制造' }, { label: '造纸和纸制品', value: '造纸和纸制品' }]}
                    value={rule.applicableIndustry}
                    onChange={(v) => setField('applicableIndustry', v)}
                  />
                )}
              </Field>
              <Field label="备注" full>
                {readonly ? <div className="form-static">{rule.remark || '-'}</div> : <Textarea value={rule.remark} maxLength={500} placeholder="补充说明（≤500 字）" onChange={(e) => setField('remark', e.target.value)} />}
              </Field>
            </div>
          </CardWrap>

          <CardWrap name="取舍准则" active={active} onActive={setActive}>
            <div className="form-grid">
              <Field label="是否允许舍弃">
                <div className="radio-row">
                  {(['yes', 'no'] as const).map((v) => (
                    <label key={v}><input type="radio" name="allowExclude" checked={rule.allowExclude === v} disabled={readonly} onChange={() => setField('allowExclude', v)} />{v === 'yes' ? '是' : '否'}</label>
                  ))}
                </div>
              </Field>
              <Field label="必纳入贡献度阈值(%)">
                {readonly ? <div className="form-static">{rule.minContribution ?? '-'}</div> : <Input type="number" value={rule.minContribution ?? ''} disabled={rule.allowExclude === 'no'} onChange={(e) => setField('minContribution', Number(e.target.value))} />}
              </Field>
              <Field label="单环节舍弃阈值(%)">
                {readonly ? <div className="form-static">{rule.singleThreshold ?? '-'}</div> : <Input type="number" value={rule.singleThreshold ?? ''} disabled={rule.allowExclude === 'no'} onChange={(e) => setField('singleThreshold', Number(e.target.value))} />}
              </Field>
              <Field label="舍弃累计上限(%)">
                {readonly ? <div className="form-static">{rule.cumulativeThreshold ?? '-'}</div> : <Input type="number" value={rule.cumulativeThreshold ?? ''} disabled={rule.allowExclude === 'no'} onChange={(e) => setField('cumulativeThreshold', Number(e.target.value))} />}
              </Field>
              <Field label="补充说明" full>
                {readonly ? <div className="form-static">{rule.excludeRemark || '-'}</div> : <Textarea value={rule.excludeRemark} maxLength={500} onChange={(e) => setField('excludeRemark', e.target.value)} />}
              </Field>
            </div>
            <div className="summary-box" style={{ marginTop: 12 }}>摘要预览：{summary.split('\n')[0]}</div>
          </CardWrap>

          <CardWrap name="可忽略排放项" active={active} onActive={setActive}>
            <div className="subtable-head">
              <span>
                共 {rule.ignoreItems.length} 条
                {errors.ignoreItems && <span className="form-error" style={{ marginLeft: 8 }}>{errors.ignoreItems}</span>}
              </span>
              {!readonly && <Button size="small" onClick={() => { setIgnoreModal(null); setEditIdx(-1) }}><IconPlus /> 新增忽略项</Button>}
            </div>
            {rule.ignoreItems.length === 0 ? (
              <div className="subtable-empty">该标准未规定可忽略的排放项（清单允许为空）</div>
            ) : (
              <Table
                columns={ignoreColumns(rule, readonly, (idx) => { setIgnoreModal(rule.ignoreItems[idx]); setEditIdx(idx) }, (idx) => setField('ignoreItems', rule.ignoreItems.filter((_, i) => i !== idx)))}
                data={[...rule.ignoreItems].sort((a, b) => a.sort - b.sort)}
                rowKey={(r) => r.id}
              />
            )}
          </CardWrap>

          <CardWrap name="GWP口径" active={active} onActive={setActive}>
            <div className="form-grid">
              <Field label="默认口径">
                {readonly ? <div className="form-static">{rule.gwpScope}</div> : <Select options={[{ label: '总量', value: '总量' }, { label: '化石', value: '化石' }, { label: '生物源', value: '生物源' }, { label: '直接土地利用变化', value: '直接土地利用变化' }]} value={rule.gwpScope} onChange={(e) => setField('gwpScope', e.target.value as CalcRule['gwpScope'])} />}
              </Field>
              <Field label="GWP 集版本">
                {readonly ? <div className="form-static">{rule.gwpVersion}</div> : <Select options={[{ label: 'AR4', value: 'AR4' }, { label: 'AR5', value: 'AR5' }, { label: 'AR6', value: 'AR6' }, { label: '其他', value: '其他' }]} value={rule.gwpVersion} onChange={(e) => setField('gwpVersion', e.target.value as CalcRule['gwpVersion'])} />}
              </Field>
              <Field label="是否计入生物碳">
                <div className="radio-row">
                  {(['yes', 'no'] as const).map((v) => (
                    <label key={v}><input type="radio" name="bio" checked={rule.gwpIncludeBio === v} disabled={readonly} onChange={() => setField('gwpIncludeBio', v)} />{v === 'yes' ? '是' : '否'}</label>
                  ))}
                </div>
              </Field>
              <Field label="生物碳处理方式" required error={errors.gwpBioTreatment}>
                {readonly ? (
                  <div className="form-static">{rule.gwpBioTreatment}</div>
                ) : (
                  <Select
                    options={[{ label: '负值计入', value: '负值计入' }, { label: '不计入', value: '不计入' }, { label: '长期储存单列', value: '长期储存单列' }]}
                    value={rule.gwpBioTreatment}
                    disabled={rule.gwpIncludeBio === 'no'}
                    invalid={!!errors.gwpBioTreatment}
                    onChange={(e) => { setField('gwpBioTreatment', e.target.value as CalcRule['gwpBioTreatment']); setError('gwpBioTreatment', '') }}
                  />
                )}
              </Field>
              <Field label="结果单位">
                {readonly ? <div className="form-static">{rule.resultUnit}</div> : <Input value={rule.resultUnit} onChange={(e) => setField('resultUnit', e.target.value)} />}
              </Field>
              <Field label="有效数字(位)">
                {readonly ? <div className="form-static">{rule.significantDigits}</div> : <Input type="number" min={1} max={6} value={rule.significantDigits} onChange={(e) => setField('significantDigits', Number(e.target.value))} />}
              </Field>
            </div>
            {rule.gwpScope === '生物源' && rule.gwpIncludeBio === 'no' && (
              <div className="alert alert-warning" style={{ marginTop: 12 }}><IconAlert /><span>默认口径为「生物源」但不计入生物碳，请确认（不阻断）。</span></div>
            )}
          </CardWrap>

          <CardWrap name="计算公式" active={active} onActive={setActive}>
            <div className="form-grid">
              <Field label="公式方法">
                {readonly ? <div className="form-static">{rule.formulaMethod}</div> : <Select options={[{ label: '因子法', value: '因子法' }, { label: '过程法', value: '过程法' }, { label: '投入产出法', value: '投入产出法' }, { label: '混合法', value: '混合法' }]} value={rule.formulaMethod} onChange={(e) => setField('formulaMethod', e.target.value as CalcRule['formulaMethod'])} />}
              </Field>
              <Field label="公式说明" full>
                {readonly ? <div className="form-static">{rule.formulaRemark || '-'}</div> : <Textarea value={rule.formulaRemark} maxLength={500} onChange={(e) => setField('formulaRemark', e.target.value)} />}
              </Field>
            </div>
            <Field label="表达式" full>
              {readonly ? <div className="form-static mono">{rule.expression || '-'}</div> : <Textarea className="mono" value={rule.expression} onChange={(e) => setField('expression', e.target.value)} />}
            </Field>
            {errors.variables && <div className="form-error">{errors.variables}</div>}
            <div className="subtable-head" style={{ marginTop: 12 }}>
              <span className="block-title" style={{ marginBottom: 0 }}>变量表</span>
              {!readonly && <Button size="small" onClick={() => setField('variables', [...rule.variables, { id: `v${Date.now()}`, name: '', meaning: '', unit: '', source: '活动数据', sample: 0 }])}><IconPlus /> 新增变量</Button>}
            </div>
            <Table
              columns={varColumns(rule, readonly, (idx, key, value) => setField('variables', rule.variables.map((v, i) => (i === idx ? { ...v, [key]: value } : v))), (idx) => setField('variables', rule.variables.filter((_, i) => i !== idx)))}
              data={rule.variables}
              rowKey={(v) => v.id}
            />
            <div className="trial-panel" style={{ marginTop: 12 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="block-title" style={{ marginBottom: 0 }}>试算（仅展示，不落库、不影响核算）</span>
                {!readonly && <Button size="small" onClick={() => toast(trial.ok ? `试算结果：${trial.value}` : trial.error)}>试算</Button>}
              </div>
              {trial.ok ? <div className="trial-result">试算结果：{trial.value}</div> : <div className="trial-result error">{trial.error}</div>}
              <div className="trial-vars">代入变量：{rule.variables.map((v) => `${v.name}=${v.sample}`).join('，')}</div>
            </div>
          </CardWrap>

          <CardWrap name="分配" active={active} onActive={setActive}>
            <div className="subtable-head" style={{ marginBottom: 8 }}>
              <span className="block-title" style={{ marginBottom: 0 }}>分配层级顺序（可勾选启用，顺序不可倒置）</span>
            </div>
            <Table
              columns={allocColumns(rule, readonly, moveAlloc, (idx) => setField('allocLevels', rule.allocLevels.map((l, i) => (i === idx ? { ...l, enabled: !l.enabled } : l))))}
              data={rule.allocLevels}
              rowKey={(l) => l.name}
            />
            <div className="form-grid" style={{ marginTop: 12 }}>
              <Field label="默认分配方法">
                {readonly ? <div className="form-static">{rule.allocDefault}</div> : <Select options={['产量', '质量', '能耗', '体积', '面积', '经济价值'].map((v) => ({ label: v, value: v }))} value={rule.allocDefault} onChange={(e) => setField('allocDefault', e.target.value)} />}
              </Field>
              <Field label="副产品处理">
                <div className="radio-row">
                  {(['分摊法', '替代法'] as const).map((v) => (
                    <label key={v}><input type="radio" name="byproduct" checked={rule.byproduct === v} disabled={readonly} onChange={() => setField('byproduct', v)} />{v}</label>
                  ))}
                </div>
              </Field>
              <Field label="放弃上层方法需填原因">
                <div className="radio-row">
                  {(['yes', 'no'] as const).map((v) => (
                    <label key={v}><input type="radio" name="needReason" checked={rule.allocNeedReason === v} disabled={readonly} onChange={() => setField('allocNeedReason', v)} />{v === 'yes' ? '是' : '否'}</label>
                  ))}
                </div>
              </Field>
              <Field label="比例合计"><div className="form-static">100%</div></Field>
              <Field label="依据条款" required full error={errors.allocClause}>
                {readonly ? <div className="form-static">{rule.allocClause || '-'}</div> : <Input value={rule.allocClause} maxLength={200} invalid={!!errors.allocClause} onChange={(e) => { setField('allocClause', e.target.value); setError('allocClause', '') }} />}
              </Field>
              <Field label="说明" full>
                {readonly ? <div className="form-static">{rule.allocRemark || '-'}</div> : <Textarea value={rule.allocRemark} maxLength={500} onChange={(e) => setField('allocRemark', e.target.value)} />}
              </Field>
            </div>
            <div className="summary-box" style={{ marginTop: 12 }}>实际分配计算在「分配规则」与项目侧执行，本页仅记录标准规定。</div>
          </CardWrap>
        </div>
      </div>

      <IgnoreItemModal open={!!ignoreModal} item={ignoreModal} onClose={() => { setIgnoreModal(null); setEditIdx(-1) }} onSave={saveIgnore} />

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
function CardWrap({ name, active, onActive, children }: { name: string; active: SectionName; onActive: (s: SectionName) => void; children: ReactNode }) {
  return (
    <div id={`sec-${name}`} className="card calc-section" onMouseEnter={() => onActive(name)}>
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
function IconPlus() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function navErrorKey(s: SectionName): string {
  return (
    {
      基础信息: 'ruleName',
      取舍准则: '',
      可忽略排放项: 'ignoreItems',
      GWP口径: 'gwpBioTreatment',
      计算公式: 'variables',
      分配: 'allocClause',
    } as Record<SectionName, string>
  )[s]
}
function MultiSelectTags({ options, value, onChange }: { options: { label: string; value: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="multi-select-values" style={{ gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={['multi-select-tag', value.includes(o.value) ? '' : 'multi-select-placeholder'].filter(Boolean).join(' ')}
          onClick={() => toggle(o.value)}
          style={{ border: '1px solid var(--color-border)', background: value.includes(o.value) ? 'var(--color-primary-bg)' : 'transparent' }}
        >
          {o.label}
        </button>
      ))}
      {value.length === 0 && <span className="multi-select-placeholder">全行业通用</span>}
    </div>
  )
}

function ignoreColumns(rule: CalcRule, readonly: boolean, onEdit: (idx: number) => void, onDelete: (idx: number) => void): Column<IgnoreItem>[] {
  return [
    { key: 'sort', title: '排序', width: 70, render: (r) => <span className="drag-handle">⋮⋮ {r.sort}</span> },
    { key: 'type', title: '对象类型', width: 130, render: (r) => r.objectType },
    { key: 'obj', title: '对象', width: 200, render: (r) => r.objectName },
    { key: 'method', title: '忽略方式', width: 110, render: (r) => r.method },
    { key: 'reason', title: '忽略理由', render: (r) => <span className="cell-ellipsis">{r.reason || '-'}</span> },
    { key: 'clause', title: '依据条款', width: 200, render: (r) => r.clause },
    {
      key: 'actions',
      title: '操作',
      width: 100,
      render: (_r, idx) =>
        readonly ? (
          <span className="link-disabled">编辑</span>
        ) : (
          <span className="row-actions">
            <button className="link" onClick={() => onEdit(idx)}>编辑</button>
            <button className="link link-danger" onClick={() => onDelete(idx)}>删除</button>
          </span>
        ),
    },
  ]
}
function varColumns(rule: CalcRule, readonly: boolean, onChangeVar: (idx: number, key: keyof FormulaVar, value: FormulaVar[keyof FormulaVar]) => void, onDelete: (idx: number) => void): Column<FormulaVar>[] {
  return [
    { key: 'name', title: '变量名', width: 140, render: (v, i) => (readonly ? v.name : <Input value={v.name} onChange={(e) => onChangeVar(i, 'name', e.target.value)} />) },
    { key: 'meaning', title: '含义', width: 160, render: (v, i) => (readonly ? v.meaning : <Input value={v.meaning} onChange={(e) => onChangeVar(i, 'meaning', e.target.value)} />) },
    { key: 'unit', title: '单位', width: 110, render: (v, i) => (readonly ? v.unit : <Input value={v.unit} onChange={(e) => onChangeVar(i, 'unit', e.target.value)} />) },
    { key: 'source', title: '取值来源', width: 130, render: (v, i) => (readonly ? v.source : <Select options={['活动数据', '因子', '常量', '业务库取值'].map((s) => ({ label: s, value: s }))} value={v.source} onChange={(e) => onChangeVar(i, 'source', e.target.value as FormulaVar['source'])} />) },
    { key: 'sample', title: '示例值', width: 100, render: (v, i) => (readonly ? String(v.sample) : <Input type="number" value={v.sample} onChange={(e) => onChangeVar(i, 'sample', Number(e.target.value))} />) },
    { key: 'actions', title: '操作', width: 80, render: (_v, i) => (readonly ? <span>-</span> : <button className="link link-danger" onClick={() => onDelete(i)}>删除</button>) },
  ]
}
function allocColumns(rule: CalcRule, readonly: boolean, move: (idx: number, dir: -1 | 1) => void, toggle: (idx: number) => void): Column<CalcRule['allocLevels'][number]>[] {
  return [
    {
      key: 'order',
      title: '顺序',
      width: 80,
      render: (_l, idx) => (
        <span className="flex gap-xs">
          <button className="icon-btn" disabled={readonly || idx === 0} onClick={() => move(idx, -1)}>↑</button>
          <button className="icon-btn" disabled={readonly || idx === rule.allocLevels.length - 1} onClick={() => move(idx, 1)}>↓</button>
        </span>
      ),
    },
    { key: 'name', title: '层级', render: (l) => l.name },
    {
      key: 'enabled',
      title: '启用',
      width: 90,
      align: 'center',
      render: (l, idx) =>
        readonly ? (
          <Tag tone={l.enabled ? 'success' : 'default'}>{l.enabled ? '启用' : '停用'}</Tag>
        ) : (
          <input type="checkbox" checked={l.enabled} onChange={() => toggle(idx)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
        ),
    },
  ]
}

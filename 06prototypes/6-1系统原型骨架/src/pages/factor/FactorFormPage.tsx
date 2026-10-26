import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, CascaderSelect, FormField, Input, PageHeader, Select, Table, Textarea, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  FACTOR_DESCRIPTION_MAX,
  createLibraryFactor,
  createMyFactor,
  fetchFactor,
  fetchFactorFormOptions,
  fetchFactorLibrary,
  fetchFactorUnitOptions,
  fetchLibraryVersions,
  fetchMyFactor,
  updateLibraryFactor,
  updateMyFactor,
} from '@/mock'
import type { FactorFormOptions, FactorPayload, LibraryFactorPayload } from '@/mock'
import type { FactorExchange, FactorExt, TreeOption } from '@/types'
import { CALIBER_ROWS, CALIBER_TOTAL_ROW, factorUnitText } from './factorMeta'

/** 复合单位拆分为「分子（碳排放量类）/ 分母（活动数据单位）」 */
const splitFactorUnit = (unit: string): { numeratorUnit: string; denominatorUnit: string } => {
  const [numeratorUnit = '', denominatorUnit = ''] = unit.split('/')
  return { numeratorUnit, denominatorUnit }
}

import './FactorPage.css'

type TabKey = 'info' | 'basic' | 'exchanges'

interface FormState {
  name: string
  alias: string
  /** 英文名称（前后台通用） */
  englishName: string
  scenario: string
  value: string
  /** 因子单位（复合单位，如 `kgCO₂e/kg`）：分子碳排放量类 / 分母活动数据单位 */
  unit: string
  description: string
  /** 录入方式：总指标录入（单值）/ 分指标录入（GWP 分项） */
  entryMode: 'total' | 'split'
  /* GWP 分项（分指标录入用；字符串便于输入；空 = 不填） */
  caliberFossil: string
  caliberBiogenic: string
  caliberLuluc: string
}

const EMPTY_FORM: FormState = {
  name: '',
  alias: '',
  englishName: '',
  scenario: '',
  value: '',
  unit: '',
  description: '',
  entryMode: 'total',
  caliberFossil: '',
  caliberBiogenic: '',
  caliberLuluc: '',
}

const EMPTY_OPTIONS: FactorFormOptions = {
  industries: [],
  publisherRegions: [],
  publishYears: [],
  carbonUnits: [],
  activityUnits: [],
}

const EXCHANGE_FIELDS: Array<{ key: keyof FactorExt; label: string }> = [
  { key: 'productName', label: '产品名称' },
  { key: 'casNo', label: 'CAS 号' },
  { key: 'owner', label: '所有者' },
]

let exchangeSeq = 0
const nextExchangeId = () => {
  exchangeSeq += 1
  return `EX${Date.now()}${String(exchangeSeq).padStart(3, '0')}`
}

/**
 * 库内因子表单（商业数据库 / 自建库 / 前台我的因子库通用，**字段一致**）：
 * - 「因子信息」：名称 / 别名 / 适用场景 / 因子值 / 分子单位 / 活动数据单位 / 描述；
 * - 「数据基本信息」：产品名称 / CAS 号 / 所有者 / 过程描述 / 时间 / 地理 / 工艺技术 / 完整性（可编辑）；
 * - 「输入输出信息」：输入保留上游过程名称、输出保留下游过程名称（可编辑）；
 * - 已移除「来源信息」。
 */
export default function FactorFormPage() {
  const { libraryId = '', factorId } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const isMy = location.pathname.startsWith('/pcf/my-factor')
  const isEdit = !!factorId
  const queryVersionId = searchParams.get('versionId') ?? ''

  const [versionId, setVersionId] = useState(queryVersionId)
  /** 商业数据库：因子只读，不支持编辑 */
  const [externalReadonly, setExternalReadonly] = useState(false)
  const [options, setOptions] = useState<FactorFormOptions>(EMPTY_OPTIONS)
  /** 因子单位（复合单位）选项：按活动数据口径分组，直接选择「分子/分母」 */
  const [unitTree, setUnitTree] = useState<TreeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<TabKey>('info')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [ext, setExt] = useState<FactorExt>({})
  const [exchanges, setExchanges] = useState<FactorExchange[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [formOptions, unitOptions] = await Promise.all([fetchFactorFormOptions(), fetchFactorUnitOptions()])
      setOptions(formOptions)
      setUnitTree(unitOptions)
      if (!isMy) {
        const library = await fetchFactorLibrary(libraryId)
        setExternalReadonly(library.type === 'external')
        if (!isEdit && !queryVersionId) {
          const versions = await fetchLibraryVersions(libraryId)
          const target = versions.find((item) => item.status === 'draft') ?? versions[0]
          if (target) setVersionId(target.id)
        }
      }
      if (isEdit && factorId) {
        const detail = isMy ? await fetchMyFactor(factorId) : await fetchFactor(factorId)
        const cal = detail.calibers
        const hasSplit = !!cal && [cal.gwpFossil, cal.gwpBiogenic, cal.gwpLuluc].some((v) => v != null)
        setForm({
          name: detail.name,
          alias: detail.alias,
          englishName: detail.englishName ?? '',
          scenario: detail.scenario,
          value: String(detail.value),
          unit: factorUnitText(detail),
          description: detail.description,
          entryMode: hasSplit ? 'split' : 'total',
          caliberFossil: cal?.gwpFossil != null ? String(cal.gwpFossil) : '',
          caliberBiogenic: cal?.gwpBiogenic != null ? String(cal.gwpBiogenic) : '',
          caliberLuluc: cal?.gwpLuluc != null ? String(cal.gwpLuluc) : '',
        })
        if (detail.ext) setExt({ ...detail.ext })
        if (detail.exchanges) setExchanges(detail.exchanges.map((item) => ({ ...item })))
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [factorId, isEdit, isMy, libraryId, queryVersionId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))
  const updateExt = (patch: Partial<FactorExt>) => setExt((prev) => ({ ...prev, ...patch }))

  const unitOptions: TreeOption[] = useMemo(() => unitTree, [unitTree])

  const updateExchange = (id: string, patch: Partial<FactorExchange>) =>
    setExchanges((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  const addExchange = (direction: 'input' | 'output') =>
    setExchanges((prev) => [...prev, { id: nextExchangeId(), direction, name: '', amount: 0, unit: '', counterpart: '' }])
  const removeExchange = (id: string) => setExchanges((prev) => prev.filter((item) => item.id !== id))
  const moveExchange = (id: string, direction: 'input' | 'output') =>
    setExchanges((prev) => prev.map((item) => (item.id === id ? { ...item, direction } : item)))

  /** 解析可选数值：空串返回 null */
  const parseNum = (raw: string): number | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const num = Number(trimmed)
    return Number.isFinite(num) ? num : null
  }

  /** 分指标（化石 / 生物碳 / 土地利用） */
  const splitParts = () => ({
    gwpFossil: parseNum(form.caliberFossil),
    gwpBiogenic: parseNum(form.caliberBiogenic),
    gwpLuluc: parseNum(form.caliberLuluc),
  })

  /** 有效因子值：总指标 = 输入值；分指标 = 各项之和 */
  const effectiveValue = (): number | null => {
    if (form.entryMode === 'total') return parseNum(form.value)
    const parts = [splitParts().gwpFossil, splitParts().gwpBiogenic, splitParts().gwpLuluc].filter(
      (v): v is number => v != null,
    )
    if (parts.length === 0) return null
    return parts.reduce((acc, value) => acc + value, 0)
  }

  /** 复合单位文案（分指标明细表用） */
  const unitText = form.unit

  /** 分指标录入预览：各分指标值 + 自动合计的总指标值 */
  const splitPartsValue = splitParts()
  const splitPreview = CALIBER_ROWS.map((row) => ({
    id: row.key,
    label: row.fullLabel,
    value: row.key === 'gwpTotal' ? null : splitPartsValue[row.key],
    hint: row.hint,
  }))

  const splitPreviewColumns: Column<{ id: string; label: string; value: number | null; hint: string }>[] = [
    { key: 'label', title: '分指标', width: 200, render: (row) => row.label },
    {
      key: 'value',
      title: `数值（${unitText}）`,
      width: 180,
      render: (row) => <span className="mono nowrap">{row.value ?? '-'}</span>,
    },
    { key: 'hint', title: '口径说明', render: (row) => <span className="cell-ellipsis">{row.hint}</span> },
  ]

  const validate = (): string => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = '请输入因子名称'
    if (!form.scenario.trim()) next.scenario = '适用场景不能为空'
    const value = effectiveValue()
    if (form.entryMode === 'total') {
      if (value == null) next.value = '因子值不能为空'
      else if (value === 0) next.value = '因子值不能为 0'
    } else {
      if (value == null) next.value = '分指标至少填写一项'
      else if (value === 0) next.value = '分指标合计不能为 0'
    }
    const { numeratorUnit, denominatorUnit } = splitFactorUnit(form.unit)
    if (!numeratorUnit || !denominatorUnit) next.unit = '请选择因子单位（如 kgCO₂e/kg）'
    if (form.description.length > FACTOR_DESCRIPTION_MAX) next.description = `描述最长 ${FACTOR_DESCRIPTION_MAX} 字符`
    setErrors(next)
    if (Object.keys(next).length === 0) return ''
    setTab('info')
    return '请先完善必填项'
  }

  const buildPayload = (): LibraryFactorPayload => {
    const value = effectiveValue() ?? Number(form.value)
    const { numeratorUnit, denominatorUnit } = splitFactorUnit(form.unit)
    const calibers =
      form.entryMode === 'split'
        ? { gwpTotal: value, ...splitParts() }
        : undefined
    const base: FactorPayload = {
      name: form.name.trim(),
      alias: form.alias.trim(),
      englishName: form.englishName.trim() || undefined,
      scenario: form.scenario.trim(),
      value,
      calibers,
      numeratorUnit,
      denominatorUnit,
      description: form.description.trim(),
    }
    return { ...base, ext, exchanges: exchanges.map((item) => ({ ...item })) }
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }
    if (!isMy && !isEdit && !versionId) {
      toast('未找到可写入的库版本，请先在库详情新建版本', 'error')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && factorId) {
        if (isMy) await updateMyFactor(factorId, buildPayload())
        else await updateLibraryFactor(factorId, buildPayload())
        toast('保存成功')
        navigate(isMy ? `/pcf/my-factor/${libraryId}/factor/${factorId}` : `/model/factor-lib/${libraryId}/factor/${factorId}`)
      } else if (isMy) {
        const created = await createMyFactor(libraryId, buildPayload())
        toast('保存成功')
        navigate(`/pcf/my-factor/${libraryId}/factor/${created.id}`)
      } else {
        const created = await createLibraryFactor(libraryId, versionId, buildPayload())
        toast('保存成功')
        navigate(`/model/factor-lib/${libraryId}/factor/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const buildExchangeColumns = (direction: 'input' | 'output'): Column<FactorExchange>[] => {
    return [
      {
        key: 'name',
        title: '名称',
        width: 240,
        render: (row) => <Input value={row.name} placeholder="如 Carbon dioxide, in air" onChange={(e) => updateExchange(row.id, { name: e.target.value })} />,
      },
      {
        key: 'amount',
        title: '数量',
        width: 150,
        render: (row) => (
          <Input
            type="number"
            step="any"
            value={String(row.amount)}
            onChange={(e) => updateExchange(row.id, { amount: Number(e.target.value) })}
          />
        ),
      },
      {
        key: 'unit',
        title: '单位',
        width: 110,
        render: (row) => <Input value={row.unit} placeholder="kg" onChange={(e) => updateExchange(row.id, { unit: e.target.value })} />,
      },
      {
        key: 'counterpart',
        title: direction === 'input' ? '上游过程名称' : '下游过程名称',
        render: (row) => (
          <Input
            value={row.counterpart}
            placeholder="如 -"
            onChange={(e) => updateExchange(row.id, { counterpart: e.target.value })}
          />
        ),
      },
      {
        key: 'carbonType',
        title: '碳类型',
        width: 130,
        render: (row) => (
          <select
            className="select"
            value={row.carbonType ?? ''}
            onChange={(e) =>
              updateExchange(row.id, {
                carbonType: (e.target.value || null) as FactorExchange['carbonType'],
              })
            }
          >
            <option value="">未标注</option>
            <option value="fossil">化石</option>
            <option value="biogenic">生物碳</option>
            <option value="luluc">土地利用</option>
          </select>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        width: 120,
        render: (row) => (
          <span className="row-actions">
            <button type="button" className="link" onClick={() => moveExchange(row.id, direction === 'input' ? 'output' : 'input')}>
              转为{direction === 'input' ? '输出' : '输入'}
            </button>
            <button type="button" className="link link-danger" onClick={() => removeExchange(row.id)}>
              删除
            </button>
          </span>
        ),
      },
    ]
  }

  const exchangeBlock = (direction: 'input' | 'output') => {
    const list = exchanges.filter((item) => item.direction === direction)
    return (
      <>
        <div className="factor-section-header">
          <span className="factor-section-title">{direction === 'input' ? '输入数据' : '输出数据'}</span>
          <Button size="small" onClick={() => addExchange(direction)}>
            新增{direction === 'input' ? '输入' : '输出'}行
          </Button>
        </div>
        <div className="factor-section-body factor-section-flush">
          <div className="factor-table-wrap">
            <Table
              columns={buildExchangeColumns(direction)}
              data={list}
              rowKey={(row) => row.id}
              emptyText={`暂无${direction === 'input' ? '输入' : '输出'}数据`}
            />
          </div>
        </div>
      </>
    )
  }

  const breadcrumb = isMy
    ? ['产品碳足迹', '因子管理', '我的因子库', isEdit ? '编辑因子' : '手工新增因子']
    : ['系统管理', '模型管理', '因子库管理', isEdit ? '编辑因子' : '新增因子']
  const title = isEdit ? '编辑因子' : isMy ? '手工新增因子' : '新增因子'

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title={title} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  if (externalReadonly) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title="因子详情" onBack={() => navigate(-1)} />
        <div className="card">
          <div className="empty">商业数据库因子只读，不支持编辑</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={<span data-ann-target="factor.form.global"><span data-ann-target="pcf-factor.form">{title}</span></span>}
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="factor-stack">
        <section className="card">
          <div className="factor-tabs">
            <button
              type="button"
              className={['factor-tab', tab === 'info' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('info')}
            >
              因子信息
            </button>
            <button
              type="button"
              className={['factor-tab', tab === 'basic' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('basic')}
            >
              数据基本信息
            </button>
            <button
              type="button"
              className={['factor-tab', tab === 'exchanges' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('exchanges')}
            >
              输入输出信息
            </button>
          </div>

          {tab === 'info' && (
            <>
              <div className="factor-section-header">
                <span className="factor-section-title">因子信息</span>
              </div>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="因子名称" required error={errors.name}>
                    <Input value={form.name} placeholder="请输入" invalid={!!errors.name} onChange={(e) => updateForm({ name: e.target.value })} />
                  </FormField>
                  <FormField label="英文名称">
                    <Input value={form.englishName} placeholder="请输入" onChange={(e) => updateForm({ englishName: e.target.value })} />
                  </FormField>
                  <FormField label="因子别名">
                    <Input value={form.alias} placeholder="请输入" onChange={(e) => updateForm({ alias: e.target.value })} />
                  </FormField>
                  <FormField label="适用场景" required error={errors.scenario}>
                    <Input value={form.scenario} placeholder="请输入" invalid={!!errors.scenario} onChange={(e) => updateForm({ scenario: e.target.value })} />
                  </FormField>
                  <FormField label="录入方式" required full>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="entryMode"
                          checked={form.entryMode === 'total'}
                          onChange={() => updateForm({ entryMode: 'total' })}
                        />
                        总指标录入
                      </label>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="entryMode"
                          checked={form.entryMode === 'split'}
                          onChange={() => updateForm({ entryMode: 'split' })}
                        />
                        分指标录入
                      </label>
                    </div>
                  </FormField>
                  {form.entryMode === 'total' ? (
                    <FormField label="因子值（温室气体：总体）" error={errors.value}>
                      <Input
                        type="number"
                        step="any"
                        value={form.value}
                        placeholder="请输入因子数值"
                        invalid={!!errors.value}
                        onChange={(e) => updateForm({ value: e.target.value })}
                      />
                    </FormField>
                  ) : (
                    <>
                      <FormField label="温室气体（化石）">
                        <Input
                          type="number"
                          step="any"
                          value={form.caliberFossil}
                          placeholder="选填"
                          onChange={(e) => updateForm({ caliberFossil: e.target.value })}
                        />
                      </FormField>
                      <FormField label="温室气体（生物碳）">
                        <Input
                          type="number"
                          step="any"
                          value={form.caliberBiogenic}
                          placeholder="选填"
                          onChange={(e) => updateForm({ caliberBiogenic: e.target.value })}
                        />
                      </FormField>
                      <FormField label="温室气体（土地利用）">
                        <Input
                          type="number"
                          step="any"
                          value={form.caliberLuluc}
                          placeholder="选填"
                          onChange={(e) => updateForm({ caliberLuluc: e.target.value })}
                        />
                      </FormField>
                      <FormField label="合计（温室气体：总体）" error={errors.value}>
                        <Input value={effectiveValue() == null ? '' : String(effectiveValue())} placeholder="自动计算" readOnly />
                      </FormField>
                      <FormField label="分指标明细" full>
                        <div className="factor-table-wrap">
                          <Table columns={splitPreviewColumns} data={splitPreview} rowKey={(row) => row.id} />
                        </div>
                        <div className="toolbar-tip" style={{ marginTop: 6 }}>
                          {CALIBER_TOTAL_ROW.fullLabel}：{effectiveValue() == null ? '待填写' : `${effectiveValue()} ${unitText}`}
                        </div>
                      </FormField>
                    </>
                  )}
                  <FormField
                    label="因子单位"
                    required
                    error={errors.unit}
                  >
                    <CascaderSelect
                      value={form.unit}
                      placeholder="请选择因子单位"
                      options={unitOptions}
                      searchPlaceholder="搜索因子单位，如 kgCO₂e/kWh"
                      invalid={!!errors.unit}
                      onChange={(value) => updateForm({ unit: value })}
                    />
                  </FormField>
                  <FormField label="描述" full error={errors.description}>
                    <Textarea
                      value={form.description}
                      rows={4}
                      maxLength={FACTOR_DESCRIPTION_MAX}
                      placeholder="请输入"
                      invalid={!!errors.description}
                      onChange={(e) => updateForm({ description: e.target.value })}
                    />
                    <div className={['char-count', form.description.length > FACTOR_DESCRIPTION_MAX ? 'char-count-over' : ''].filter(Boolean).join(' ')}>
                      {form.description.length}/{FACTOR_DESCRIPTION_MAX}
                    </div>
                  </FormField>
                </div>
              </div>

            </>
          )}

          {tab === 'basic' && (
            <>
              <div className="factor-section-header">
                <span className="factor-section-title">基本信息</span>
              </div>
              <div className="factor-section-body">
                <div className="form-grid">
                  {EXCHANGE_FIELDS.map((field) => (
                    <FormField key={String(field.key)} label={field.label}>
                      <Input
                        value={(ext[field.key] as string) ?? ''}
                        placeholder="请输入"
                        onChange={(e) => updateExt({ [field.key]: e.target.value })}
                      />
                    </FormField>
                  ))}
                  <FormField label="过程描述" full>
                    <Textarea
                      rows={3}
                      value={ext.processDescription ?? ''}
                      placeholder="请输入"
                      onChange={(e) => updateExt({ processDescription: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>

              <div className="factor-section-header"><span className="factor-section-title">特征化方法 / 系统模型</span></div>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="系统模型">
                    <select
                      className="select"
                      value={ext.systemModel ?? ''}
                      onChange={(e) => updateExt({ systemModel: (e.target.value || undefined) as FactorExt['systemModel'] })}
                    >
                      <option value="">未标注</option>
                      <option value="cutoff">Cutoff（截断）</option>
                      <option value="apos">APOS（分配）</option>
                      <option value="consequential">Consequential（边际）</option>
                    </select>
                  </FormField>
                  <FormField label="特征化方法 / 指标">
                    <Input
                      value={ext.lciaMethod ?? ''}
                      placeholder="如 IPCC2021 GWP100 / EF3.1 / EN15804+A2"
                      onChange={(e) => updateExt({ lciaMethod: e.target.value })}
                    />
                  </FormField>
                  <FormField label="GWP 版本">
                    <Input value={ext.gwpVersion ?? ''} placeholder="如 AR6" onChange={(e) => updateExt({ gwpVersion: e.target.value })} />
                  </FormField>
                  <FormField label="所有者版本">
                    <Input value={ext.ownerVersion ?? ''} placeholder="如 3.11" onChange={(e) => updateExt({ ownerVersion: e.target.value })} />
                  </FormField>
                </div>
              </div>

              <div className="factor-section-header"><span className="factor-section-title">时间信息</span></div>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="时间边界">
                    <Input value={ext.timeBoundary ?? ''} placeholder="如 2019-2023" onChange={(e) => updateExt({ timeBoundary: e.target.value })} />
                  </FormField>
                  <FormField label="时间描述">
                    <Input value={ext.timeDesc ?? ''} placeholder="请输入" onChange={(e) => updateExt({ timeDesc: e.target.value })} />
                  </FormField>
                </div>
              </div>

              <div className="factor-section-header"><span className="factor-section-title">地理信息</span></div>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="地域">
                    <Input value={ext.geoName ?? ''} placeholder="如 秘鲁 / 全球" onChange={(e) => updateExt({ geoName: e.target.value })} />
                  </FormField>
                  <FormField label="地理信息描述" full>
                    <Textarea rows={2} value={ext.geoDesc ?? ''} placeholder="请输入" onChange={(e) => updateExt({ geoDesc: e.target.value })} />
                  </FormField>
                </div>
              </div>

              <div className="factor-section-header"><span className="factor-section-title">工艺技术</span></div>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="工艺技术描述" full>
                    <Textarea rows={2} value={ext.techDesc ?? ''} placeholder="请输入" onChange={(e) => updateExt({ techDesc: e.target.value })} />
                  </FormField>
                </div>
              </div>

              <div className="factor-section-header"><span className="factor-section-title">技术信息</span></div>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="完整性说明" full>
                    <Textarea rows={2} value={ext.completeness ?? ''} placeholder="请输入" onChange={(e) => updateExt({ completeness: e.target.value })} />
                  </FormField>
                </div>
              </div>
            </>
          )}

          {tab === 'exchanges' && (
            <>
              {exchangeBlock('input')}
              {exchangeBlock('output')}
            </>
          )}
        </section>

        <section className="card">
          <div className="factor-form-footer" data-ann-target="pcf-factor.form.save">
            <Button onClick={() => navigate(-1)}>取消</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}

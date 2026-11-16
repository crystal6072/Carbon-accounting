import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  FormField,
  Input,
  Textarea,
  PageHeader,
  Select,
  Tag,
  MultiCascaderSelect,
  useToast,
} from '@/shared/components'
import type { TreeOption } from '@/types'
import {
  buildStages,
  createBaseline,
  fetchBaseline,
  updateBaseline,
  SOURCE_TYPE_OPTIONS,
  GWP_OPTIONS,
  UNIT_OPTIONS,
} from '@/mock/baselines'
import type { BaselineDraft, BaselineStage, Boundary } from '@/mock/baselines'
import { fetchCategoryTreeOptions, fetchIndustryTreeOptions, systemBoundaryItems } from '@/mock'
import {
  boundaryText,
  computeShares,
  coverage,
  numText,
  overDiffHints,
  sumStageEmission,
} from './baselineMeta'
import IndustryBaselineConfirmModal from './IndustryBaselineConfirmModal'
import type { BaselineConfirmMode } from './IndustryBaselineConfirmModal'
import './IndustryBaselinePage.css'

/** 行业库树 → 末级行业扁平选项（value=行业编码，label=行业名称） */
function collectIndustryLeaves(nodes: TreeOption[], prefix: string[] = []): { value: string; label: string; path: string }[] {
  const out: { value: string; label: string; path: string }[] = []
  for (const n of nodes) {
    const path = [...prefix, n.label]
    if (n.children && n.children.length) {
      out.push(...collectIndustryLeaves(n.children as TreeOption[], path))
    } else {
      out.push({ value: (n.extra as string) ?? n.value, label: n.label, path: path.join(' / ') })
    }
  }
  return out
}

/** 分类树 → id → 名称映射，用于多选回显名称 */
function buildCategoryNameMap(nodes: TreeOption[]): Record<string, string> {
  const map: Record<string, string> = {}
  const walk = (ns: TreeOption[]) =>
    ns.forEach((n) => {
      map[n.value] = n.label
      if (n.children) walk(n.children as TreeOption[])
    })
  walk(nodes)
  return map
}

interface FormState {
  baselineName: string
  industryCode: string
  industryName: string
  industryPath: string
  productCategoryCodes: string[]
  productCategoryNames: string[]
  boundary: Boundary | ''
  baseYear: number
  periodStart: string
  periodEnd: string
  unitValue: number
  unitCode: string
  gwpVersion: string
  sourceType: string
  issuer: string
  totalOverridden: boolean
  totalEmission: number
  totalDiffReason: string
  remark: string
  stages: BaselineStage[]
}

const EMPTY_FORM: FormState = {
  baselineName: '',
  industryCode: '',
  industryName: '',
  industryPath: '',
  productCategoryCodes: [],
  productCategoryNames: [],
  boundary: '',
  baseYear: new Date().getFullYear(),
  periodStart: '',
  periodEnd: '',
  unitValue: 1,
  unitCode: 'm³',
  gwpVersion: '',
  sourceType: '',
  issuer: '',
  totalOverridden: false,
  totalEmission: 0,
  totalDiffReason: '',
  remark: '',
  stages: [],
}

const UNIT_SELECT_OPTIONS = UNIT_OPTIONS.map((o) => ({ value: o, label: o }))
const GWP_SELECT_OPTIONS = GWP_OPTIONS.map((o) => ({ value: o, label: o }))
const SOURCE_TYPE_SELECT_OPTIONS = SOURCE_TYPE_OPTIONS.map((o) => ({ value: o, label: o }))

function toNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function IndustryBaselineFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [boundaryConfirm, setBoundaryConfirm] = useState<Boundary | null>(null)

  const [industryOptions, setIndustryOptions] = useState<{ value: string; label: string; path: string }[]>([])
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [categoryNameMap, setCategoryNameMap] = useState<Record<string, string>>({})
  const [boundaryOptions, setBoundaryOptions] = useState<{ value: string; label: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isEdit && id) {
        const detail = await fetchBaseline(id)
        setForm({
          baselineName: detail.baselineName,
          industryCode: detail.industryCode,
          industryName: detail.industryName,
          industryPath: detail.industryPath,
          productCategoryCodes: detail.productCategoryCodes,
          productCategoryNames: detail.productCategoryNames,
          boundary: detail.boundary,
          baseYear: detail.baseYear,
          periodStart: detail.periodStart ?? '',
          periodEnd: detail.periodEnd ?? '',
          unitValue: detail.unitValue,
          unitCode: detail.unitCode,
          gwpVersion: detail.gwpVersion,
          sourceType: detail.sourceType,
          issuer: detail.issuer,
          totalOverridden: false,
          totalEmission: detail.totalEmission,
          totalDiffReason: detail.totalDiffReason ?? '',
          remark: detail.remark ?? '',
          stages: detail.stages.map((s) => ({ ...s })),
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

  useEffect(() => {
    void (async () => {
      const [indTree, catTree, bd] = await Promise.all([
        fetchIndustryTreeOptions(),
        fetchCategoryTreeOptions(),
        Promise.resolve(systemBoundaryItems()),
      ])
      setIndustryOptions(collectIndustryLeaves(indTree))
      setCategoryTree(catTree)
      setCategoryNameMap(buildCategoryNameMap(catTree))
      setBoundaryOptions(bd.map((it) => ({ value: it.code, label: it.label })))
    })()
  }, [])

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const sumStage = sumStageEmission(form.stages)
  const effectiveTotal = form.totalOverridden ? form.totalEmission : sumStage
  const sharedStages = computeShares(form.stages, effectiveTotal)
  const cov = coverage(form.stages)
  const diffHints = overDiffHints(form.stages)

  const updateStage = (code: string, patch: Partial<BaselineStage>) =>
    setForm((prev) => ({ ...prev, stages: prev.stages.map((s) => (s.stageCode === code ? { ...s, ...patch } : s)) }))

  const applyBoundary = (next: Boundary) =>
    setForm((prev) => ({ ...prev, boundary: next, stages: buildStages(next) }))

  const handleBoundaryChange = (next: Boundary) => {
    if (next === form.boundary) return
    const hasData = form.stages.some((s) => (s.stageEmission || 0) > 0)
    if (hasData) setBoundaryConfirm(next)
    else applyBoundary(next)
  }

  const handleIndustryChange = (value: string) => {
    const opt = industryOptions.find((o) => o.value === value)
    updateForm({ industryCode: value, industryName: opt?.label ?? '', industryPath: opt?.path ?? '' })
  }

  const handleCategoriesChange = (values: string[]) =>
    updateForm({
      productCategoryCodes: values,
      productCategoryNames: values.map((v) => categoryNameMap[v] ?? v),
    })

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {}
    if (!form.baselineName.trim()) next.baselineName = '请输入基线名称'
    if (!form.industryCode) next.industryCode = '请选择行业（须末级）'
    if (!form.boundary) next.boundary = '请选择系统边界'
    if (!form.gwpVersion) next.gwpVersion = '请选择 GWP 版本'
    if (!form.baseYear || form.baseYear < 2000 || form.baseYear > new Date().getFullYear()) {
      next.baseYear = `基准年须在 2000 ~ ${new Date().getFullYear()} 之间（D05/F-05）`
    }
    if (!form.unitValue || form.unitValue <= 0) next.unitValue = '功能单位数值须大于 0（D06/F-06）'
    if (!form.unitCode) next.unitCode = '请选择功能单位'
    if (!form.sourceType) next.sourceType = '请选择来源类型'
    if (!form.issuer.trim()) next.issuer = '请输入出具机构'
    if (form.stages.filter((s) => s.stageLevel === 1 && (s.stageEmission || 0) <= 0).length > 0) {
      next.stages = '一级阶段须全覆盖并录入碳足迹基准值（D08/F-08）'
    }
    if (form.totalOverridden) {
      const diff = sumStage > 0 ? Math.abs(form.totalEmission - sumStage) / sumStage : 1
      if (form.totalEmission <= 0) next.totalEmission = '基线总值须大于 0'
      if (diff > 0.1 && !form.totalDiffReason.trim()) {
        next.totalDiffReason = `基线总值与 Σ阶段 偏差 ${(diff * 100).toFixed(0)}% > 10%，须填写偏差说明（D09/F-09）`
      }
    }
    return next
  }

  const buildDraft = (): BaselineDraft => ({
    baselineName: form.baselineName.trim(),
    industryCode: form.industryCode,
    industryName: form.industryName,
    industryPath: form.industryPath,
    productCategoryCodes: form.productCategoryCodes,
    productCategoryNames: form.productCategoryNames,
    boundary: form.boundary as Boundary,
    baseYear: form.baseYear,
    periodStart: form.periodStart || undefined,
    periodEnd: form.periodEnd || undefined,
    unitValue: form.unitValue,
    unitCode: form.unitCode,
    gwpVersion: form.gwpVersion,
    sourceType: form.sourceType,
    issuer: form.issuer.trim(),
    totalEmission: effectiveTotal,
    totalDiffReason: form.totalOverridden ? form.totalDiffReason.trim() || undefined : undefined,
    remark: form.remark.trim() || undefined,
    stages: form.stages.map((s) => ({ ...s, stageShare: 0 })),
  })

  const handleSubmit = async () => {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast('请先完善必填项', 'error')
      return
    }
    setSubmitting(true)
    try {
      const draft = buildDraft()
      if (isEdit && id) {
        await updateBaseline(id, draft)
      } else {
        const created = await createBaseline(draft)
        navigate(`/baseline/industry/${created.id}`, { replace: true })
        return
      }
      toast('保存成功')
      navigate(`/baseline/industry/${id}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '产品碳基线库', '行业基线录入', isEdit ? '编辑基线' : '新增基线']} title={isEdit ? '编辑基线' : '新增基线'} />
        <div className="card"><div className="empty">加载中…</div></div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品碳基线库', '行业基线录入', isEdit ? '编辑基线' : '新增基线']}
        title={isEdit ? '编辑基线' : '新增基线'}
        description="选择行业与系统边界后录入分阶段碳足迹基准值"
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="baseline-form-cols">
        <div className="baseline-form-main">
          {/* 基线信息 */}
          <section className="card">
            <div className="standard-section-header">
              <span className="standard-section-title">基线信息</span>
              <span className="toolbar-tip">数据来源由系统按当前账号角色判定（平台=系统内置 / 租户=组织自建），不可手填</span>
            </div>
            <div className="standard-section-body">
              <div className="form-grid">
                <FormField label="基线名称" required error={errors.baselineName} full annTarget="baseline.form.name">
                  <Input value={form.baselineName} placeholder="如 2025 纤维板行业碳足迹基准·大门" invalid={!!errors.baselineName} onChange={(e) => updateForm({ baselineName: e.target.value })} />
                </FormField>
                <FormField label="行业" required error={errors.industryCode} annTarget="baseline.form.industry">
                  <Select value={form.industryCode} options={industryOptions.map((o) => ({ value: o.value, label: o.label }))} placeholder="请选择（须末级）" invalid={!!errors.industryCode} onChange={(e) => handleIndustryChange(e.target.value)} />
                </FormField>
                <FormField label="产品分类" annTarget="baseline.form.category" hint="不选=全行业通用；多选=限定适用产品（取自产品分类树）">
                  <MultiCascaderSelect value={form.productCategoryCodes} options={categoryTree} placeholder="请选择产品分类（可多选）" allowParent onChange={handleCategoriesChange} />
                </FormField>
                <FormField label="系统边界" required error={errors.boundary} annTarget="baseline.form.boundary">
                  <Select value={form.boundary} options={boundaryOptions} placeholder="请选择" invalid={!!errors.boundary} onChange={(e) => handleBoundaryChange(e.target.value as Boundary)} />
                </FormField>
                <FormField label="GWP 版本" required error={errors.gwpVersion} annTarget="baseline.form.gwp">
                  <Select value={form.gwpVersion} options={GWP_SELECT_OPTIONS} placeholder="请选择" invalid={!!errors.gwpVersion} onChange={(e) => updateForm({ gwpVersion: e.target.value })} />
                </FormField>
                <FormField label="基准年" required error={errors.baseYear} annTarget="baseline.form.year">
                  <Input type="number" value={String(form.baseYear)} invalid={!!errors.baseYear} onChange={(e) => updateForm({ baseYear: toNumber(e.target.value) })} />
                </FormField>
                <FormField label="适用周期起" annTarget="baseline.form.periodStart">
                  <Input type="date" value={form.periodStart} onChange={(e) => updateForm({ periodStart: e.target.value })} />
                </FormField>
                <FormField label="适用周期止" annTarget="baseline.form.periodEnd">
                  <Input type="date" value={form.periodEnd} onChange={(e) => updateForm({ periodEnd: e.target.value })} />
                </FormField>
                <FormField label="功能单位数值" required error={errors.unitValue} annTarget="baseline.form.unitValue">
                  <Input type="number" value={String(form.unitValue)} invalid={!!errors.unitValue} onChange={(e) => updateForm({ unitValue: toNumber(e.target.value) })} />
                </FormField>
                <FormField label="功能单位" required error={errors.unitCode} annTarget="baseline.form.unit">
                  <Select value={form.unitCode} options={UNIT_SELECT_OPTIONS} placeholder="请选择" invalid={!!errors.unitCode} onChange={(e) => updateForm({ unitCode: e.target.value })} />
                </FormField>
                <FormField label="来源类型" required error={errors.sourceType} annTarget="baseline.form.sourceType">
                  <Select value={form.sourceType} options={SOURCE_TYPE_SELECT_OPTIONS} placeholder="请选择" invalid={!!errors.sourceType} onChange={(e) => updateForm({ sourceType: e.target.value })} />
                </FormField>
                <FormField label="出具机构" required error={errors.issuer} annTarget="baseline.form.issuer">
                  <Input value={form.issuer} placeholder="如 中国林产工业协会" invalid={!!errors.issuer} onChange={(e) => updateForm({ issuer: e.target.value })} />
                </FormField>
                <FormField label="备注" full annTarget="baseline.form.remark">
                  <Textarea value={form.remark} placeholder="选填；补充说明" onChange={(e) => updateForm({ remark: e.target.value })} />
                </FormField>
              </div>
            </div>
          </section>

          {/* 分阶段基准值 */}
          <section className="card" data-ann-target="baseline.form.stages">
            <div className="standard-section-header">
              <span className="standard-section-title">分阶段基准值</span>
              <span className="toolbar-tip">
                一级阶段须全覆盖（{cov.filled}/{cov.total}）
              </span>
            </div>
            <div className="standard-section-body">
              {!form.boundary && <div className="standard-attach-tip">请先选择系统边界，阶段将自动带出</div>}
              {form.boundary && (
                <>
                  <div className="baseline-stage-table">
                    <div className="baseline-stage-head">
                      <span className="bs-col bs-name">阶段</span>
                      <span className="bs-col bs-num">碳足迹基准值</span>
                      <span className="bs-col bs-num">先进值</span>
                      <span className="bs-col bs-num">样本量</span>
                    </div>
                    {sharedStages.filter((s) => s.stageLevel === 1).map((s) => (
                      <div className="baseline-stage-row" key={s.stageCode}>
                        <span className="bs-col bs-name">{s.stageName}</span>
                        <span className="bs-col bs-num">
                          <Input
                            type="number"
                            className="bs-input"
                            value={String(s.stageEmission)}
                            onChange={(e) => updateStage(s.stageCode, { stageEmission: toNumber(e.target.value) })}
                          />
                        </span>
                        <span className="bs-col bs-num">
                          <Input
                            type="number"
                            className="bs-input"
                            value={s.advancedValue === undefined ? '' : String(s.advancedValue)}
                            onChange={(e) => updateStage(s.stageCode, { advancedValue: e.target.value === '' ? undefined : toNumber(e.target.value) })}
                          />
                        </span>
                        <span className="bs-col bs-num">
                          <Input
                            type="number"
                            className="bs-input"
                            value={s.sampleSize === undefined ? '' : String(s.sampleSize)}
                            onChange={(e) => updateStage(s.stageCode, { sampleSize: e.target.value === '' ? undefined : toNumber(e.target.value) })}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                  {errors.stages && <span className="form-error">{errors.stages}</span>}
                  <div className="standard-attach-tip">
                    说明：仅展示并录入一级阶段基准值；先进值与样本量用于偏差校验（D09）。
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* 汇总面板 */}
        <aside className="baseline-form-aside">
          <section className="card">
            <div className="standard-section-header">
              <span className="standard-section-title">汇总</span>
            </div>
            <div className="standard-section-body">
              <div className="baseline-summary-item">
                <span className="detail-label">功能单位</span>
                <span className="detail-value mono">{`${form.unitValue || 0} ${form.unitCode || '-'}`}</span>
              </div>
              <div className="baseline-summary-item">
                <span className="detail-label">Σ 一级阶段</span>
                <span className="detail-value mono">{numText(sumStage)}</span>
              </div>
              <div className="baseline-summary-item">
                <span className="detail-label">覆盖率</span>
                <span className="detail-value">{cov.total > 0 ? `${cov.filled}/${cov.total}` : '-'}</span>
              </div>
              <div className="baseline-summary-block">
                <label className="baseline-override">
                  <input type="checkbox" checked={form.totalOverridden} onChange={(e) => updateForm({ totalOverridden: e.target.checked })} />
                  覆盖基线总值（默认 = Σ阶段）
                </label>
                <div className="baseline-total-row">
                  <span className="detail-label">基线总值</span>
                  <Input
                    type="number"
                    className="bs-input"
                    value={String(form.totalEmission)}
                    disabled={!form.totalOverridden}
                    invalid={!!errors.totalEmission}
                    onChange={(e) => updateForm({ totalEmission: toNumber(e.target.value) })}
                  />
                </div>
                {form.totalOverridden && <span className="detail-value mono nowrap">与 Σ阶段 偏差：{sumStage > 0 ? `${((Math.abs(form.totalEmission - sumStage) / sumStage) * 100).toFixed(0)}%` : '—'}</span>}
                {errors.totalEmission && <span className="form-error">{errors.totalEmission}</span>}
                {form.totalOverridden && (
                  <FormField label="偏差说明" required error={errors.totalDiffReason} full>
                    <Textarea value={form.totalDiffReason} placeholder="偏差 > 10% 时必填（D09）" invalid={!!errors.totalDiffReason} onChange={(e) => updateForm({ totalDiffReason: e.target.value })} />
                  </FormField>
                )}
              </div>
              <div className="baseline-summary-tags">
                {form.boundary && <Tag tone="default">{boundaryText(form.boundary)}</Tag>}
              </div>
              {diffHints.length > 0 && (
                <div className="baseline-warn-box">
                  <div className="baseline-warn-title">超差提示（D09）</div>
                  {diffHints.map((h) => (
                    <div className="baseline-warn-line" key={h}>{h}</div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="card">
        <div className="standard-form-footer">
          <Button data-ann-target="baseline.form.cancel" onClick={() => navigate(-1)}>取消</Button>
          <Button variant="primary" data-ann-target="baseline.form.save" onClick={() => handleSubmit()} disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </div>
      </section>

      <IndustryBaselineConfirmModal
        open={!!boundaryConfirm}
        mode={'boundary' as BaselineConfirmMode}
        baseline={null}
        onClose={() => setBoundaryConfirm(null)}
        onConfirm={() => {
          if (boundaryConfirm) applyBoundary(boundaryConfirm)
          setBoundaryConfirm(null)
        }}
      />
    </>
  )
}

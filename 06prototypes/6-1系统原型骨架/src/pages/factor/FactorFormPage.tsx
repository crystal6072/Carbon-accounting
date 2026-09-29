import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  FormField,
  Input,
  MultiSelect,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { FACTOR_DESCRIPTION_MAX, createFactor, fetchFactor, fetchFactorFormOptions, updateFactor } from '@/mock'
import type { FactorFormOptions, FactorPayload } from '@/mock'
import type { FactorCategory } from '@/types'
import { factorCategoryOrder, factorCategoryText } from './factorMeta'
import './FactorPage.css'

type TabKey = 'info' | 'source'

interface FormState {
  name: string
  alias: string
  category: '' | FactorCategory
  industries: string[]
  scenario: string
  value: string
  numeratorUnit: string
  denominatorUnit: string
  sourceCategory: string
  publishYear: string
  publishDate: string
  publisherRegion: string
  publisherFullName: string
  publisherShortName: string
  dataSourceFile: string
  description: string
}

const EMPTY_FORM: FormState = {
  name: '',
  alias: '',
  category: '',
  industries: [],
  scenario: '',
  value: '',
  numeratorUnit: 'kgCO₂e',
  denominatorUnit: '',
  sourceCategory: '',
  publishYear: '',
  publishDate: '',
  publisherRegion: '',
  publisherFullName: '',
  publisherShortName: '',
  dataSourceFile: '',
  description: '',
}

const EMPTY_OPTIONS: FactorFormOptions = {
  industries: [],
  publisherRegions: [],
  publishYears: [],
  carbonUnits: [],
  activityUnits: [],
}

export default function FactorFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const isFrontend = location.pathname.startsWith('/pcf/my-factor')
  const basePath = isFrontend ? '/pcf/my-factor' : '/model/factor'

  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<TabKey>('info')
  const [options, setOptions] = useState<FactorFormOptions>(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const opts = await fetchFactorFormOptions()
      setOptions(opts)
      if (isEdit && id) {
        const detail = await fetchFactor(id)
        setForm({
          name: detail.name,
          alias: detail.alias,
          category: detail.category,
          industries: detail.industries,
          scenario: detail.scenario,
          value: String(detail.value),
          numeratorUnit: detail.numeratorUnit,
          denominatorUnit: detail.denominatorUnit,
          sourceCategory: detail.sourceCategory,
          publishYear: detail.publishYear,
          publishDate: detail.publishDate,
          publisherRegion: detail.publisherRegion,
          publisherFullName: detail.publisherFullName,
          publisherShortName: detail.publisherShortName,
          dataSourceFile: detail.dataSourceFile,
          description: detail.description,
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

  const industryOptions = useMemo(() => options.industries.map((item) => ({ label: item, value: item })), [options])
  const categoryOptions: SelectOption[] = factorCategoryOrder.map((category) => ({
    label: factorCategoryText[category],
    value: category,
  }))
  const publisherRegionOptions: SelectOption[] = options.publisherRegions.map((item) => ({ label: item, value: item }))
  const publishYearOptions: SelectOption[] = options.publishYears.map((item) => ({ label: `${item} 年`, value: item }))
  const carbonUnitOptions: SelectOption[] = options.carbonUnits.map((item) => ({ label: item, value: item }))
  const activityUnitOptions: SelectOption[] = options.activityUnits.map((item) => ({ label: item, value: item }))

  const validate = (): string => {
    const next: Record<string, string> = {}
    // 因子信息
    if (!form.name.trim()) next.name = '请输入因子名称'
    if (!form.category) next.category = '请选择因子分类'
    if (form.industries.length === 0) next.industries = '请选择适用行业'
    if (!form.scenario.trim()) next.scenario = '适用场景不能为空'
    const value = Number(form.value)
    if (!form.value.trim() || Number.isNaN(value)) next.value = '因子值不能为空'
    else if (form.category !== 'biocarbon' && value <= 0) next.value = '非生物碳因子的因子值必须为正数'
    else if (form.category === 'biocarbon' && value === 0) next.value = '因子值不能为 0'
    if (!form.numeratorUnit) next.numeratorUnit = '请选择单位'
    if (!form.denominatorUnit) next.denominatorUnit = '请选择活动数据单位'
    if (form.description.length > FACTOR_DESCRIPTION_MAX) next.description = `描述最长 ${FACTOR_DESCRIPTION_MAX} 字符`
    // 来源信息
    if (!form.sourceCategory) next.sourceCategory = '请选择来源类别'
    if (!form.publishYear) next.publishYear = '请选择发布年份'
    if (!form.publisherRegion) next.publisherRegion = '请选择发布国家/组织'
    if (!form.publisherFullName.trim()) next.publisherFullName = '请输入发布机构或出版者（全称）'

    setErrors(next)
    if (Object.keys(next).length === 0) return ''
    // 有错时自动跳到对应 Tab
    const infoKeys = ['name', 'category', 'industries', 'scenario', 'value', 'numeratorUnit', 'denominatorUnit', 'description']
    setTab(Object.keys(next).some((key) => infoKeys.includes(key)) ? 'info' : 'source')
    return '请先完善必填项'
  }

  const buildPayload = (): FactorPayload => ({
    name: form.name.trim(),
    alias: form.alias.trim(),
    category: form.category as FactorCategory,
    industries: form.industries,
    scenario: form.scenario.trim(),
    value: Number(form.value),
    numeratorUnit: form.numeratorUnit,
    denominatorUnit: form.denominatorUnit,
    sourceCategory: form.sourceCategory,
    publishYear: form.publishYear,
    publishDate: form.publishDate,
    publisherRegion: form.publisherRegion,
    publisherFullName: form.publisherFullName.trim(),
    publisherShortName: form.publisherShortName.trim(),
    dataSourceFile: form.dataSourceFile,
    description: form.description.trim(),
    source: isFrontend ? 'custom' : 'preset',
  })

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateFactor(id, buildPayload())
        toast('保存成功')
        navigate(`${basePath}/${id}`)
      } else {
        const created = await createFactor(buildPayload())
        toast('保存成功')
        navigate(`${basePath}/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumb={isFrontend ? ['前台业务平台', '我的因子库'] : ['后台管理', '核算模型', '排放因子库']}
          title={isEdit ? '编辑排放因子' : '新增排放因子'}
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
        breadcrumb={
          isFrontend
            ? ['前台业务平台', '我的因子库', isEdit ? '编辑排放因子' : '新增排放因子']
            : ['后台管理', '核算模型', '排放因子库', isEdit ? '编辑排放因子' : '新增排放因子']
        }
        title={isEdit ? '编辑排放因子' : '新增排放因子'}
        description={isEdit ? '因子信息与来源信息均可维护；变更不追溯已参与计算的历史结果' : '填写因子信息与来源信息；因子编码由系统生成'}
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
              className={['factor-tab', tab === 'source' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('source')}
            >
              来源信息
            </button>
          </div>

          {tab === 'info' ? (
            <>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="因子名称" required error={errors.name}>
                    <Input
                      value={form.name}
                      placeholder="请选择"
                      invalid={!!errors.name}
                      onChange={(e) => updateForm({ name: e.target.value })}
                    />
                  </FormField>
                  <FormField label="因子别名">
                    <Input
                      value={form.alias}
                      placeholder="请输入"
                      onChange={(e) => updateForm({ alias: e.target.value })}
                    />
                  </FormField>
                  <FormField label="因子分类" required error={errors.category}>
                    <Select
                      value={form.category}
                      placeholder="请选择"
                      options={categoryOptions}
                      invalid={!!errors.category}
                      onChange={(e) => updateForm({ category: e.target.value as '' | FactorCategory })}
                    />
                  </FormField>
                  <FormField label="适用行业" required error={errors.industries}>
                    <MultiSelect
                      value={form.industries}
                      options={industryOptions}
                      placeholder="请选择行业"
                      onChange={(value) => updateForm({ industries: value })}
                    />
                  </FormField>
                  <FormField label="适用场景" required error={errors.scenario}>
                    <Input
                      value={form.scenario}
                      placeholder="请输入"
                      invalid={!!errors.scenario}
                      onChange={(e) => updateForm({ scenario: e.target.value })}
                    />
                  </FormField>
                  <FormField label="碳排放因子值" error={errors.value}>
                    <Input
                      type="number"
                      step="any"
                      value={form.value}
                      placeholder="请输入因子数值"
                      invalid={!!errors.value}
                      onChange={(e) => updateForm({ value: e.target.value })}
                    />
                  </FormField>
                  <FormField label="单位" error={errors.numeratorUnit}>
                    <Select
                      value={form.numeratorUnit}
                      placeholder="请选择"
                      options={carbonUnitOptions}
                      invalid={!!errors.numeratorUnit}
                      onChange={(e) => updateForm({ numeratorUnit: e.target.value })}
                    />
                  </FormField>
                  <FormField label="活动数据单位" required error={errors.denominatorUnit}>
                    <Select
                      value={form.denominatorUnit}
                      placeholder="请选择活动数据单位"
                      options={activityUnitOptions}
                      invalid={!!errors.denominatorUnit}
                      onChange={(e) => updateForm({ denominatorUnit: e.target.value })}
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
                    <div
                      className={['char-count', form.description.length > FACTOR_DESCRIPTION_MAX ? 'char-count-over' : '']
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {form.description.length}/{FACTOR_DESCRIPTION_MAX}
                    </div>
                  </FormField>
                </div>
              </div>
              <div className="factor-section-body factor-section-tip">
                因子单位为**复合单位**：单位（碳排放量类，默认 kgCO₂e）× 活动数据单位（分母）。分母须与活动数据同类型、
                可换算，否则触发 <span className="mono">E04</span>；生物碳因子以**负值**表达固碳，是否计入由模型固碳开关控制（方案 §6.5）。
              </div>
            </>
          ) : (
            <>
              <div className="factor-section-body">
                <div className="form-grid">
                  <FormField label="来源类别" required error={errors.sourceCategory}>
                    <Input
                      value={form.sourceCategory}
                      placeholder="请输入"
                      invalid={!!errors.sourceCategory}
                      onChange={(e) => updateForm({ sourceCategory: e.target.value })}
                    />
                  </FormField>
                  <FormField label="发布年份" required error={errors.publishYear}>
                    <Select
                      value={form.publishYear}
                      placeholder="请选择"
                      options={publishYearOptions}
                      invalid={!!errors.publishYear}
                      onChange={(e) => updateForm({ publishYear: e.target.value })}
                    />
                  </FormField>
                  <FormField label="发布日期">
                    <Input
                      type="date"
                      value={form.publishDate}
                      onChange={(e) => updateForm({ publishDate: e.target.value })}
                    />
                  </FormField>
                  <FormField label="发布国家/组织" required error={errors.publisherRegion}>
                    <Select
                      value={form.publisherRegion}
                      placeholder="请选择"
                      options={publisherRegionOptions}
                      invalid={!!errors.publisherRegion}
                      onChange={(e) => updateForm({ publisherRegion: e.target.value })}
                    />
                  </FormField>
                  <FormField label="发布机构或出版者（全称）" required error={errors.publisherFullName}>
                    <Input
                      value={form.publisherFullName}
                      placeholder="请输入"
                      invalid={!!errors.publisherFullName}
                      onChange={(e) => updateForm({ publisherFullName: e.target.value })}
                    />
                  </FormField>
                  <FormField label="发布机构或出版者（简称）">
                    <Input
                      value={form.publisherShortName}
                      placeholder="请输入"
                      onChange={(e) => updateForm({ publisherShortName: e.target.value })}
                    />
                  </FormField>
                  <FormField label="数据来源" full>
                    <input
                      ref={fileRef}
                      type="file"
                      style={{ display: 'none' }}
                      onChange={(e) => updateForm({ dataSourceFile: e.target.files?.[0]?.name ?? '' })}
                    />
                    {form.dataSourceFile ? (
                      <div className="factor-upload factor-upload-filled">
                        <span className="mono">{form.dataSourceFile}</span>
                        <span className="row-actions">
                          <button className="link" type="button" onClick={() => fileRef.current?.click()}>
                            重新选择
                          </button>
                          <button className="link link-danger" type="button" onClick={() => updateForm({ dataSourceFile: '' })}>
                            移除
                          </button>
                        </span>
                      </div>
                    ) : (
                      <button type="button" className="factor-upload" onClick={() => fileRef.current?.click()}>
                        <span className="factor-upload-plus">+</span>
                        <span>点击开始选择文件</span>
                      </button>
                    )}
                  </FormField>
                </div>
              </div>
              <div className="factor-section-body factor-section-tip">
                来源信息用于因子溯源与报告披露；数据来源文件仅作内部查阅，**不参与计算与校验**。
              </div>
            </>
          )}
        </section>

        <section className="card">
          <div className="factor-form-footer">
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

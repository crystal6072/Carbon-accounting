import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import {
  Button,
  FormField,
  Input,
  Modal,
  Pagination,
  Select,
  Table,
  Tag,
  useToast,
} from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  PCF_PROJECT_REMARK_MAX,
  createPcfProject,
  fetchLifecycleStages,
  fetchPcfMyProductOptions,
  fetchPcfOrgOptions,
  fetchPcfStandardOptions,
  fetchUnitOptions,
  updatePcfProjectStepOne,
} from '@/mock'
import type { PcfStepOnePayload } from '@/mock'
import type { PcfMyProductOption } from '@/mock'
import type {
  LifecycleInclusion,
  LifecycleStageItem,
  PcfBoundary,
  PcfLifecycleStage,
  PcfOrgOption,
  PcfProject,
  PcfStandardOption,
} from '@/types'
import PcfPanel from './PcfPanel'
import { PCF_BOUNDARY_OPTIONS, PCF_BOUNDARY_TEXT, pcfProductLabel } from './pcfMeta'
import './PcfPage.css'

const PICKER_PAGE_SIZE = 20

interface FormState {
  /** 基本信息 */
  name: string
  ownerOrg: string
  startDate: string
  endDate: string
  remark: string
  /** 核算标准（核算方法，引用标准文件库） */
  methodId: string
  /** 产品（引用我的产品库，带出字段只读） */
  refProductId: string
  productCode: string
  productName: string
  productModel: string
  productSpec: string
  productCategory: string
  productIndustry: string
  /** 单位（取值来自计量单位库；默认带出产品单位） */
  functionalUnit: string
  /** 转换系数（功能单位 / 声明单位 ↔ 产品单位；字符串态便于输入） */
  conversionFactor: string
  /** 核算边界（随生命周期阶段一起维护） */
  boundary: PcfBoundary
  /** 生命周期阶段（按边界带出，全部可勾选） */
  lifecycleStages: PcfLifecycleStage[]
}

export interface ProjectStepOneHandle {
  submit: () => void
}

interface ProjectStepOneProps {
  project: PcfProject
  editable: boolean
  /** 新建草稿模式：步骤①「保存」时才创建核算项目（未保存不落库） */
  creating?: boolean
  onSaved: (project: PcfProject) => void
  /** 草稿保存成功（已落库）后回调，由工作台跳转正式项目 */
  onCreated?: (project: PcfProject) => void
}

function toForm(project: PcfProject): FormState {
  return {
    name: project.name,
    ownerOrg: project.ownerOrg,
    startDate: project.startDate,
    endDate: project.endDate,
    remark: project.remark,
    methodId: project.methodId ?? '',
    refProductId: project.refProductId ?? '',
    productCode: project.productCode ?? '',
    productName: project.productName,
    productModel: project.productModel ?? '',
    productSpec: project.productSpec,
    productCategory: project.productCategory ?? '',
    productIndustry: project.productIndustry ?? '',
    functionalUnit: project.functionalUnit,
    conversionFactor: String(project.conversionFactor ?? 1),
    boundary: project.boundary,
    lifecycleStages: project.lifecycleStages ?? [],
  }
}

/**
 * 工作台步骤①「目标与范围」内容区。
 * - 基本信息（含核算标准）+ 产品（含单位）+ 生命周期阶段（含核算边界）。
 * - 生命周期阶段按「核算边界」带出，全部阶段均可勾选 / 取消。
 */
const ProjectStepOne = forwardRef<ProjectStepOneHandle, ProjectStepOneProps>(
  function ProjectStepOne({ project, editable, creating = false, onSaved, onCreated }, ref) {
    const toast = useToast()

    const [form, setForm] = useState<FormState>(() => toForm(project))
    const [orgs, setOrgs] = useState<PcfOrgOption[]>([])
    const [products, setProducts] = useState<PcfMyProductOption[]>([])
    const [units, setUnits] = useState<string[]>([])
    const [standards, setStandards] = useState<PcfStandardOption[]>([])
    const [allStages, setAllStages] = useState<LifecycleStageItem[]>([])
    const [loaded, setLoaded] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const [pickerOpen, setPickerOpen] = useState(false)
    const [pickerKeyword, setPickerKeyword] = useState('')
    const [pickedId, setPickedId] = useState('')
    const [pickerPage, setPickerPage] = useState(1)
    const [reconfirm, setReconfirm] = useState(false)

    useEffect(() => {
      void (async () => {
        const [orgList, productList, unitList, standardList, stageList] = await Promise.all([
          fetchPcfOrgOptions(),
          fetchPcfMyProductOptions(),
          fetchUnitOptions(),
          fetchPcfStandardOptions(),
          fetchLifecycleStages(),
        ])
        setOrgs(orgList)
        setProducts(productList)
        setUnits(unitList)
        setStandards(standardList)
        setAllStages(stageList)
        setLoaded(true)
      })()
    }, [])

    useEffect(() => {
      setForm(toForm(project))
      setErrors({})
    }, [project])

    /**
     * 按「核算边界 + 所属行业」带出关联的生命周期阶段（V0.7）：
     * 全部启用阶段均进入列表，默认勾选 = 该边界下非「不适用」的阶段（required / optional 勾选、excluded 不勾选），
     * 用户可自由勾选 / 取消（不再区分必选 / 锁定）。
     */
    const deriveStages = useCallback(
      (boundary: PcfBoundary, industry: string): PcfLifecycleStage[] => {
        const ruleOf = (s: LifecycleStageItem): LifecycleInclusion =>
          boundary === 'gate' ? s.gateRule : s.graveRule

        return allStages
          .filter(
            (s) =>
              s.status === 'enabled' &&
              ruleOf(s) !== 'excluded' &&
              (s.industries.length === 0 || s.industries.includes(industry)),
          )
          .sort((a, b) => a.order - b.order)
          .map((s) => ({
            id: s.id,
            name: s.name,
            level: s.level,
            parentName: '',
            custom: false,
            rule: ruleOf(s),
            included: true,
          }))
      },
      [allStages],
    )

    /** 首次加载且项目尚未配置阶段时，按当前边界带出默认阶段 */
    useEffect(() => {
      if (!loaded) return
      setForm((prev) => {
        if (prev.lifecycleStages.length > 0) return prev
        return { ...prev, lifecycleStages: deriveStages(prev.boundary, prev.productIndustry) }
      })
    }, [loaded, deriveStages])

    /** 已选产品不在「上架」候选中 → 视为已下架（快照继续可用，R-015） */
    const productOffShelf =
      loaded && !!form.refProductId && !products.some((item) => item.id === form.refProductId)

    const orgOptions: SelectOption[] = useMemo(
      () => orgs.map((item) => ({ label: item.name, value: item.name })),
      [orgs],
    )
    const unitOptions: SelectOption[] = useMemo(
      () => units.map((item) => ({ label: item, value: item })),
      [units],
    )
    const standardOptions: SelectOption[] = useMemo(
      () =>
        standards.map((item) => ({
          label: `${item.code}-${item.version} ${item.name}`,
          value: item.id,
        })),
      [standards],
    )

    const pickerRows = useMemo(() => {
      const keyword = pickerKeyword.trim().toLowerCase()
      if (!keyword) return products
      return products.filter(
        (item) => item.code.toLowerCase().includes(keyword) || item.name.toLowerCase().includes(keyword),
      )
    }, [products, pickerKeyword])

    const pagedPickerRows = pickerRows.slice(
      (pickerPage - 1) * PICKER_PAGE_SIZE,
      pickerPage * PICKER_PAGE_SIZE,
    )

    /** 选择产品：带出产品字段（带出字段只读）；单位默认取产品「单位」（C07）；阶段按行业 + 边界重新带出 */
    const applyProduct = (product: PcfMyProductOption) => {
      setForm((prev) => ({
        ...prev,
        refProductId: product.id,
        productCode: product.code,
        productName: product.name,
        productModel: product.model,
        productSpec: product.spec,
        productCategory: product.category,
        productIndustry: product.industry,
        functionalUnit: product.unit,
        conversionFactor: '1',
        lifecycleStages: deriveStages(prev.boundary, product.industry),
      }))
      setErrors({})
    }

    /** 切换一级阶段纳入（其下二级明细同步跟随） */
    const toggleStage = (id: string) => {
      setForm((prev) => {
        const target = prev.lifecycleStages.find((s) => s.id === id)
        if (!target || target.level !== 1) return prev
        const nextIncluded = !target.included
        return {
          ...prev,
          lifecycleStages: prev.lifecycleStages.map((s) =>
            s.id === id || s.parentName === target.name ? { ...s, included: nextIncluded } : s,
          ),
        }
      })
    }

    const handleSubmit = async () => {
      if (!editable || saving) return

      const next: Record<string, string> = {}
      if (!form.name.trim()) next.name = '请输入项目名称'
      if (!form.ownerOrg) next.ownerOrg = '请选择核算主体组织'
      if (!form.startDate || !form.endDate) next.period = '请选择统计时间'
      else if (form.startDate > form.endDate) next.period = '统计时间起始不能晚于结束'
      if (!form.methodId) next.methodId = '请选择核算标准'
      if (!form.refProductId) next.refProductId = '请选择产品'
      if (!form.functionalUnit) next.functionalUnit = '请选择单位'

      const factor = Number(form.conversionFactor)
      if (!form.conversionFactor.trim() || !Number.isFinite(factor) || factor <= 0) {
        next.conversionFactor = '请输入转换系数（大于 0 的数值）'
      }

      setErrors(next)
      if (Object.keys(next).length > 0) {
        toast('请先完善必填项', 'error')
        return
      }

      setSaving(true)
      try {
        const payload: PcfStepOnePayload = {
          name: form.name,
          ownerOrg: form.ownerOrg,
          startDate: form.startDate,
          endDate: form.endDate,
          remark: form.remark,
          boundary: form.boundary,
          methodId: form.methodId,
          refProductId: form.refProductId,
          productCode: form.productCode,
          productName: form.productName,
          productModel: form.productModel,
          productSpec: form.productSpec,
          productCategory: form.productCategory,
          productIndustry: form.productIndustry,
          productVersion: '',
          functionalUnit: form.functionalUnit,
          conversionFactor: factor,
          lifecycleStages: form.lifecycleStages,
        }

        if (creating) {
          // 保存即落库：先创建核算项目（生成编号），再写入步骤①表单全量字段
          const picked = products.find((item) => item.id === form.refProductId)
          const created = await createPcfProject({
            name: form.name,
            ownerOrg: form.ownerOrg,
            startDate: form.startDate,
            endDate: form.endDate,
            boundary: form.boundary,
            remark: form.remark,
            productSource: picked?.source === 'custom' ? 'custom' : 'library',
            refProductId: form.refProductId,
            productName: form.productName,
            productSpec: form.productSpec,
            functionalUnit: form.functionalUnit,
            conversionFactor: factor,
          })
          const saved = await updatePcfProjectStepOne(created.id, payload)
          onCreated?.(saved)
          toast('保存成功，核算项目已创建')
          return
        }

        const updated = await updatePcfProjectStepOne(project.id, payload)
        onSaved(updated)
        toast('保存成功')
      } catch (error) {
        toast(error instanceof Error ? error.message : '保存失败', 'error')
      } finally {
        setSaving(false)
      }
    }

    useImperativeHandle(ref, () => ({
      submit: () => {
        void handleSubmit()
      },
    }))

    const pickerColumns: Column<PcfMyProductOption>[] = [
      {
        key: 'pick',
        title: '',
        width: 48,
        render: (row) => (
          <input
            type="radio"
            name="pcf-product-pick"
            checked={pickedId === row.id}
            onChange={() => setPickedId(row.id)}
          />
        ),
      },
      { key: 'code', title: '产品编码', width: 110 },
      { key: 'name', title: '产品名称', width: 180 },
      { key: 'model', title: '型号', width: 100 },
      { key: 'spec', title: '规格', width: 120 },
      { key: 'industry', title: '所属行业', width: 90 },
      { key: 'unit', title: '单位', width: 60 },
      {
        key: 'source',
        title: '来源',
        width: 100,
        render: (row) =>
          row.source === 'custom' ? <Tag tone="info">自己新增</Tag> : <Tag>引用平台产品</Tag>,
      },
    ]

    /** 只读态：分组面板 + 纯文本 */
    if (!editable) {
      return (
        <div className="pcf-step-form">
          <PcfPanel title="基本信息">
            <ReadonlyGrid
              items={[
                { label: '项目编号', value: project.code, mono: true },
                { label: '项目名称', value: form.name },
                { label: '核算主体组织', value: form.ownerOrg },
                { label: '统计时间', value: `${form.startDate} ~ ${form.endDate}` },
                { label: '核算标准', value: project.method || '-' },
                { label: '备注', value: form.remark || '-' },
              ]}
            />
          </PcfPanel>

          <PcfPanel title="产品" tip="引用我的产品库">
            <ReadonlyGrid
              items={[
                { label: '产品', value: pcfProductLabel(form.productName, form.productSpec) },
                { label: '产品分类', value: form.productCategory || '-' },
                { label: '所属行业', value: form.productIndustry || '-' },
                { label: '型号', value: form.productModel || '-' },
                { label: '规格', value: form.productSpec || '-' },
                { label: '功能单位/声明单位', value: form.functionalUnit || '-' },
                { label: '转换系数', value: form.conversionFactor || '-' },
              ]}
            />
          </PcfPanel>

          <PcfPanel title="生命周期阶段">
            <div className="pcf-boundary-readonly">
              <span className="pcf-record-field-label">核算边界：</span>
              {PCF_BOUNDARY_TEXT[form.boundary]}
            </div>
            <div className="pcf-lifecycle-list">
              {form.lifecycleStages.filter((s) => s.included).length === 0 ? (
                <div className="form-static">暂未配置</div>
              ) : (
                form.lifecycleStages
                  .filter((s) => s.included)
                  .map((s) => (
                    <div
                      key={s.id}
                      className={['pcf-lifecycle-row', s.level === 2 ? 'pcf-lifecycle-row-level2' : '']
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="pcf-lifecycle-name">{s.name}</span>
                    </div>
                  ))
              )}
            </div>
          </PcfPanel>
        </div>
      )
    }

    return (
      <>
        <div className="pcf-step-form">
          <PcfPanel title="基本信息">
            <div className="pcf-grid">
              <FormField label="项目名称" required error={errors.name}>
                <Input
                  value={form.name}
                  placeholder="如：全竹碳化筷子 240mm·摇篮到大门"
                  invalid={!!errors.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </FormField>
              <FormField label="核算主体组织" required error={errors.ownerOrg}>
                <Select
                  value={form.ownerOrg}
                  placeholder="请选择"
                  options={orgOptions}
                  invalid={!!errors.ownerOrg}
                  onChange={(e) => setForm((prev) => ({ ...prev, ownerOrg: e.target.value }))}
                />
              </FormField>
              <FormField label="统计时间" required error={errors.period} hint="活动数据期间须覆盖">
                <div className="pcf-inline">
                  <Input
                    type="date"
                    value={form.startDate}
                    invalid={!!errors.period}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                  <span className="pcf-inline-sep">~</span>
                  <Input
                    type="date"
                    value={form.endDate}
                    invalid={!!errors.period}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </FormField>
              <FormField label="核算标准" required error={errors.methodId} hint="引用标准文件库">
                <Select
                  value={form.methodId}
                  placeholder="请选择"
                  options={standardOptions}
                  invalid={!!errors.methodId}
                  onChange={(e) => setForm((prev) => ({ ...prev, methodId: e.target.value }))}
                />
              </FormField>
              <FormField label="备注">
                <Input
                  value={form.remark}
                  maxLength={PCF_PROJECT_REMARK_MAX}
                  placeholder={`选填，最长 ${PCF_PROJECT_REMARK_MAX} 字符`}
                  onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                />
              </FormField>
            </div>
          </PcfPanel>

          <PcfPanel title="产品" tip="引用我的产品库">
            <div className="pcf-grid">
              <FormField label="产品" required error={errors.refProductId} full>
                <div className="pcf-inline">
                  <Input
                    value={form.refProductId ? pcfProductLabel(form.productName, form.productSpec) : ''}
                    placeholder="请选择产品"
                    readOnly
                    invalid={!!errors.refProductId}
                  />
                  <Button
                    onClick={() => {
                      setPickedId(form.refProductId)
                      setPickerKeyword('')
                      setPickerPage(1)
                      setPickerOpen(true)
                    }}
                  >
                    选择产品
                  </Button>
                  {productOffShelf && <Tag tone="warning">已下架</Tag>}
                </div>
              </FormField>
              <FormField
                label="功能单位/声明单位"
                required
                error={errors.functionalUnit}
                hint="核算结果的表达单位；取值来自计量单位库，默认带出产品单位"
              >
                <Select
                  value={form.functionalUnit}
                  placeholder="请选择"
                  options={unitOptions}
                  invalid={!!errors.functionalUnit}
                  onChange={(e) => setForm((prev) => ({ ...prev, functionalUnit: e.target.value }))}
                />
              </FormField>
              <FormField
                label="转换系数"
                required
                error={errors.conversionFactor}
                hint="功能单位/声明单位与产品单位的换算比例，如 1 盒 = 100 双填 100；与产品单位一致填 1"
              >
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={form.conversionFactor}
                  placeholder="请输入"
                  invalid={!!errors.conversionFactor}
                  onChange={(e) => setForm((prev) => ({ ...prev, conversionFactor: e.target.value }))}
                />
              </FormField>
              <ReadonlyField label="产品分类" value={form.productCategory} />
              <ReadonlyField label="所属行业" value={form.productIndustry} />
              <ReadonlyField label="型号" value={form.productModel} />
              <ReadonlyField label="规格" value={form.productSpec} />
            </div>
          </PcfPanel>

          <PcfPanel title="生命周期阶段" tip="与核算边界绑定的生命周期阶段（切换边界自动更新，可勾选纳入 / 取消）">
            <div className="pcf-grid">
              <FormField label="核算边界" required>
                <Select
                  value={form.boundary}
                  options={PCF_BOUNDARY_OPTIONS}
                  onChange={(e) => {
                    const boundary = e.target.value as PcfBoundary
                    setForm((prev) => ({
                      ...prev,
                      boundary,
                      lifecycleStages: deriveStages(boundary, prev.productIndustry),
                    }))
                  }}
                />
              </FormField>
            </div>
            <div className="pcf-lifecycle-list">
              {form.lifecycleStages.length === 0 ? (
                <div className="pcf-placeholder">暂无可选生命周期阶段</div>
              ) : (
                form.lifecycleStages.map((stage) => (
                  <div
                    key={stage.id}
                    className={[
                      'pcf-lifecycle-row',
                      stage.level === 2 ? 'pcf-lifecycle-row-level2' : '',
                      stage.included ? '' : 'is-off',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {stage.level === 1 && (
                      <input
                        type="checkbox"
                        checked={stage.included}
                        onChange={() => toggleStage(stage.id)}
                      />
                    )}
                    <span className="pcf-lifecycle-name">{stage.name}</span>
                  </div>
                ))
              )}
            </div>
          </PcfPanel>
        </div>

        <Modal
          open={pickerOpen}
          title="选择产品"
          size="lg"
          onClose={() => setPickerOpen(false)}
          footer={
            <>
              <Button onClick={() => setPickerOpen(false)}>取消</Button>
              <Button
                variant="primary"
                disabled={!pickedId}
                onClick={() => {
                  if (form.refProductId && form.refProductId !== pickedId) {
                    setPickerOpen(false)
                    setReconfirm(true)
                    return
                  }
                  const product = products.find((item) => item.id === pickedId)
                  if (product) applyProduct(product)
                  setPickerOpen(false)
                }}
              >
                确认选择
              </Button>
            </>
          }
        >
          <div className="pcf-picker-query">
            <Input
              value={pickerKeyword}
              placeholder="产品编码 / 名称"
              onChange={(e) => {
                setPickerKeyword(e.target.value)
                setPickerPage(1)
              }}
            />
          </div>
          <div className="pcf-table-wrap">
            <Table
              columns={pickerColumns}
              data={pagedPickerRows}
              rowKey={(row) => row.id}
              emptyText="暂无可选产品，请先在「我的产品库」新增或引用产品"
            />
          </div>
          <Pagination
            total={pickerRows.length}
            page={pickerPage}
            pageSize={PICKER_PAGE_SIZE}
            onChange={setPickerPage}
          />
        </Modal>

        <Modal
          open={reconfirm}
          title="确认重新选择产品"
          size="sm"
          onClose={() => setReconfirm(false)}
          footer={
            <>
              <Button onClick={() => setReconfirm(false)}>取消</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const product = products.find((item) => item.id === pickedId)
                  if (product) applyProduct(product)
                  setReconfirm(false)
                }}
              >
                确认重新选择
              </Button>
            </>
          }
        >
          重新选择产品将覆盖已有带出信息，且已配置的核算工序可能失效，确认？
        </Modal>
      </>
    )
  },
)

/* ===================== 局部展示组件 ===================== */

function ReadonlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="form-item">
      <label className="form-label">{label}</label>
      <div className={['pcf-readonly-value', mono ? 'mono' : ''].filter(Boolean).join(' ')}>
        {value || '-'}
      </div>
    </div>
  )
}

function ReadonlyGrid({ items }: { items: Array<{ label: string; value: string; mono?: boolean }> }) {
  return (
    <div className="pcf-grid">
      {items.map((item) => (
        <ReadonlyField key={item.label} label={item.label} value={item.value} mono={item.mono} />
      ))}
    </div>
  )
}

export default ProjectStepOne

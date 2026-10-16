import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import {
  Button,
  CascaderSelect,
  FormField,
  ImagePreview,
  ImageUpload,
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
  applyModelToProject,
  boundaryLabelOf,
  createPcfProject,
  fetchCategoryTreeOptions,
  fetchDictOptionsByTypeCode,
  fetchIndustryTreeOptions,
  fetchLifecycleStages,
  fetchPcfMyProductOptions,
  fetchPcfStandardOptions,
  fetchUnitGroupOptions,
  updatePcfProjectStepOne,
} from '@/mock'
import type { PcfStepOnePayload } from '@/mock'
import type { PcfMyProductOption } from '@/mock'
import type {
  DictItem,
  LifecycleStageItem,
  PcfBoundary,
  PcfLifecycleStage,
  PcfProject,
  PcfStandardOption,
  TreeOption,
} from '@/types'
import { DICT_TYPE_SYSTEM_BOUNDARY } from '@/types'
import PcfPanel from './PcfPanel'
import LifecycleStageConfigModal from './LifecycleStageConfigModal'
import LifecycleTree from './LifecycleTree'
import { pcfProductLabel } from './pcfMeta'
import './PcfPage.css'

const PICKER_PAGE_SIZE = 20

/**
 * 声明单位数值：固定为 1（口径 = 「每 1 个声明单位」）。
 * 字段保留在数据模型中（便于后续支持「1 kg / 1000 ml」这类带数量的声明单位），但界面不再录入。
 */
const DECLARED_UNIT_QTY = '1'

interface FormState {
  /** 基本信息 */
  name: string
  ownerOrg: string
  startDate: string
  endDate: string
  remark: string
  /** 核算标准（核算方法，引用标准文件库） */
  methodId: string
  /** 产品（引用我的产品库可选；未引用时自行录入） */
  refProductId: string
  productCode: string
  productName: string
  productSpec: string
  productCategory: string
  productIndustry: string
  /** 产品图片（**必填**；引用产品时带出快照，原型以 data URL 存储） */
  productImageUrl: string
  /** 单位（取值来自计量单位库；默认带出产品单位）——口径为「每 1 个声明单位」 */
  functionalUnit: string
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
  /** 新建草稿模式：步骤①「下一步」保存后才创建核算项目（未保存不落库） */
  creating?: boolean
  onSaved: (project: PcfProject) => void
  /** 草稿保存成功（已落库）后回调，由工作台跳转正式项目 */
  onCreated?: (project: PcfProject) => void
  /** 保存成功后由工作台触发（「下一步」→ 进入步骤②） */
  onNext?: () => void
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
    productSpec: project.productSpec,
    productCategory: project.productCategory ?? '',
    productIndustry: project.productIndustry ?? '',
    productImageUrl: project.productImageUrl ?? '',
    functionalUnit: project.functionalUnit,
    boundary: project.boundary,
    lifecycleStages: project.lifecycleStages ?? [],
  }
}

/**
 * 工作台步骤①「目标与范围」内容区。
 * - 「基本信息与产品」（含统计时间 / 核算标准 / 产品 / 单位）+ 生命周期阶段（含核算边界）。
 * - 生命周期阶段按「核算边界」带出，全部阶段均可勾选 / 取消。
 * - V0.8（2026-10-12）：移除「核算公式」字段——碳核算计算引擎内置代码层级，步骤①不再引用公式配置；
 *   移除「型号」（产品库不再维护型号）与「单位转换系数」。
 * - V1.0（2026-10-14）：**声明/功能单位数值固定为 1、界面不再录入**——口径统一为「每 1 个声明单位」，
 *   字段在数据模型中保留（默认 1），后续如需「1 kg / 1000 ml」这类声明单位再开放。
 * - V0.9（2026-10-13）：基本信息与产品信息合并为一个分组；**移除「项目名称 / 核算主体组织 / 备注」字段**
 *   （核算主体组织取当前登录用户所属组织、自动带出；项目名称由产品名称自动生成，仅内部留存）。
 */
const ProjectStepOne = forwardRef<ProjectStepOneHandle, ProjectStepOneProps>(
  function ProjectStepOne({ project, editable, creating = false, onSaved, onCreated, onNext }, ref) {
    const toast = useToast()

    const [form, setForm] = useState<FormState>(() => toForm(project))
    const [products, setProducts] = useState<PcfMyProductOption[]>([])
    /** 多级下拉选项：计量单位（按类型分组）/ 产品分类（三级）/ 所属行业（行业四级） */
    const [unitTree, setUnitTree] = useState<TreeOption[]>([])
    const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
    const [industryTree, setIndustryTree] = useState<TreeOption[]>([])
    const [standards, setStandards] = useState<PcfStandardOption[]>([])
    const [allStages, setAllStages] = useState<LifecycleStageItem[]>([])
    /** 系统边界字典（仅启用项）：卡片式单选的取值来源 */
    const [boundaryDict, setBoundaryDict] = useState<DictItem[]>([])
    const [configOpen, setConfigOpen] = useState(false)
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
        const [productList, unitTreeList, categoryTreeList, industryTreeList, standardList, stageList, boundaryList] =
          await Promise.all([
            fetchPcfMyProductOptions(),
            fetchUnitGroupOptions(),
            /** PCF 项目的「产品分类」按**分类名称**落库，与既有项目数据口径一致 */
            fetchCategoryTreeOptions('name'),
            fetchIndustryTreeOptions(),
            fetchPcfStandardOptions(),
            fetchLifecycleStages(),
            fetchDictOptionsByTypeCode(DICT_TYPE_SYSTEM_BOUNDARY),
          ])
        setProducts(productList)
        setUnitTree(unitTreeList)
        setCategoryTree(categoryTreeList)
        setIndustryTree(industryTreeList)
        setStandards(standardList)
        setAllStages(stageList)
        setBoundaryDict(boundaryList)
        setLoaded(true)
      })()
    }, [])

    useEffect(() => {
      setForm(toForm(project))
      setErrors({})
    }, [project])

    /**
     * 按「核算边界」带出关联的生命周期阶段：
     * 全部启用阶段进入列表，默认全部纳入，用户可在「生命周期阶段配置」中自由勾选 / 取消。
     */
    const deriveStages = useCallback(
      (boundary: PcfBoundary): PcfLifecycleStage[] => {
        const nameOf = new Map(allStages.map((s) => [s.id, s.name]))
        return allStages
          .filter(
            (s) =>
              s.status === 'enabled' &&
              (s.boundaries.length === 0 || s.boundaries.includes(boundary)),
          )
          .sort((a, b) => a.order - b.order)
          .map((s) => ({
            id: s.id,
            name: s.name,
            level: s.level,
            parentName: s.parentId ? nameOf.get(s.parentId) ?? '' : '',
            custom: false,
            description: s.description,
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
        return { ...prev, lifecycleStages: deriveStages(prev.boundary) }
      })
    }, [loaded, deriveStages])

    /** 已选产品不在「上架」候选中 → 视为已下架（快照继续可用，R-015） */
    const productOffShelf =
      loaded && !!form.refProductId && !products.some((item) => item.id === form.refProductId)

    const unitOptions: TreeOption[] = useMemo(() => unitTree, [unitTree])
    const standardOptions: SelectOption[] = useMemo(
      () =>
        standards.map((item) => ({
          label: `${item.code} ${item.name}`,
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

    /** 选择产品：带出产品字段（带出字段只读）；单位默认取产品「单位」（C07）；阶段按边界重新带出 */
    const applyProduct = (product: PcfMyProductOption) => {
      setForm((prev) => ({
        ...prev,
        refProductId: product.id,
        productCode: product.code,
        productName: product.name,
        productSpec: product.spec,
        productCategory: product.category,
        productIndustry: product.industry,
        productImageUrl: product.imageUrl,
        functionalUnit: product.unit,
        lifecycleStages: deriveStages(prev.boundary),
      }))
      setErrors({})
    }

    /** 切换系统边界：按新边界带出关联阶段（默认全部纳入） */
    const handleBoundaryChange = (boundary: PcfBoundary) => {
      setForm((prev) => ({
        ...prev,
        boundary,
        lifecycleStages: deriveStages(boundary),
      }))
    }

    /** 应用「生命周期阶段配置」弹窗结果 */
    const handleStageConfigConfirm = (stages: PcfLifecycleStage[]) => {
      setForm((prev) => ({ ...prev, lifecycleStages: stages }))
      setConfigOpen(false)
    }

    const handleSubmit = async () => {
      if (!editable || saving) return

      const next: Record<string, string> = {}
      if (!form.startDate || !form.endDate) next.period = '请选择统计时间'
      else if (form.startDate > form.endDate) next.period = '统计时间起始不能晚于结束'
      if (!form.methodId) next.methodId = '请选择核算标准'
      if (!form.productName.trim()) next.productName = '请输入产品名称'
      if (!form.productImageUrl) next.productImageUrl = '请上传产品图片'
      if (!form.functionalUnit) next.functionalUnit = '请选择单位'

      setErrors(next)
      if (Object.keys(next).length > 0) {
        toast('请先完善必填项', 'error')
        return
      }

      setSaving(true)
      try {
        // 项目名称不再由用户录入：按产品名称自动生成内部名称（列表 / 工作台统一按产品展示）
        const autoName = form.productName.trim()
          ? `${form.productName.trim()}·碳足迹核算`
          : form.name || '碳足迹核算'
        const payload: PcfStepOnePayload = {
          name: autoName,
          ownerOrg: form.ownerOrg,
          startDate: form.startDate,
          endDate: form.endDate,
          remark: form.remark,
          boundary: form.boundary,
          methodId: form.methodId,
          refProductId: form.refProductId || undefined,
          productCode: form.productCode,
          productName: form.productName,
          productSpec: form.productSpec,
          productImageUrl: form.productImageUrl,
          productCategory: form.productCategory,
          productIndustry: form.productIndustry,
          productVersion: '',
          functionalUnit: form.functionalUnit,
          // 声明单位数值：默认 1（口径 = 每 1 个声明单位），界面不再录入
          functionalUnitValue: DECLARED_UNIT_QTY,
          lifecycleStages: form.lifecycleStages,
        }

        if (creating) {
          // 保存即落库：先创建核算项目（生成编号），再写入步骤①表单全量字段
          const picked = products.find((item) => item.id === form.refProductId)
          const created = await createPcfProject({
            name: autoName,
            ownerOrg: form.ownerOrg,
            startDate: form.startDate,
            endDate: form.endDate,
            boundary: form.boundary,
            remark: form.remark,
            productSource: picked ? (picked.source === 'custom' ? 'custom' : 'library') : 'custom',
            refProductId: form.refProductId || undefined,
            productCode: form.productCode,
            productName: form.productName,
            productSpec: form.productSpec,
            productImageUrl: form.productImageUrl,
            productCategory: form.productCategory,
            productIndustry: form.productIndustry,
            functionalUnit: form.functionalUnit,
            functionalUnitValue: DECLARED_UNIT_QTY,
          })
          const saved = await updatePcfProjectStepOne(created.id, payload)
          // 引用模型新建：步骤① 落库后把模型的阶段数据项 / 过程节点「引用即复制」进项目
          if (project.sourceModelId) {
            await applyModelToProject(created.id, project.sourceModelId)
          }
          onCreated?.(saved)
          toast('保存成功，核算项目已创建')
          return
        }

        const updated = await updatePcfProjectStepOne(project.id, payload)
        onSaved(updated)
        onNext?.()
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
      { key: 'name', title: '产品名称', width: 220 },
      { key: 'spec', title: '规格', width: 140 },
      { key: 'industry', title: '所属行业', width: 100 },
      { key: 'unit', title: '单位', width: 70 },
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
        <div className="pcf-step-form" data-ann-target="pcf.step1.readonly">
          <PcfPanel title={<span data-ann-target="pcf.step1.form.basic">基本信息与产品</span>} tip="统计时间与核算标准；产品可引用我的产品库，也可自行录入">
            <ReadonlyGrid
              items={[
                { label: '核算编号', value: project.code, mono: true },
                { label: '统计时间', value: `${form.startDate} ~ ${form.endDate}` },
                { label: '核算标准', value: project.method || '-' },
                { label: '产品', value: pcfProductLabel(form.productName, form.productSpec) },
                { label: '产品分类', value: form.productCategory || '-' },
                { label: '所属行业', value: form.productIndustry || '-' },
                { label: '规格', value: form.productSpec || '-' },
                {
                  label: '声明/功能单位',
                  value: form.functionalUnit ? `1 ${form.functionalUnit}` : '-',
                },
              ]}
            />
            <div className="pcf-grid" style={{ marginTop: 'var(--space-md)' }}>
              <FormField label="产品图片">
                <ImagePreview value={form.productImageUrl} />
              </FormField>
            </div>
          </PcfPanel>

          <PcfPanel title="生命周期阶段">
            <div className="pcf-boundary-layout">
              <div className="pcf-boundary-layout-left">
                <FormField label="系统边界">
                  <div className="pcf-readonly-value">{boundaryLabelOf(form.boundary)}</div>
                </FormField>
              </div>
              <div className="pcf-boundary-layout-right">
                <div className="pcf-lifecycle-summary">
                  <span className="pcf-lifecycle-summary-count">
                    已纳入 {form.lifecycleStages.filter((s) => s.included).length} / {form.lifecycleStages.length} 个阶段
                  </span>
                </div>
                <LifecycleTree stages={form.lifecycleStages.filter((s) => s.included)} emptyText="暂未配置" />
              </div>
            </div>
          </PcfPanel>
        </div>
      )
    }

    return (
      <>
        <div className="pcf-step-form" data-ann-target="pcf.step1.page.global">
          <PcfPanel title={<span data-ann-target="pcf.step1.form.basic">基本信息与产品</span>} tip="统计时间与核算标准；产品可引用我的产品库，也可自行录入">
            <div className="pcf-grid">
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
              <FormField label="产品名称" required error={errors.productName} full>
                <div className="pcf-inline">
                  <Input
                    value={form.productName}
                    placeholder="请输入产品名称，或点击右侧「引用产品」带出"
                    invalid={!!errors.productName}
                    onChange={(e) => setForm((prev) => ({ ...prev, productName: e.target.value }))}
                  />
                  <Button
                    data-ann-target="pcf.step1.product.picker"
                    onClick={() => {
                      setPickedId(form.refProductId)
                      setPickerKeyword('')
                      setPickerPage(1)
                      setPickerOpen(true)
                    }}
                  >
                    引用产品
                  </Button>
                  {productOffShelf && <Tag tone="warning">已下架</Tag>}
                </div>
              </FormField>
              <FormField label="规格">
                <Input
                  value={form.productSpec}
                  placeholder="选填"
                  onChange={(e) => setForm((prev) => ({ ...prev, productSpec: e.target.value }))}
                />
              </FormField>
              <FormField label="产品分类">
                <CascaderSelect
                  value={form.productCategory}
                  options={categoryTree}
                  placeholder="选填"
                  searchPlaceholder="搜索分类名称 / 编码"
                  onChange={(value) => setForm((prev) => ({ ...prev, productCategory: value }))}
                />
              </FormField>
              <FormField label="所属行业">
                <CascaderSelect
                  value={form.productIndustry}
                  options={industryTree}
                  placeholder="选填"
                  searchPlaceholder="搜索行业名称 / 编码"
                  onChange={(value) => setForm((prev) => ({ ...prev, productIndustry: value }))}
                />
              </FormField>
              <FormField
                label="声明/功能单位"
                required
                error={errors.functionalUnit}
                hint="核算结果的表达单位，按「每 1 个」计，如 1 双、1 件"
              >
                <CascaderSelect
                  value={form.functionalUnit}
                  placeholder="请选择单位"
                  options={unitOptions}
                  searchPlaceholder="搜索单位符号 / 名称"
                  invalid={!!errors.functionalUnit}
                  onChange={(value) => setForm((prev) => ({ ...prev, functionalUnit: value }))}
                />
              </FormField>
              <FormField label="产品图片" required error={errors.productImageUrl} full>
                <ImageUpload
                  value={form.productImageUrl}
                  invalid={!!errors.productImageUrl}
                  onChange={(productImageUrl) => setForm((prev) => ({ ...prev, productImageUrl }))}
                  tip="必填；引用产品时自动带出，也可自行上传"
                />
              </FormField>
            </div>
          </PcfPanel>

          <PcfPanel title="生命周期阶段" tip="左选系统边界、右看生命周期阶段，按所选边界带出关联阶段，默认全部纳入，可自定义">
            <div className="pcf-boundary-layout">
              <div className="pcf-boundary-layout-left">
                <FormField
                  label="系统边界"
                  required
                  error={errors.boundary}
                  hint="引用「平台支撑 · 数据字典 · 系统边界」，仅展示已启用的边界项（卡片式单选）"
                >
                  <div className="pcf-boundary-cards is-stacked" data-ann-target="pcf.step1.boundary">
                    {boundaryDict.length === 0 && <span className="pcf-placeholder">暂无启用的系统边界字典项</span>}
                    {boundaryDict.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        className={['pcf-boundary-card', form.boundary === item.code ? 'active' : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => handleBoundaryChange(item.code as PcfBoundary)}
                      >
                        <span className="pcf-boundary-radio" aria-hidden />
                        <span className="pcf-boundary-info">
                          <span className="pcf-boundary-label">{item.label}</span>
                          <span className="pcf-boundary-remark">{item.remark || '-'}</span>
                        </span>
                      </button>
                    ))}
                    <Button
                      className="pcf-boundary-config-btn"
                      data-ann-target="pcf.step1.stageConfig"
                      disabled={form.lifecycleStages.length === 0}
                      onClick={() => setConfigOpen(true)}
                    >
                      生命周期阶段配置
                    </Button>
                  </div>
                </FormField>
              </div>
              <div className="pcf-boundary-layout-right">
                <div className="pcf-lifecycle-summary">
                  <span className="pcf-lifecycle-summary-count">
                    已纳入 {form.lifecycleStages.filter((s) => s.included).length} / {form.lifecycleStages.length} 个阶段
                  </span>
                </div>
                <LifecycleTree stages={form.lifecycleStages.filter((s) => s.included)} emptyText="暂无可选生命周期阶段" />
              </div>
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
          title={<span data-ann-target="pcf.step1.product.reconfirm">确认重新选择产品</span>}
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

        <LifecycleStageConfigModal
          open={configOpen}
          stages={form.lifecycleStages}
          onClose={() => setConfigOpen(false)}
          onConfirm={handleStageConfigConfirm}
        />
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

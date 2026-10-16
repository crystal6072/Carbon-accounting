import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  CascaderSelect,
  FormField,
  ImagePreview,
  ImageUpload,
  Input,
  Modal,
  MultiSelect,
  Pagination,
  Select,
  Table,
  Tag,
} from '@/shared/components'
import type { Column, MultiSelectOption, SelectOption } from '@/shared/components'
import {
  PCF_PROJECT_REMARK_MAX,
  boundaryLabelOf,
  fetchCategoryTreeOptions,
  fetchDictOptionsByTypeCode,
  fetchIndustryOptions,
  fetchIndustryTreeOptions,
  fetchLifecycleStages,
  fetchPcfMyProductOptions,
  fetchPcfProductOptions,
  fetchPcfStandardOptions,
  fetchUnitGroupOptions,
} from '@/mock'
import type {
  DictItem,
  LifecycleStageItem,
  PcfBoundary,
  PcfLifecycleStage,
  PcfProductOption,
  PcfStandardOption,
  TreeOption,
} from '@/types'
import { DICT_TYPE_SYSTEM_BOUNDARY } from '@/types'
import PcfPanel from '@/pages/pcf/PcfPanel'
import LifecycleStageConfigModal from '@/pages/pcf/LifecycleStageConfigModal'
import LifecycleTree from '@/pages/pcf/LifecycleTree'
import { flattenCategoryTree } from './modelMeta'
import type { ModelDraft } from './modelDraft'
import '@/pages/pcf/PcfPage.css'

const PICKER_PAGE_SIZE = 20

interface ModelStepOneProps {
  /** `platform` = 后台模型（引用产品库）；`org` = 我的模型（引用我的产品库） */
  mode: 'platform' | 'org'
  draft: ModelDraft
  onChange: (patch: Partial<ModelDraft>) => void
  errors: Record<string, string>
  /** 只读态（查看页）：与新建 / 编辑同版式、同分组，仅字段转为纯文本 */
  readOnly?: boolean
  /** 只读态：名称右侧状态标签（模型状态 / 来源） */
  metaTag?: ReactNode
  /** 只读态：追加到「基本信息」的模型元信息（模型编码 / 维护人 / 更新时间等） */
  metaFields?: Array<{ label: string; value: string; mono?: boolean }>
}

/**
 * 模型向导步骤①「目标与范围」（与 PCF 步骤① 同版式、同字段口径）：
 * - 基本信息：模型名称 + 行业标签 + 核算标准 + 备注；
 * - 产品：产品名称 / 规格 / 产品分类 / 所属行业 / 声明·功能单位（与产品核算步骤①「产品」面板一致）；
 * - 生命周期阶段：左「系统边界」卡片单选（两栏），右「生命周期阶段树」。
 */
export default function ModelStepOne({
  mode,
  draft,
  onChange,
  errors,
  readOnly = false,
  metaTag,
  metaFields,
}: ModelStepOneProps) {
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [industryOptions, setIndustryOptions] = useState<MultiSelectOption[]>([])
  const [industryTree, setIndustryTree] = useState<TreeOption[]>([])
  const [unitTree, setUnitTree] = useState<TreeOption[]>([])
  const [standards, setStandards] = useState<PcfStandardOption[]>([])
  const [allStages, setAllStages] = useState<LifecycleStageItem[]>([])
  const [boundaryDict, setBoundaryDict] = useState<DictItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  /** 可引用产品（后台模型 = 产品库上架产品；我的模型 = 我的产品库上架产品） */
  const [products, setProducts] = useState<PcfProductOption[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerKeyword, setPickerKeyword] = useState('')
  const [pickedId, setPickedId] = useState('')
  const [pickerPage, setPickerPage] = useState(1)

  useEffect(() => {
    void (async () => {
      const [categoryList, industryList, industryTreeList, unitTreeList, standardList, stageList, boundaryList] =
        await Promise.all([
          fetchCategoryTreeOptions('id'),
          fetchIndustryOptions(),
          fetchIndustryTreeOptions(),
          fetchUnitGroupOptions(),
          fetchPcfStandardOptions(),
          fetchLifecycleStages(),
          fetchDictOptionsByTypeCode(DICT_TYPE_SYSTEM_BOUNDARY),
        ])
      setCategoryTree(categoryList)
      setIndustryOptions(industryList.map((name) => ({ label: name, value: name })))
      setIndustryTree(industryTreeList)
      setUnitTree(unitTreeList)
      setStandards(standardList)
      setAllStages(stageList)
      setBoundaryDict(boundaryList)
      setLoaded(true)
    })()
  }, [])

  /** 可引用产品：仅编辑态加载（后台模型引用「产品库」，我的模型引用「我的产品库」） */
  useEffect(() => {
    if (readOnly) return
    void (async () => {
      const list = mode === 'platform' ? await fetchPcfProductOptions() : await fetchPcfMyProductOptions()
      setProducts(list)
    })()
  }, [mode, readOnly])

  /** 按「系统边界」带出关联的生命周期阶段（默认全部纳入，可后续自定义） */
  const deriveStages = useCallback(
    (boundary: PcfBoundary): PcfLifecycleStage[] => {
      const nameOf = new Map(allStages.map((stage) => [stage.id, stage.name]))
      return allStages
        .filter((stage) => stage.status === 'enabled' && (stage.boundaries.length === 0 || stage.boundaries.includes(boundary)))
        .sort((a, b) => a.order - b.order)
        .map((stage) => ({
          id: stage.id,
          name: stage.name,
          level: stage.level,
          parentName: stage.parentId ? nameOf.get(stage.parentId) ?? '' : '',
          custom: false,
          description: stage.description,
          included: true,
        }))
    },
    [allStages],
  )

  /** 首次加载且草稿尚未配置阶段时，按当前边界带出默认阶段（只读态以模型已存阶段为准） */
  useEffect(() => {
    if (!loaded || readOnly) return
    if (draft.lifecycleStages.length > 0) return
    onChange({ lifecycleStages: deriveStages(draft.boundary) })
    // 仅在加载完成后补默认阶段，依赖刻意收敛
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, deriveStages, readOnly])

  const standardOptions: SelectOption[] = useMemo(
    () => standards.map((item) => ({ label: `${item.code} ${item.name}`, value: item.id })),
    [standards],
  )

  const includedStages = draft.lifecycleStages.filter((stage) => stage.included)
  const categoryName = useMemo(
    () => flattenCategoryTree(categoryTree).find((item) => item.id === draft.categoryId)?.name ?? '',
    [categoryTree, draft.categoryId],
  )
  const standardText = useMemo(
    () => standards.find((item) => item.id === draft.standardId)?.code ?? '',
    [standards, draft.standardId],
  )

  const handleBoundaryChange = (boundary: PcfBoundary) => {
    onChange({ boundary, lifecycleStages: deriveStages(boundary) })
  }

  /** 引用产品：带出产品名称 / 规格 / 产品分类 / 所属行业 / 产品图片 / 声明单位（与产品核算步骤①同口径） */
  const applyProduct = (product: PcfProductOption) => {
    onChange({
      productName: product.name,
      productSpec: product.spec,
      productIndustry: product.industry,
      productImageUrl: product.imageUrl,
      functionalUnit: product.unit,
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    })
  }

  const pickerRows = useMemo(() => {
    const keyword = pickerKeyword.trim().toLowerCase()
    if (!keyword) return products
    return products.filter(
      (item) => item.code.toLowerCase().includes(keyword) || item.name.toLowerCase().includes(keyword),
    )
  }, [products, pickerKeyword])

  const pagedPickerRows = pickerRows.slice((pickerPage - 1) * PICKER_PAGE_SIZE, pickerPage * PICKER_PAGE_SIZE)

  const pickerColumns: Column<PcfProductOption>[] = [
    {
      key: 'pick',
      title: '',
      width: 48,
      render: (row) => (
        <input
          type="radio"
          name="model-product-pick"
          checked={pickedId === row.id}
          onChange={() => setPickedId(row.id)}
        />
      ),
    },
    { key: 'code', title: '产品编码', width: 110 },
    { key: 'name', title: '产品名称', width: 200 },
    { key: 'spec', title: '规格', width: 140 },
    { key: 'category', title: '产品分类' },
    { key: 'industry', title: '所属行业', width: 130 },
    { key: 'unit', title: '单位', width: 70 },
  ]

  /* ===================== 只读态（查看页：同版式、同分组） ===================== */

  if (readOnly) {
    return (
      <div className="pcf-step-form">
        <PcfPanel title="基本信息" tip="模型名称与分类用于模型库检索与引用">
          <div className="model-detail-head">
            <span className="model-detail-name">{draft.name}</span>
            {metaTag}
          </div>
          <div className="pcf-grid">
            <ReadonlyField label="行业标签" value={draft.industries.join('、')} />
            <ReadonlyField label="核算标准" value={standardText} />
            <ReadonlyField label="备注" value={draft.remark} />
            {metaFields?.map((item) => (
              <ReadonlyField key={item.label} label={item.label} value={item.value} mono={item.mono} />
            ))}
          </div>
        </PcfPanel>

        <PcfPanel title="产品" tip="与产品核算步骤①「产品」保持一致，引用模型新建核算时可直接带出">
          <div className="pcf-grid">
            <ReadonlyField label="产品名称" value={draft.productName} />
            <ReadonlyField label="规格" value={draft.productSpec} />
            <ReadonlyField label="产品分类" value={categoryName} />
            <ReadonlyField label="所属行业" value={draft.productIndustry} />
            <ReadonlyField
              label="声明/功能单位"
              value={draft.functionalUnit ? `1 ${draft.functionalUnit}` : ''}
            />
          </div>
          <div className="pcf-grid" style={{ marginTop: 'var(--space-md)' }}>
            <FormField label="产品图片">
              <ImagePreview value={draft.productImageUrl} />
            </FormField>
          </div>
        </PcfPanel>

        <PcfPanel title="生命周期阶段" tip="按所选系统边界带出关联阶段，默认全部纳入，可自定义">
          <div className="pcf-boundary-layout">
            <div className="pcf-boundary-layout-left">
              <FormField label="系统边界">
                <div className="pcf-readonly-value">{boundaryLabelOf(draft.boundary)}</div>
              </FormField>
            </div>
            <div className="pcf-boundary-layout-right">
              <div className="pcf-lifecycle-summary">
                <span className="pcf-lifecycle-summary-count">
                  已纳入 {includedStages.length} / {draft.lifecycleStages.length} 个阶段
                </span>
              </div>
              <LifecycleTree stages={includedStages} emptyText="暂未配置生命周期阶段" />
            </div>
          </div>
        </PcfPanel>
      </div>
    )
  }

  /* ===================== 编辑态（新建 / 编辑） ===================== */

  return (
    <>
      <div className="pcf-step-form">
        <PcfPanel title="基本信息" tip="模型名称与分类用于模型库检索与引用">
          <div className="pcf-grid">
            <FormField label="模型名称" required error={errors.name}>
              <Input
                value={draft.name}
                placeholder="如：全竹碳化筷 · 摇篮到大门核算模型"
                invalid={!!errors.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </FormField>
            <FormField label="核算标准" required error={errors.standardId} hint="引用标准文件库（仅现行）">
              <Select
                value={draft.standardId}
                placeholder="请选择"
                options={standardOptions}
                invalid={!!errors.standardId}
                onChange={(e) => onChange({ standardId: e.target.value })}
              />
            </FormField>
            <FormField label="行业标签" hint="模型库按行业筛选的依据，可多选；可与产品「所属行业」不同">
              <MultiSelect
                value={draft.industries}
                options={industryOptions}
                placeholder="请选择，支持多选"
                onChange={(value) => onChange({ industries: value })}
              />
            </FormField>
            <FormField label="备注">
              <Input
                value={draft.remark}
                maxLength={PCF_PROJECT_REMARK_MAX}
                placeholder={`选填，最长 ${PCF_PROJECT_REMARK_MAX} 字符`}
                onChange={(e) => onChange({ remark: e.target.value })}
              />
            </FormField>
          </div>
        </PcfPanel>

        <PcfPanel title="产品" tip="与产品核算步骤①「产品」字段一致；引用本模型新建核算项目时按此带出产品信息">
          <div className="pcf-grid">
            <FormField label="产品名称" required error={errors.productName} full>
              <div className="pcf-inline">
                <Input
                  value={draft.productName}
                  placeholder="请输入产品名称，或点击右侧「引用产品」带出"
                  invalid={!!errors.productName}
                  onChange={(e) => onChange({ productName: e.target.value })}
                />
                <Button
                  onClick={() => {
                    setPickedId('')
                    setPickerKeyword('')
                    setPickerPage(1)
                    setPickerOpen(true)
                  }}
                >
                  引用产品
                </Button>
              </div>
            </FormField>
            <FormField label="规格">
              <Input
                value={draft.productSpec}
                placeholder="选填，如 240mm"
                onChange={(e) => onChange({ productSpec: e.target.value })}
              />
            </FormField>
            <FormField label="产品分类" required error={errors.categoryId} hint="引用统计用产品分类目录">
              <CascaderSelect
                value={draft.categoryId}
                options={categoryTree}
                placeholder="请选择"
                searchPlaceholder="搜索分类名称 / 编码"
                invalid={!!errors.categoryId}
                onChange={(value) => onChange({ categoryId: value })}
              />
            </FormField>
            <FormField label="所属行业" hint="引用行业目录，用于产品口径说明">
              <CascaderSelect
                value={draft.productIndustry}
                options={industryTree}
                placeholder="请选择"
                searchPlaceholder="搜索行业名称 / 编码"
                onChange={(value) => onChange({ productIndustry: value })}
              />
            </FormField>
            <FormField
              label="声明/功能单位"
              required
              error={errors.functionalUnit}
              hint="核算结果的表达单位，按「每 1 个」计，如 1 双、1 件"
            >
              <CascaderSelect
                value={draft.functionalUnit}
                placeholder="请选择单位"
                options={unitTree}
                searchPlaceholder="搜索单位符号 / 名称"
                invalid={!!errors.functionalUnit}
                onChange={(value) => onChange({ functionalUnit: value })}
              />
            </FormField>
            <FormField label="产品图片" required error={errors.productImageUrl} full>
              <ImageUpload
                value={draft.productImageUrl}
                invalid={!!errors.productImageUrl}
                onChange={(productImageUrl) => onChange({ productImageUrl })}
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
                <div className="pcf-boundary-cards is-stacked">
                  {boundaryDict.length === 0 && <span className="pcf-placeholder">暂无启用的系统边界字典项</span>}
                  {boundaryDict.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className={['pcf-boundary-card', draft.boundary === item.code ? 'active' : ''].filter(Boolean).join(' ')}
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
                    disabled={draft.lifecycleStages.length === 0}
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
                  已纳入 {includedStages.length} / {draft.lifecycleStages.length} 个阶段
                </span>
              </div>
              <LifecycleTree stages={includedStages} emptyText="暂无可选生命周期阶段" />
            </div>
          </div>
        </PcfPanel>
      </div>

      <Modal
        open={pickerOpen}
        title={mode === 'platform' ? '选择产品（产品库）' : '选择产品（我的产品库）'}
        size="lg"
        onClose={() => setPickerOpen(false)}
        footer={
          <>
            <Button onClick={() => setPickerOpen(false)}>取消</Button>
            <Button
              variant="primary"
              disabled={!pickedId}
              onClick={() => {
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
            emptyText="暂无可选产品，请先在产品库上架产品"
          />
        </div>
        <Pagination
          total={pickerRows.length}
          page={pickerPage}
          pageSize={PICKER_PAGE_SIZE}
          onChange={setPickerPage}
        />
      </Modal>

      <LifecycleStageConfigModal
        open={configOpen}
        stages={draft.lifecycleStages}
        onClose={() => setConfigOpen(false)}
        onConfirm={(stages) => {
          onChange({ lifecycleStages: stages })
          setConfigOpen(false)
        }}
      />
    </>
  )
}

/* ===================== 局部展示组件 ===================== */

function ReadonlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="form-item">
      <label className="form-label">{label}</label>
      <div className={['pcf-readonly-value', mono ? 'mono' : ''].filter(Boolean).join(' ')}>{value || '-'}</div>
    </div>
  )
}

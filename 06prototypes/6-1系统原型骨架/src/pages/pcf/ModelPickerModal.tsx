import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  CascaderSelect,
  Input,
  Modal,
  MultiSelect,
  Select,
  Tag,
  useToast,
} from '@/shared/components'
import type { MultiSelectOption } from '@/shared/components'
import {
  boundaryLabelOf,
  fetchCategoryTreeOptions,
  fetchIndustryOptions,
  fetchMyModel,
  fetchPcfModelOptions,
  fetchPcfStandardOptions,
  fetchPublishedModel,
} from '@/mock'
import type { CarbonModel, MyModel, PcfModelOption } from '@/mock'
import type { PcfStandardOption, TreeOption } from '@/types'
import ModelCard from '@/pages/model/ModelCard'
import ModelDetailView from '@/pages/model/ModelDetailView'
import {
  EMPTY_MODEL_FILTER,
  MY_MODEL_ORIGIN_TEXT,
  MY_MODEL_ORIGIN_TONE,
  industryLabelOf,
  matchesModelFilter,
  standardBadgeOf,
} from '@/pages/model/modelMeta'
import type { ModelFilterValue } from '@/pages/model/modelMeta'
import '@/pages/model/ModelPage.css'

interface ModelPickerModalProps {
  open: boolean
  /** 打开时的默认 Tab（下拉菜单「从平台 / 从我的」决定） */
  defaultSource?: 'platform' | 'my'
  onClose: () => void
  /** 确认选用：回传模型 id，由调用方路由进工作台草稿 */
  onConfirm: (modelId: string) => void
}

/** 已应用的查询条件（点击「搜索」才生效） */
interface AppliedQuery {
  filter: ModelFilterValue
  keyword: string
}

const EMPTY_APPLIED_QUERY: AppliedQuery = { filter: EMPTY_MODEL_FILTER, keyword: '' }

/**
 * 选模型大弹窗：
 * 顶部 Tab「平台模型库 / 我的模型库」+ 顶部搜索条件（模型名称 / 核算标准 / 产品分类 / 适用行业，
 * 支持「搜索 / 重置」与展开收起）+ 3 列卡片网格；每张卡片支持「预览（大弹窗查看详情）」与「选用」。
 * 确认后由调用方路由到 `pcf/project/new/:modelId` 带入模型内容（引用即复制）。
 */
export default function ModelPickerModal({ open, defaultSource = 'platform', onClose, onConfirm }: ModelPickerModalProps) {
  const toast = useToast()

  const [options, setOptions] = useState<PcfModelOption[]>([])
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [standards, setStandards] = useState<PcfStandardOption[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [tab, setTab] = useState<'platform' | 'my'>(defaultSource)
  const [filter, setFilter] = useState<ModelFilterValue>(EMPTY_MODEL_FILTER)
  const [keyword, setKeyword] = useState('')
  const [applied, setApplied] = useState<AppliedQuery>(EMPTY_APPLIED_QUERY)
  const [expanded, setExpanded] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  /** 模型预览弹窗（选用前预览；弹窗展示，关闭后回到选模型弹窗，不丢失查询条件与已选状态） */
  const [previewTarget, setPreviewTarget] = useState<PcfModelOption | null>(null)
  const [previewModel, setPreviewModel] = useState<CarbonModel | MyModel | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setTab(defaultSource)
    setFilter(EMPTY_MODEL_FILTER)
    setKeyword('')
    setApplied(EMPTY_APPLIED_QUERY)
    setExpanded(false)
    setSelectedId('')
    setLoading(true)
    void (async () => {
      try {
        const [modelOptions, categories, standardList, industryList] = await Promise.all([
          fetchPcfModelOptions(),
          fetchCategoryTreeOptions('id'),
          fetchPcfStandardOptions(),
          fetchIndustryOptions(),
        ])
        setOptions(modelOptions)
        setCategoryTree(categories)
        setStandards(standardList)
        setIndustries(industryList)
      } catch (error) {
        toast(error instanceof Error ? error.message : '模型加载失败', 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [open, defaultSource, toast])

  const rows = useMemo(
    () =>
      options
        .filter((item) => item.source === tab)
        .filter((item) => matchesModelFilter(item, applied.filter, applied.keyword, categoryTree)),
    [options, tab, applied, categoryTree],
  )

  const industryOptions: MultiSelectOption[] = useMemo(
    () => industries.map((name) => ({ label: name, value: name })),
    [industries],
  )
  const standardOptions = useMemo(
    () => standards.map((item) => ({ label: `${item.code} ${item.name}`, value: item.id })),
    [standards],
  )

  const selected = options.find((item) => item.id === selectedId) ?? null

  const switchTab = (next: 'platform' | 'my') => {
    setTab(next)
    setSelectedId('')
  }

  const handleConfirm = useCallback(() => {
    if (!selected) {
      toast('请先选择一个模型', 'error')
      return
    }
    onConfirm(selected.id)
  }, [selected, onConfirm, toast])

  /** 点击「搜索」：应用当前表单条件 */
  const handleSearch = () => setApplied({ filter, keyword })

  /** 点击「重置」：清空表单条件并立即应用 */
  const handleReset = () => {
    setFilter(EMPTY_MODEL_FILTER)
    setKeyword('')
    setApplied(EMPTY_APPLIED_QUERY)
  }

  /** 预览：大弹窗展示模型详情（平台模型库 / 我的模型），关闭后回到本弹窗继续选用 */
  const openPreview = async (model: PcfModelOption) => {
    setPreviewTarget(model)
    setPreviewModel(null)
    setPreviewLoading(true)
    try {
      setPreviewModel(model.source === 'my' ? await fetchMyModel(model.id) : await fetchPublishedModel(model.id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '模型加载失败', 'error')
      setPreviewTarget(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewTarget(null)
    setPreviewModel(null)
  }

  /** 预览弹窗内直接选用：选中并确认，走与底部「选用该模型」一致的出口 */
  const pickFromPreview = () => {
    const target = previewTarget
    closePreview()
    if (target) onConfirm(target.id)
  }

  return (
    <>
    <Modal
      open={open}
      title={<span data-ann-target="pcf.modelPicker.modal">选择核算模型</span>}
      size="xl"
      onClose={previewTarget ? () => {} : onClose}
      footer={
        <>
          <span className="toolbar-tip" style={{ marginRight: 'auto' }}>
            {selected ? `已选：${selected.name}（${selected.code}）` : '未选择模型'}
          </span>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={!selected} onClick={handleConfirm}>
            选用该模型
          </Button>
        </>
      }
    >
      <div className="model-picker-tabs">
        <button
          type="button"
          className={['model-picker-tab', tab === 'platform' ? 'is-active' : ''].filter(Boolean).join(' ')}
          onClick={() => switchTab('platform')}
        >
          平台模型库
        </button>
        <button
          type="button"
          className={['model-picker-tab', tab === 'my' ? 'is-active' : ''].filter(Boolean).join(' ')}
          onClick={() => switchTab('my')}
        >
          我的模型库
        </button>
      </div>

      <div className="card model-picker-query">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">模型名称</span>
            <Input value={keyword} placeholder="请输入模型名称" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">核算标准</span>
            <Select
              value={filter.standardId}
              placeholder="全部现行标准"
              options={standardOptions}
              onChange={(e) => setFilter((prev) => ({ ...prev, standardId: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">产品分类</span>
            <CascaderSelect
              value={filter.categoryId}
              options={categoryTree}
              placeholder="请选择产品分类"
              searchPlaceholder="搜索分类名称 / 编码"
              onChange={(next) => setFilter((prev) => ({ ...prev, categoryId: next }))}
            />
          </div>
          {expanded && (
            <div className="query-item">
              <span className="query-label">适用行业</span>
              <MultiSelect
                value={filter.industries}
                options={industryOptions}
                placeholder="全部行业"
                onChange={(next) => setFilter((prev) => ({ ...prev, industries: next }))}
              />
            </div>
          )}
          <div className="query-actions">
            <button type="button" className="link" onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? '收起' : '展开'}
            </button>
            <Button onClick={handleReset}>重置</Button>
            <Button variant="primary" onClick={handleSearch}>
              搜索
            </Button>
          </div>
        </div>
      </div>

      <section className="model-picker-main">
        <div className="model-lib-toolbar">
          <span className="toolbar-tip">共 {rows.length} 个模型</span>
        </div>

        <div className="model-picker-grid">
          {loading && <div className="model-grid-empty">加载中…</div>}
          {!loading && rows.length === 0 && (
            <div className="model-grid-empty">
              {tab === 'platform' ? '平台暂无符合条件的已发布模型' : '暂无可引用的「我的模型」，可先在模型库收藏'}
            </div>
          )}
          {!loading &&
            rows.map((model) => (
              <ModelCard
                key={model.id}
                code={model.code}
                name={model.name}
                standardName={model.standardName}
                boundary={model.boundary}
                stageCount={model.stageCount}
                itemCount={model.itemCount}
                updatedAt={model.updatedAt}
                cornerStandard={standardBadgeOf(model.standardName)}
                chips={[industryLabelOf(model.industries), boundaryLabelOf(model.boundary)]}
                onPreview={() => void openPreview(model)}
                tags={
                  selectedId === model.id ? (
                    <Tag tone="success">已选</Tag>
                  ) : model.origin ? (
                    <Tag tone={MY_MODEL_ORIGIN_TONE[model.origin]}>{MY_MODEL_ORIGIN_TEXT[model.origin]}</Tag>
                  ) : undefined
                }
                actions={
                  <>
                    <button className="link" onClick={() => void openPreview(model)}>
                      预览
                    </button>
                    <button className="link" onClick={() => setSelectedId(selectedId === model.id ? '' : model.id)}>
                      {selectedId === model.id ? '取消选择' : '选用'}
                    </button>
                  </>
                }
              />
            ))}
        </div>
      </section>

      <div className="toolbar-tip" style={{ marginTop: 8 }}>
        选用后进入工作台草稿：模型内容将带入「目标与范围」与「产品建模」（引用即复制，可在项目内继续编辑）；保存步骤①后落库。
      </div>
    </Modal>

    {/* 模型预览：大弹窗展示详情（与详情页同版式），关闭后回到选模型弹窗，查询条件与已选状态不丢失 */}
    <Modal
      open={!!previewTarget}
      title={previewTarget ? `模型预览 · ${previewTarget.name}` : '模型预览'}
      size="xl"
      onClose={closePreview}
      footer={
        <>
          <Button onClick={closePreview}>关闭</Button>
          <Button variant="primary" onClick={pickFromPreview}>
            选用该模型
          </Button>
        </>
      }
    >
      {previewLoading || !previewModel ? (
        <div className="pcf-placeholder">加载中…</div>
      ) : (
        <ModelDetailView model={previewModel} />
      )}
    </Modal>
    </>
  )
}

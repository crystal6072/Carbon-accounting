import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  CascaderSelect,
  Input,
  MultiSelect,
  PageHeader,
  Pagination,
  Select,
  useToast,
} from '@/shared/components'
import type { MultiSelectOption, SelectOption } from '@/shared/components'
import {
  boundaryLabelOf,
  collectModelToMy,
  fetchCategoryTreeOptions,
  fetchIndustryOptions,
  fetchMyModels,
  fetchPcfStandardOptions,
  fetchPublishedModels,
} from '@/mock'
import type { CarbonModel, MyModel } from '@/mock'
import type { PcfStandardOption, TreeOption } from '@/types'
import ModelCard from './ModelCard'
import {
  EMPTY_MODEL_FILTER,
  MODEL_PAGE_SIZE,
  industryLabelOf,
  isModelFilterEmpty,
  matchesModelFilter,
  standardBadgeOf,
  standardLevelOf,
} from './modelMeta'
import type { ModelFilterValue } from './modelMeta'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 前台 · 模型库（版式对齐竞品并增强）：
 * 顶部条件查询（产品分类 / 核算标准 / 行业标签 / 名称编码）+ 卡片网格（封面角标 + 标签行 + 标准说明）
 * + 「仅看已加入我的模型」快捷过滤 + 分页。
 * 仅展示后台「已发布」模型，只读预览；「加入我的模型」形成本组织私有副本（复制式，不联动）。
 */
export default function FrontendModelLibraryListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [models, setModels] = useState<CarbonModel[]>([])
  const [myModels, setMyModels] = useState<MyModel[]>([])
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [standards, setStandards] = useState<PcfStandardOption[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [filter, setFilter] = useState<ModelFilterValue>(EMPTY_MODEL_FILTER)
  const [keyword, setKeyword] = useState('')
  const [onlyCollected, setOnlyCollected] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [published, mine, categories, standardList, industryList] = await Promise.all([
        fetchPublishedModels(),
        fetchMyModels(),
        fetchCategoryTreeOptions('id'),
        fetchPcfStandardOptions(),
        fetchIndustryOptions(),
      ])
      setModels(published)
      setMyModels(mine)
      setCategoryTree(categories)
      setStandards(standardList)
      setIndustries(industryList)
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filter, keyword, onlyCollected])

  /** 已收藏来源 id 集合（判断卡片「已加入」态，替代竞品的「已购」角标） */
  const collectedSourceIds = useMemo(
    () =>
      new Set(
        myModels
          .filter((item) => item.origin === 'collected' && item.sourceModelId)
          .map((item) => item.sourceModelId as string),
      ),
    [myModels],
  )

  const standardMap = useMemo(
    () => new Map(standards.map((item) => [item.id, item])),
    [standards],
  )

  const rows = useMemo(
    () =>
      models
        .filter((item) => matchesModelFilter(item, filter, keyword, categoryTree))
        .filter((item) => !onlyCollected || collectedSourceIds.has(item.id)),
    [models, filter, keyword, categoryTree, onlyCollected, collectedSourceIds],
  )

  const pagedRows = rows.slice((page - 1) * MODEL_PAGE_SIZE, page * MODEL_PAGE_SIZE)

  const industryOptions: MultiSelectOption[] = useMemo(
    () => industries.map((name) => ({ label: name, value: name })),
    [industries],
  )
  const standardOptions: SelectOption[] = useMemo(
    () => standards.map((item) => ({ label: `${item.code} ${item.name}`, value: item.id })),
    [standards],
  )

  /** 卡片副文案：`标准号：标准名称`（对齐竞品卡片底部的标准说明行） */
  const standardTextOf = (model: CarbonModel): string => {
    const standard = standardMap.get(model.standardId)
    return standard ? `${standard.code}：${standard.name}` : model.standardName
  }

  const handleCollect = async (model: CarbonModel) => {
    try {
      await collectModelToMy(model.id)
      toast(`已加入我的模型：${model.name}`)
      setMyModels(await fetchMyModels())
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const resetAll = () => {
    setFilter(EMPTY_MODEL_FILTER)
    setKeyword('')
    setOnlyCollected(false)
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '模型管理', '模型库']}
        title="模型库"
        description="平台已发布的核算模型模板：可直接用于新建核算项目，或「加入我的模型」形成本组织私有副本（复制式，后续编辑不联动源模型）。"
      />

      <div className="card">
        <div className="query-bar">
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
            <span className="query-label">行业标签</span>
            <MultiSelect
              value={filter.industries}
              options={industryOptions}
              placeholder="全部行业"
              onChange={(next) => setFilter((prev) => ({ ...prev, industries: next }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">模型名称 / 编码</span>
            <Input value={keyword} placeholder="请输入" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-actions">
            <Button disabled={isModelFilterEmpty(filter) && !keyword && !onlyCollected} onClick={resetAll}>
              重置
            </Button>
            <Button variant="primary" onClick={() => setPage(1)}>
              搜索
            </Button>
          </div>
        </div>
      </div>

      <section className="model-lib-main">
        <div className="model-lib-toolbar">
          <div className="model-lib-filters">
            <label className="model-lib-toggle">
              <input
                type="checkbox"
                checked={onlyCollected}
                onChange={(e) => setOnlyCollected(e.target.checked)}
              />
              仅看已加入我的模型
            </label>
            <span className="toolbar-tip">
              共 {rows.length} 个模型 · 已加入 {collectedSourceIds.size} 个
            </span>
          </div>
          <Button onClick={() => navigate('/pcf/my-model')}>前往我的模型</Button>
        </div>

        <div className="model-lib-grid">
          {loading && <div className="model-grid-empty">加载中…</div>}
          {!loading && pagedRows.length === 0 && (
            <div className="model-grid-empty">
              {onlyCollected ? '暂无已加入我的模型的平台模型' : '暂无符合条件的模型'}
            </div>
          )}
          {!loading &&
            pagedRows.map((model) => {
              const collected = collectedSourceIds.has(model.id)
              return (
                <ModelCard
                  key={model.id}
                  code={model.code}
                  name={model.name}
                  standardName={model.standardName}
                  boundary={model.boundary}
                  stageCount={model.lifecycleStages.filter((stage) => stage.included).length}
                  itemCount={model.items.length}
                  updatedAt={model.updatedAt}
                  cornerTag={collected ? '已加入' : '平台'}
                  cornerTone={collected ? 'success' : 'default'}
                  cornerStandard={standardBadgeOf(model.standardName)}
                  chips={[
                    industryLabelOf(model.industries),
                    standardLevelOf(model.standardName),
                    boundaryLabelOf(model.boundary),
                  ]}
                  description={standardTextOf(model)}
                  onPreview={() => navigate(`/pcf/model-libraries/${model.id}`)}
                  actions={
                    <>
                      <button className="link" onClick={() => navigate(`/pcf/model-libraries/${model.id}`)}>
                        预览
                      </button>
                      {collected ? (
                        <span className="toolbar-tip">已加入我的模型</span>
                      ) : (
                        <button className="link" onClick={() => void handleCollect(model)}>
                          加入我的模型
                        </button>
                      )}
                    </>
                  }
                />
              )
            })}
        </div>

        <Pagination total={rows.length} page={page} pageSize={MODEL_PAGE_SIZE} onChange={setPage} />
      </section>
    </>
  )
}

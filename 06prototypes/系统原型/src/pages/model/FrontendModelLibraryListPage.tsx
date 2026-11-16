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
  fetchPcfStandardOptions,
  fetchPublishedModels,
} from '@/mock'
import type { CarbonModel } from '@/mock'
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
 * + 分页。
 * 仅展示后台「已发布」模型，只读预览；卡片展示平台模型**当前版本号**。
 * 「加入我的模型」按当前版本复制一份到本组织（复制式、不联动），**同一模型可重复加入**。
 */
export default function FrontendModelLibraryListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [models, setModels] = useState<CarbonModel[]>([])
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [standards, setStandards] = useState<PcfStandardOption[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [filter, setFilter] = useState<ModelFilterValue>(EMPTY_MODEL_FILTER)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [published, categories, standardList, industryList] = await Promise.all([
        fetchPublishedModels(),
        fetchCategoryTreeOptions('id'),
        fetchPcfStandardOptions(),
        fetchIndustryOptions(),
      ])
      setModels(published)
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
  }, [filter, keyword])

  const standardMap = useMemo(
    () => new Map(standards.map((item) => [item.id, item])),
    [standards],
  )

  const rows = useMemo(
    () => models.filter((item) => matchesModelFilter(item, filter, keyword, categoryTree)),
    [models, filter, keyword, categoryTree],
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

  /** 加入我的模型：按平台模型当前版本复制一份（可重复加入，每次新增一条副本） */
  const handleCollect = async (model: CarbonModel) => {
    try {
      await collectModelToMy(model.id)
      toast(`已加入我的模型：${model.name}（${model.version} 副本）`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const resetAll = () => {
    setFilter(EMPTY_MODEL_FILTER)
    setKeyword('')
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '模型管理', '模型库']}
        title={<span data-ann-target="lib.page.global">模型库</span>}
        description="平台已发布的核算模型模板（展示平台当前版本号）：可直接用于新建核算项目，或「加入我的模型」按当前版本复制一份到本组织（复制式、不联动源模型，可重复加入）。"
      />

      <div className="card">
        <div className="query-bar" data-ann-target="lib.filters">
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
            <Button disabled={isModelFilterEmpty(filter) && !keyword} onClick={resetAll}>
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
          <span className="toolbar-tip">共 {rows.length} 个模型 · 平台已发布</span>
          <Button data-ann-target="lib.goto-mym" onClick={() => navigate('/pcf/my-model')}>前往我的模型</Button>
        </div>

        <div className="model-lib-grid" data-ann-target="lib.grid">
          {loading && <div className="model-grid-empty">加载中…</div>}
          {!loading && pagedRows.length === 0 && <div className="model-grid-empty">暂无符合条件的模型</div>}
          {!loading &&
            pagedRows.map((model) => (
              <ModelCard
                key={model.id}
                code={model.code}
                name={model.name}
                standardName={model.standardName}
                boundary={model.boundary}
                stageCount={model.lifecycleStages.filter((stage) => stage.included).length}
                itemCount={model.items.length}
                updatedAt={model.updatedAt}
                version={model.version}
                cornerTag="平台"
                cornerStandard={standardBadgeOf(model.standardName)}
                imageUrl={model.productImageUrl}
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
                    <button className="link" data-ann-target="lib.join" onClick={() => void handleCollect(model)}>
                      加入我的模型
                    </button>
                  </>
                }
              />
            ))}
        </div>

        <Pagination total={rows.length} page={page} pageSize={MODEL_PAGE_SIZE} onChange={setPage} />
      </section>
    </>
  )
}

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
  Table,
  Tag,
  useToast,
} from '@/shared/components'
import type { Column, MultiSelectOption, SelectOption } from '@/shared/components'
import {
  deleteMyModel,
  fetchCategoryTreeOptions,
  fetchIndustryOptions,
  fetchMyModels,
  fetchPcfStandardOptions,
} from '@/mock'
import type { MyModel } from '@/mock'
import type { MyModelOrigin, PcfStandardOption, TreeOption } from '@/types'
import {
  EMPTY_MODEL_FILTER,
  MODEL_PAGE_SIZE,
  MY_MODEL_ORIGIN_TEXT,
  MY_MODEL_ORIGIN_TONE,
  categoryNameOf,
  flattenCategoryTree,
  industryLabelOf,
  isModelFilterEmpty,
  matchesModelFilter,
} from './modelMeta'
import type { ModelFilterValue } from './modelMeta'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 前台 · 我的模型（组织级，**列表版式**）：来源二态「自己新增（可编辑）/ 收藏副本（只读）」。
 * 顶部条件查询 + 表格列表 + 分页；新建 / 编辑走两步向导，与模型库卡片网格区分开（信息密度优先）。
 */
export default function MyModelListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<MyModel[]>([])
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [standards, setStandards] = useState<PcfStandardOption[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [filter, setFilter] = useState<ModelFilterValue>(EMPTY_MODEL_FILTER)
  const [keyword, setKeyword] = useState('')
  const [origin, setOrigin] = useState<'' | MyModelOrigin>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [models, categories, standardList, industryList] = await Promise.all([
        fetchMyModels(),
        fetchCategoryTreeOptions('id'),
        fetchPcfStandardOptions(),
        fetchIndustryOptions(),
      ])
      setList(models)
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
  }, [filter, keyword, origin])

  const rows = useMemo(
    () =>
      list.filter((item) => {
        if (origin && item.origin !== origin) return false
        return matchesModelFilter(item, filter, keyword, categoryTree)
      }),
    [list, filter, keyword, origin, categoryTree],
  )

  const pagedRows = rows.slice((page - 1) * MODEL_PAGE_SIZE, page * MODEL_PAGE_SIZE)

  /** 分类 id → 名称（列表列展示） */
  const categories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree])

  const industryOptions: MultiSelectOption[] = useMemo(
    () => industries.map((name) => ({ label: name, value: name })),
    [industries],
  )
  const standardOptions: SelectOption[] = useMemo(
    () => standards.map((item) => ({ label: `${item.code} ${item.name}`, value: item.id })),
    [standards],
  )
  const originOptions: SelectOption[] = [
    { label: '自己新增', value: 'manual' },
    { label: '收藏副本', value: 'collected' },
  ]

  const handleDelete = async (model: MyModel) => {
    if (!window.confirm(`确认删除模型「${model.name}」？删除后不可恢复。`)) return
    try {
      await deleteMyModel(model.id)
      toast('删除成功')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  const resetAll = () => {
    setFilter(EMPTY_MODEL_FILTER)
    setKeyword('')
    setOrigin('')
  }

  const columns: Column<MyModel>[] = [
    {
      key: 'name',
      title: '模型名称',
      render: (row) => (
        <div className="model-list-name">
          <button className="link" onClick={() => navigate(`/pcf/my-model/${row.id}`)}>
            {row.name}
          </button>
          <span className="model-list-code mono">{row.code}</span>
        </div>
      ),
    },
    {
      key: 'origin',
      title: '来源',
      width: 116,
      render: (row) => (
        <Tag tone={MY_MODEL_ORIGIN_TONE[row.origin]}>
          {row.origin === 'collected' ? '收藏副本 · 只读' : MY_MODEL_ORIGIN_TEXT[row.origin]}
        </Tag>
      ),
    },
    {
      key: 'category',
      title: '产品分类',
      width: 132,
      render: (row) => (
        <span className="cell-ellipsis" title={categoryNameOf(categories, row.categoryId)}>
          {categoryNameOf(categories, row.categoryId)}
        </span>
      ),
    },
    {
      key: 'standard',
      title: '核算标准',
      width: 168,
      render: (row) => (
        <span className="cell-ellipsis mono" title={row.standardName}>
          {row.standardName || '-'}
        </span>
      ),
    },
    {
      key: 'industries',
      title: '行业标签',
      width: 132,
      render: (row) => (
        <span className="cell-ellipsis" title={row.industries.join('、')}>
          {industryLabelOf(row.industries)}
        </span>
      ),
    },
    {
      key: 'content',
      title: '数据项 / 阶段',
      width: 104,
      render: (row) => (
        <span>
          {row.items.length} / {row.lifecycleStages.filter((stage) => stage.included).length}
        </span>
      ),
    },
    { key: 'updatedAt', title: '更新时间', width: 140 },
    {
      key: 'actions',
      title: '操作',
      width: 124,
      render: (row) => (
        <div className="row-actions">
          <button className="link" onClick={() => navigate(`/pcf/my-model/${row.id}`)}>
            查看
          </button>
          {row.origin === 'manual' ? (
            <>
              <button className="link" onClick={() => navigate(`/pcf/my-model/${row.id}/edit`)}>
                编辑
              </button>
              <button className="link link-danger" onClick={() => void handleDelete(row)}>
                删除
              </button>
            </>
          ) : (
            <span className="toolbar-tip">只读</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '模型管理', '我的模型']}
        title="我的模型"
        description="本组织的核算模型模板：可自定义新建与编辑；从平台模型库收藏得到的副本只读预览（复制式快照，不随源模型联动）。"
        actions={
          <Button variant="primary" onClick={() => navigate('/pcf/my-model/new')}>
            新建模型
          </Button>
        }
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
            <span className="query-label">来源</span>
            <Select
              value={origin}
              placeholder="全部来源"
              options={originOptions}
              onChange={(e) => setOrigin(e.target.value as '' | MyModelOrigin)}
            />
          </div>
          <div className="query-item">
            <span className="query-label">模型名称 / 编码</span>
            <Input value={keyword} placeholder="请输入" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-actions">
            <Button disabled={isModelFilterEmpty(filter) && !keyword && !origin} onClick={resetAll}>
              重置
            </Button>
            <Button variant="primary" onClick={() => setPage(1)}>
              搜索
            </Button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="pcf-table-wrap">
          <Table
            columns={columns}
            data={pagedRows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyText="暂无模型：点击右上角「新建模型」创建，或到「模型库」收藏平台模型"
          />
        </div>
        <div className="model-list-pagination">
          <Pagination total={rows.length} page={page} pageSize={MODEL_PAGE_SIZE} onChange={setPage} />
        </div>
      </div>
    </>
  )
}

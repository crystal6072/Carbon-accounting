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
import type { PcfStandardOption, TreeOption } from '@/types'
import {
  EMPTY_MODEL_FILTER,
  MODEL_PAGE_SIZE,
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
 * 前台 · 我的模型（组织级，**列表版式**）：
 * 顶部条件查询 + 表格列表 + 分页；新建 / 编辑走两步向导，与模型库卡片网格区分开（信息密度优先）。
 * 收藏自平台模型库的副本在详情 / 操作中按只读处理，不在列表额外展示来源列。
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
  }, [filter, keyword])

  const rows = useMemo(
    () => list.filter((item) => matchesModelFilter(item, filter, keyword, categoryTree)),
    [list, filter, keyword, categoryTree],
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
  }

  const columns: Column<MyModel>[] = [
    {
      key: 'name',
      title: '模型名称',
      render: (row) => (
        <div className="model-list-name">
          <button className="link" data-ann-target="mym.row.name" onClick={() => navigate(`/pcf/my-model/${row.id}`)}>
            {row.name}
          </button>
          <span className="model-list-code mono">{row.code}</span>
        </div>
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
    { key: 'updatedAt', title: '更新时间', width: 140 },
    {
      key: 'actions',
      title: '操作',
      width: 124,
      render: (row) => (
        <div className="row-actions" data-ann-target="mym.row.actions">
          <button className="link" data-ann-target="mym.row.view" onClick={() => navigate(`/pcf/my-model/${row.id}`)}>
            查看
          </button>
          {row.origin === 'manual' ? (
            <>
              <button className="link" data-ann-target="mym.row.edit" onClick={() => navigate(`/pcf/my-model/${row.id}/edit`)}>
                编辑
              </button>
              <button className="link link-danger" data-ann-target="mym.row.delete" onClick={() => void handleDelete(row)}>
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
        title={<span data-ann-target="mym.page.global">我的模型</span>}
        actions={
          <Button variant="primary" data-ann-target="mym.new" onClick={() => navigate('/pcf/my-model/new')}>
            新建模型
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="mym.query.bar">
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

      <div className="card">
        <div className="pcf-table-wrap" data-ann-target="mym.list">
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

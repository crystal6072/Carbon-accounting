import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { fetchCategories, fetchProducts, updateProductUseStatus } from '@/mock'
import type { CategoryItem, ProductItem, ProductUseStatus } from '@/types'
import ProductConfirmModal from './ProductConfirmModal'
import { useStatusText, useStatusTone } from './productMeta'
import './ProductPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  categoryId: string
  useStatus: '' | ProductUseStatus
}

const EMPTY_QUERY: QueryState = { code: '', name: '', categoryId: '', useStatus: '' }

export default function ProductListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState<{ product: ProductItem; target: ProductUseStatus } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, categoryList] = await Promise.all([fetchProducts(), fetchCategories()])
      setList(products)
      setCategories(categoryList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categoryName = useMemo(() => {
    const map = new Map<string, CategoryItem>()
    categories.forEach((item) => map.set(item.id, item))
    return map
  }, [categories])

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories
        .slice()
        .sort((a, b) => a.level - b.level || (a.sortNo ?? 9999) - (b.sortNo ?? 9999))
        .map((item) => ({
          label: `${'　'.repeat(item.level - 1)}${item.name}${item.status === 'disabled' ? '（已禁用）' : ''}`,
          value: item.id,
        })),
    [categories],
  )

  const rows = useMemo(() => {
    let data = list
    if (query.code.trim()) {
      const keyword = query.code.trim().toLowerCase()
      data = data.filter((item) => item.code.toLowerCase().includes(keyword))
    }
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.categoryId) {
      data = data.filter((item) => item.categoryId === query.categoryId)
    }
    if (query.useStatus) {
      data = data.filter((item) => item.useStatus === query.useStatus)
    }
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = async () => {
    if (!confirm) return
    try {
      await updateProductUseStatus(confirm.product.id, confirm.target)
      toast(confirm.target === 'on' ? '上架成功' : '下架成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<ProductItem>[] = [
    {
      key: 'code',
      title: '产品编码',
      width: 120,
      render: (row) => (
        <button className="link mono nowrap" onClick={() => navigate(`/basic/product/${row.id}`)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: '产品名称',
      width: 150,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: '产品分类',
      width: 116,
      render: (row) => {
        const category = categoryName.get(row.categoryId)
        if (!category) return '-'
        return category.status === 'disabled' ? (
          <span className="flex gap-xs">
            {category.name}
            <Tag>已禁用</Tag>
          </span>
        ) : (
          category.name
        )
      },
    },
    { key: 'unit', title: '单位', width: 60 },
    {
      key: 'useStatus',
      title: '使用状态',
      width: 80,
      render: (row) => <Tag tone={useStatusTone[row.useStatus]}>{useStatusText[row.useStatus]}</Tag>,
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 148,
      render: (row) => <span className="nowrap">{row.createdAt}</span>,
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 148,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 160,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/basic/product/${row.id}`)}>
            查看
          </button>
          <button className="link" onClick={() => navigate(`/basic/product/${row.id}/edit`)}>
            编辑
          </button>
          {row.useStatus === 'off' ? (
            <button className="link" onClick={() => setConfirm({ product: row, target: 'on' })}>
              上架
            </button>
          ) : (
            <button className="link link-danger" onClick={() => setConfirm({ product: row, target: 'off' })}>
              下架
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '产品库', '产品信息库']}
        title="产品信息库"
        description="产品 = 基本信息 + 工艺 + 工序；产品级上架 / 下架，不做版本化"
        actions={
          <Button variant="primary" onClick={() => navigate('/basic/product/new')}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">产品编码</span>
            <Input
              value={query.code}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">产品名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">产品分类</span>
            <Select
              value={query.categoryId}
              placeholder="全部"
              options={categoryOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, categoryId: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">使用状态</span>
            <Select
              value={query.useStatus}
              placeholder="全部"
              options={[
                { label: '上架', value: 'on' },
                { label: '下架', value: 'off' },
              ]}
              onChange={(e) => setQuery((prev) => ({ ...prev, useStatus: e.target.value as '' | ProductUseStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">产品列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 列表仅展示核心字段，其余字段请进入详情页查看
            </span>
          </div>
          <Button onClick={() => toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)}>导出</Button>
        </div>

        <div className="product-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <ProductConfirmModal
        open={!!confirm}
        product={confirm?.product ?? null}
        target={confirm?.target ?? 'on'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

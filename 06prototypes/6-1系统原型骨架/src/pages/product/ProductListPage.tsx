import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CascaderSelect, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import { collectTreeValues } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { deleteProduct, fetchCategories, fetchCategoryTreeOptions, fetchProducts, updateProductUseStatus } from '@/mock'
import type { CategoryItem, ProductItem, ProductUseStatus, TreeOption } from '@/types'
import ProductConfirmModal from './ProductConfirmModal'
import ProductDeleteModal from './ProductDeleteModal'
import { filterEnabledCategories, useStatusText, useStatusTone } from './productMeta'
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
  /** 产品分类多级选项（一级 / 二级 / 三级），供筛选使用 */
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState<{ product: ProductItem; target: ProductUseStatus } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, categoryList, categoryTreeList] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchCategoryTreeOptions(),
      ])
      setList(products)
      setCategories(categoryList)
      setCategoryTree(categoryTreeList)
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

  const categoryOptions = useMemo<TreeOption[]>(() => filterEnabledCategories(categoryTree), [categoryTree])

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
      /** 选中父级分类时，命中其下所有子级分类 */
      const matched = new Set(collectTreeValues(categoryOptions, query.categoryId))
      data = data.filter((item) => matched.has(item.categoryId))
    }
    if (query.useStatus) {
      data = data.filter((item) => item.useStatus === query.useStatus)
    }
    return data
  }, [list, query, categoryOptions])

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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProduct(deleteTarget.id)
      toast('删除成功')
      setDeleteTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<ProductItem>[] = [
    {
      key: 'code',
      title: <span data-ann-target="product.col.code">产品编码</span>,
      width: 120,
      render: (row) => (
        <button className="link mono nowrap" onClick={() => navigate(`/basic/product/${row.id}`)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: <span data-ann-target="product.col.name">产品名称</span>,
      width: 150,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: <span data-ann-target="product.col.category">产品分类</span>,
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
    { key: 'unit', title: <span data-ann-target="product.col.unit">单位</span>, width: 60 },
    {
      key: 'useStatus',
      title: <span data-ann-target="product.col.status">使用状态</span>,
      width: 80,
      render: (row) => <Tag tone={useStatusTone[row.useStatus]}>{useStatusText[row.useStatus]}</Tag>,
    },
    {
      key: 'createdAt',
      title: <span data-ann-target="product.col.time">创建时间</span>,
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
          <button className="link" data-ann-target="product.row.view" onClick={() => navigate(`/basic/product/${row.id}`)}>
            查看
          </button>
          <button className="link" data-ann-target="product.row.edit" onClick={() => navigate(`/basic/product/${row.id}/edit`)}>
            编辑
          </button>
          {row.useStatus === 'off' ? (
            <button className="link" data-ann-target="product.row.onoff" onClick={() => setConfirm({ product: row, target: 'on' })}>
              上架
            </button>
          ) : (
            <button className="link link-danger" data-ann-target="product.row.onoff" onClick={() => setConfirm({ product: row, target: 'off' })}>
              下架
            </button>
          )}
          {row.useStatus === 'off' && (
            <button className="link link-danger" data-ann-target="product.row.delete" onClick={() => setDeleteTarget(row)}>
              删除
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品库', '产品信息库']}
        title={<span data-ann-target="product.page.global">产品信息库</span>}
        description="产品 = 基本信息 + 工艺 + 工序；产品级上架 / 下架，不做版本化"
        actions={
          <Button variant="primary" data-ann-target="product.add" onClick={() => navigate('/basic/product/new')}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="product.query.bar">
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
            <CascaderSelect
              value={query.categoryId}
              placeholder="全部"
              options={categoryOptions}
              allowParent
              searchPlaceholder="搜索分类名称 / 编码"
              onChange={(value) => setQuery((prev) => ({ ...prev, categoryId: value }))}
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

        <div className="product-table-wrap" data-ann-target="product.list">
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
      <ProductDeleteModal
        open={!!deleteTarget}
        product={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}

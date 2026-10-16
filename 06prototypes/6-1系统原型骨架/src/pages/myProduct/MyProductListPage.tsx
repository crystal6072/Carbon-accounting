import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CascaderSelect, Input, Modal, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import { collectTreeValues } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  deleteMyProduct,
  fetchCategories,
  fetchCategoryTreeOptions,
  fetchMyProductRefProjects,
  fetchMyProducts,
  updateMyProductUseStatus,
} from '@/mock'
import type { MyProductBatchResult } from '@/mock'
import type { CategoryItem, MyProductItem, TreeOption } from '@/types'
import ProductConfirmModal from '@/pages/product/ProductConfirmModal'
import MyProductReferenceModal from './MyProductReferenceModal'
import {
  MY_PRODUCT_BREADCRUMB,
  myProductUseStatusText,
  myProductUseStatusTone,
} from './myProductMeta'
import '@/pages/product/ProductPage.css'
import './MyProductPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  categoryId: string
  useStatus: '' | 'on' | 'off'
}

const EMPTY_QUERY: QueryState = { code: '', name: '', categoryId: '', useStatus: '' }

export default function MyProductListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<MyProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  /** 产品分类多级选项（一级 / 二级 / 三级），供筛选使用 */
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  /** 引用核算项目数（key = 产品 id；引用标准产品同样统计） */
  const [refCountMap, setRefCountMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState<{ product: MyProductItem; target: 'on' | 'off' } | null>(null)
  const [deleting, setDeleting] = useState<MyProductItem | null>(null)
  const [referenceOpen, setReferenceOpen] = useState(false)
  /** 新增产品方式选择：引用产品库 / 自定义产品 */
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, categoryList, categoryTreeList] = await Promise.all([
        fetchMyProducts(),
        fetchCategories(),
        fetchCategoryTreeOptions(),
      ])
      setList(products)
      setCategories(categoryList)
      setCategoryTree(categoryTreeList)
      const counts: Record<string, number> = {}
      await Promise.all(
        products.map(async (item) => {
          counts[item.id] = (await fetchMyProductRefProjects(item.id)).length
        }),
      )
      setRefCountMap(counts)
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

  const categoryOptions = useMemo<TreeOption[]>(() => categoryTree, [categoryTree])

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
      await updateMyProductUseStatus(confirm.product.id, confirm.target)
      toast(confirm.target === 'on' ? '上架成功' : '下架成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteMyProduct(deleting.id)
      toast('删除成功')
      setDeleting(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  /** 引用完成：刷新列表，存在跳过条目时给出汇总提示 */
  const handleReferenced = async (result: MyProductBatchResult) => {
    if (result.failed.length === 0) {
      toast(`引用成功：共 ${result.success} 条`)
    } else {
      toast(`引用完成：成功 ${result.success} 条，跳过 ${result.failed.length} 条`, 'error')
    }
    await load()
  }

  const columns: Column<MyProductItem>[] = [
    {
      key: 'code',
      title: '产品编码',
      width: 150,
      render: (row) => (
        <button className="link mono nowrap" onClick={() => navigate(`/pcf/my-product/${row.id}`)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: '产品名称',
      width: 170,
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
      width: 90,
      render: (row) => (
        <Tag tone={myProductUseStatusTone[row.useStatus]}>{myProductUseStatusText[row.useStatus]}</Tag>
      ),
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
      width: 200,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/pcf/my-product/${row.id}`)}>
            查看
          </button>
          <button className="link" onClick={() => navigate(`/pcf/my-product/${row.id}/edit`)}>
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
          <button
            className="link link-danger"
            disabled={(refCountMap[row.id] ?? 0) > 0}
            title={(refCountMap[row.id] ?? 0) > 0 ? '该产品已被核算项目引用，不可删除' : undefined}
            onClick={() => setDeleting(row)}
          >
            删除
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={MY_PRODUCT_BREADCRUMB}
        title="我的产品库"
        actions={
          <Button variant="primary" data-ann-target="my-product-add" onClick={() => setCreateOpen(true)}>
            新增
          </Button>
        }
      />

      <div className="card" data-ann-target="my-product-list">
        <div className="query-bar" data-ann-target="my-product-query">
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
              onChange={(e) => setQuery((prev) => ({ ...prev, useStatus: e.target.value as '' | 'on' | 'off' }))}
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
            <span className="toolbar-tip">共 {rows.length} 条</span>
          </div>
        </div>

        <div className="product-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <Modal
        open={createOpen}
        title="新增产品"
        size="sm"
        onClose={() => setCreateOpen(false)}
        footer={<Button onClick={() => setCreateOpen(false)}>取消</Button>}
      >
        <div className="my-create-choices">
          <button
            type="button"
            className="my-create-choice"
            data-ann-target="my-product-reference"
            onClick={() => {
              setCreateOpen(false)
              setReferenceOpen(true)
            }}
          >
            <span className="my-create-choice-title">引用产品库</span>
            <span className="my-create-choice-desc">从平台级产品信息库复制一份标准产品到本组织</span>
          </button>
          <button
            type="button"
            className="my-create-choice"
            data-ann-target="my-product-custom"
            onClick={() => {
              setCreateOpen(false)
              navigate('/pcf/my-product/new')
            }}
          >
            <span className="my-create-choice-title">自定义产品</span>
            <span className="my-create-choice-desc">从零新建组织自建产品</span>
          </button>
        </div>
      </Modal>

      <MyProductReferenceModal
        open={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        onSubmitted={(result) => void handleReferenced(result)}
      />

      <ProductConfirmModal
        open={!!confirm}
        product={confirm?.product ?? null}
        target={confirm?.target ?? 'on'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />

      <Modal
        open={!!deleting}
        title="确认删除"
        size="sm"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <div className="modal-confirm-text">
          <div>
            <div>
              确认删除产品「{deleting?.name}」（{deleting?.code}）？
            </div>
            <div className="modal-confirm-tip">删除后不可恢复。</div>
          </div>
        </div>
      </Modal>
    </>
  )
}

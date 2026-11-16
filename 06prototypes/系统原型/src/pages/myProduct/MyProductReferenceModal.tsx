import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal, Pagination, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchBackendProducts, fetchCategories } from '@/mock'
import type { CategoryItem, ProductItem } from '@/types'
import '@/pages/product/ProductPage.css'
import './MyProductPage.css'

const PAGE_SIZE = 6

interface MyProductReferenceModalProps {
  open: boolean
  onClose: () => void
}

/**
 * 前台「我的产品库」→ 从平台产品库选择：
 * 列出平台级产品信息库产品，每行「选择」后直接跳转产品新增编辑页（带入平台产品数据为可编辑副本），
 * 可多次选择复制（业务裁定：引用 = 复制副本，编辑不影响平台源头）。
 */
export default function MyProductReferenceModal({ open, onClose }: MyProductReferenceModalProps) {
  const navigate = useNavigate()
  const [list, setList] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, categoryList] = await Promise.all([fetchBackendProducts(), fetchCategories()])
      setList(products)
      setCategories(categoryList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setKeyword('')
    setPage(1)
    void load()
  }, [open, load])

  const categoryName = useMemo(() => {
    const map = new Map<string, CategoryItem>()
    categories.forEach((item) => map.set(item.id, item))
    return map
  }, [categories])

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    if (!text) return list
    return list.filter((item) => {
      const category = categoryName.get(item.categoryId)?.name ?? ''
      return (
        item.code.toLowerCase().includes(text) ||
        item.name.toLowerCase().includes(text) ||
        category.toLowerCase().includes(text)
      )
    })
  }, [list, keyword, categoryName])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<ProductItem>[] = [
    { key: 'code', title: '产品编码', width: 120, render: (row) => <span className="mono nowrap">{row.code}</span> },
    {
      key: 'name',
      title: '产品名称',
      width: 160,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: '产品分类',
      width: 110,
      render: (row) => {
        const category = categoryName.get(row.categoryId)
        return category?.name ?? '-'
      },
    },
    { key: 'unit', title: '单位', width: 60 },
    {
      key: 'action',
      title: '操作',
      width: 80,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/my-product/new?ref=${row.id}`)}>
          选择
        </button>
      ),
    },
  ]

  return (
    <Modal open={open} title="平台产品库" size="lg" onClose={onClose}>
      <div className="view-block">
        <div className="ref-query">
          <Input
            className="ref-query-input"
            value={keyword}
            placeholder="搜索产品编码 / 产品名称 / 产品分类"
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
          {keyword && (
            <Button className="ref-query-clear" onClick={() => setKeyword('')}>
              清空
            </Button>
          )}
        </div>
        <div className="product-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </Modal>
  )
}

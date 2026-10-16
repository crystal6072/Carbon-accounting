import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchBackendProducts, fetchCategories, fetchMyProducts, referenceBackendProducts } from '@/mock'
import type { MyProductBatchResult } from '@/mock'
import type { CategoryItem, ProductItem } from '@/types'
import '@/pages/product/ProductPage.css'
import './MyProductPage.css'

const PAGE_SIZE = 6

interface MyProductReferenceModalProps {
  open: boolean
  onClose: () => void
  /** 提交完成回调：由列表页统一负责刷新与结果提示 */
  onSubmitted: (result: MyProductBatchResult) => void
}

/**
 * 前台「我的产品库」→ 引用标准产品：
 * 从平台级产品信息库（`PUBLIC`）勾选引用到本组织，**引用 = 复制一份、可编辑副本**（业务裁定 V1.1），
 * 复制后在本模块可见且可编辑 / 上下架 / 删除，平台源头更新不回写本副本；已复制的置灰不可重复复制。
 */
export default function MyProductReferenceModal({ open, onClose, onSubmitted }: MyProductReferenceModalProps) {
  const toast = useToast()
  const [list, setList] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [referencedIds, setReferencedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [products, mine, categoryList] = await Promise.all([
        fetchBackendProducts(),
        fetchMyProducts(),
        fetchCategories(),
      ])
      setList(products)
      setCategories(categoryList)
      // 已复制清单：引用副本与平台产品同 id（引用 = 复制一份到本组织）
      setReferencedIds(mine.filter((item) => item.source === 'referenced').map((item) => item.id))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setCode('')
    setName('')
    setPage(1)
    setSelectedIds(new Set())
    void load()
  }, [open, load])

  const categoryName = useMemo(() => {
    const map = new Map<string, CategoryItem>()
    categories.forEach((item) => map.set(item.id, item))
    return map
  }, [categories])

  const rows = useMemo(() => {
    const codeText = code.trim().toLowerCase()
    const nameText = name.trim()
    return list.filter((item) => {
      if (codeText && !item.code.toLowerCase().includes(codeText)) return false
      if (nameText && !item.name.includes(nameText)) return false
      return true
    })
  }, [list, code, name])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 可引用 = 未被本组织引用 */
  const selectable = (item: ProductItem) => !referencedIds.includes(item.id)

  const selectedItems = useMemo(
    () => rows.filter((item) => selectedIds.has(item.id) && selectable(item)),
    [rows, selectedIds, referencedIds],
  )

  const unreferenced = useMemo(() => list.filter(selectable), [list, referencedIds])

  const toggleRow = (item: ProductItem) => {
    if (!selectable(item)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
  }

  const toggleAllPaged = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      pagedRows.filter(selectable).forEach((row) => (checked ? next.add(row.id) : next.delete(row.id)))
      return next
    })
  }

  const allPagedSelected =
    pagedRows.filter(selectable).length > 0 && pagedRows.filter(selectable).every((row) => selectedIds.has(row.id))

  const columns: Column<ProductItem>[] = [
    {
      key: 'selection',
      title: (
        <input
          type="checkbox"
          className="factor-check"
          aria-label="全选当前页"
          checked={allPagedSelected}
          onChange={(e) => toggleAllPaged(e.target.checked)}
        />
      ),
      width: 56,
      align: 'center',
      render: (row) => (
        <input
          type="checkbox"
          className="factor-check"
          aria-label={`选择产品 ${row.name}`}
          checked={selectedIds.has(row.id)}
          disabled={!selectable(row)}
          onChange={() => toggleRow(row)}
        />
      ),
    },
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
      key: 'referenced',
      title: '引用状态',
      width: 90,
      render: (row) =>
        referencedIds.includes(row.id) ? <Tag tone="success">已引用</Tag> : <Tag tone="default">未引用</Tag>,
    },
  ]

  const runReference = async (ids: string[]) => {
    if (ids.length === 0) return
    setSubmitting(true)
    try {
      const result = await referenceBackendProducts(ids)
      setSelectedIds(new Set())
      onSubmitted(result)
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '引用失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => runReference(selectedItems.map((item) => item.id))
  const handleReferenceAll = () => runReference(unreferenced.map((item) => item.id))

  return (
    <Modal
      open={open}
      title="引用标准产品"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={selectedItems.length === 0 || submitting} onClick={handleSubmit}>
            {submitting ? '引用中…' : `引用所选产品（${selectedItems.length}）`}
          </Button>
        </>
      }
    >
      <div className="view-block">
        <div className="my-reference-modal-tip" data-ann-target="my-product-reference">
          仅可引用已上架的平台级标准产品；引用后将复制一份可编辑副本到本组织。
        </div>
        <div className="view-block-title flex-between">
          <span>平台级产品信息库（后台 · `PUBLIC` · 已上架）</span>
          <Button size="small" disabled={unreferenced.length === 0 || submitting} onClick={handleReferenceAll}>
            全部引用
          </Button>
        </div>
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">产品编码</span>
            <Input value={code} placeholder="请输入" onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">产品名称</span>
            <Input value={name} placeholder="请输入" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="query-actions">
            <Button
              onClick={() => {
                setCode('')
                setName('')
                setPage(1)
              }}
            >
              重置
            </Button>
          </div>
        </div>
        <div className="product-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </Modal>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, CascaderSelect, Input, Modal, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import { collectTreeValues } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  fetchBackendProcesses,
  fetchCategories,
  fetchCategoryTreeOptions,
  fetchMyProcesses,
  referenceBackendProcesses,
} from '@/mock'
import type { MyProcessBatchResult } from '@/mock'
import type { CategoryItem, ProcessItem, TreeOption } from '@/types'
import '@/pages/process/ProcessPage.css'
import './MyProcessPage.css'

const PAGE_SIZE = 6

interface MyProcessReferenceModalProps {
  open: boolean
  onClose: () => void
  /** 提交完成回调：由列表页统一负责刷新与结果提示 */
  onSubmitted: (result: MyProcessBatchResult) => void
}

/**
 * 前台「我的工艺库」→ 引用后台工艺：
 * 从平台级工艺流程库（`PUBLIC`）勾选引用到本组织，**引用 = 只读指向、不落库**，
 * 引用后在本模块可见且只读，不可编辑 / 删除，可用性随后台工艺流程库；已引用的置灰不可重复引用。
 */
export default function MyProcessReferenceModal({ open, onClose, onSubmitted }: MyProcessReferenceModalProps) {
  const toast = useToast()
  const [list, setList] = useState<ProcessItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  /** 产品分类多级选项（一级 / 二级 / 三级），供筛选使用 */
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [referencedIds, setReferencedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [processes, categoryList, categoryTreeList, mine] = await Promise.all([
        fetchBackendProcesses(),
        fetchCategories(),
        fetchCategoryTreeOptions(),
        fetchMyProcesses(),
      ])
      setList(processes)
      setCategories(categoryList)
      setCategoryTree(categoryTreeList)
      // 已引用清单：引用项与后台工艺同 id（引用不落库，只读指向）
      setReferencedIds(mine.filter((item) => item.source === 'referenced').map((item) => item.id))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setCode('')
    setName('')
    setCategoryId('')
    setPage(1)
    setSelectedIds(new Set())
    void load()
  }, [open, load])

  const categoryOptions = useMemo<TreeOption[]>(() => categoryTree, [categoryTree])

  const categoryName = useMemo(() => {
    const map = new Map<string, CategoryItem>()
    categories.forEach((item) => map.set(item.id, item))
    return map
  }, [categories])

  const rows = useMemo(() => {
    const codeText = code.trim().toLowerCase()
    const nameText = name.trim()
    /** 选中父级分类时，命中其下所有子级分类 */
    const matched = categoryId ? new Set(collectTreeValues(categoryOptions, categoryId)) : null
    return list.filter((item) => {
      if (codeText && !item.code.toLowerCase().includes(codeText)) return false
      if (nameText && !item.name.includes(nameText)) return false
      if (matched && !matched.has(item.categoryId)) return false
      return true
    })
  }, [list, code, name, categoryId, categoryOptions])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 可引用 = 未被本组织引用 */
  const selectable = (item: ProcessItem) => !referencedIds.includes(item.id)

  const selectedItems = useMemo(
    () => rows.filter((item) => selectedIds.has(item.id) && selectable(item)),
    [rows, selectedIds, referencedIds],
  )

  const unreferenced = useMemo(() => list.filter(selectable), [list, referencedIds])

  const toggleRow = (item: ProcessItem) => {
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

  const columns: Column<ProcessItem>[] = [
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
          aria-label={`选择工艺流程 ${row.name}`}
          checked={selectedIds.has(row.id)}
          disabled={!selectable(row)}
          onChange={() => toggleRow(row)}
        />
      ),
    },
    {
      key: 'code',
      title: '工艺流程编码',
      width: 130,
      render: (row) => <span className="mono nowrap">{row.code}</span>,
    },
    {
      key: 'name',
      title: '工艺流程名称',
      width: 170,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: '适用产品分类',
      width: 120,
      render: (row) => categoryName.get(row.categoryId)?.name ?? '-',
    },
    {
      key: 'lifecycleStage',
      title: '所属生命周期阶段',
      width: 130,
      render: (row) => <span className="nowrap">{row.lifecycleStage || '-'}</span>,
    },
    {
      key: 'operations',
      title: '工序数',
      width: 80,
      render: (row) => <span className="nowrap">{row.operations.length} 道</span>,
    },
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
      const result = await referenceBackendProcesses(ids)
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
      title="引用后台工艺"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={selectedItems.length === 0 || submitting} onClick={handleSubmit}>
            {submitting ? '引用中…' : `引用所选工艺（${selectedItems.length}）`}
          </Button>
        </>
      }
    >
      <div className="view-block" data-ann-target="my-process.reference">
        <div className="view-block-title flex-between">
          <span>平台级工艺流程库（后台 · `PUBLIC` · 启用中）</span>
          <Button size="small" disabled={unreferenced.length === 0 || submitting} onClick={handleReferenceAll}>
            全部引用
          </Button>
        </div>
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">工艺流程编码</span>
            <Input value={code} placeholder="请输入" onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">工艺流程名称</span>
            <Input value={name} placeholder="请输入" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">适用产品分类</span>
            <CascaderSelect
              value={categoryId}
              placeholder="全部"
              options={categoryOptions}
              allowParent
              searchPlaceholder="搜索分类名称 / 编码"
              onChange={(value) => setCategoryId(value)}
            />
          </div>
          <div className="query-actions">
            <Button
              onClick={() => {
                setCode('')
                setName('')
                setCategoryId('')
                setPage(1)
              }}
            >
              重置
            </Button>
          </div>
        </div>
        <div className="process-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </Modal>
  )
}

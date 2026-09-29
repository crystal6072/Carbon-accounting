import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Pagination, Select, Table, Tag } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { fetchBackendFactors, referenceBackendFactors } from '@/mock'
import type { FactorBatchResult } from '@/mock'
import type { FactorCategory, FactorItem } from '@/types'
import {
  factorCategoryOrder,
  factorCategoryText,
  factorCategoryTone,
  factorUnitText,
  industryText,
  publisherText,
} from './factorMeta'

const PAGE_SIZE = 8

interface FactorReferenceModalProps {
  open: boolean
  onClose: () => void
  /** 提交完成回调：由列表页统一负责刷新与结果展示 */
  onSubmitted: (result: FactorBatchResult) => void
}

/**
 * 前台「我的因子库」→ 引用因子库：
 * 批量勾选后台排放因子库（environment 库）中启用中的因子，**以引用方式**纳入本组织，
 * 引用后因子在「我的因子库」可见且**只读**；已引用的因子置灰不可重复引用。
 * 另提供「全部引用」：一次引用因子库中所有未引用因子。
 */
export default function FactorReferenceModal({ open, onClose, onSubmitted }: FactorReferenceModalProps) {
  const [list, setList] = useState<FactorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<'' | FactorCategory>('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchBackendFactors())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setKeyword('')
    setCategory('')
    setPage(1)
    setSelectedIds(new Set())
    void load()
  }, [open, load])

  const categoryOptions: SelectOption[] = useMemo(
    () => factorCategoryOrder.map((item) => ({ label: factorCategoryText[item], value: item })),
    [],
  )

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return list.filter((item) => {
      if (category && item.category !== category) return false
      if (!text) return true
      return (
        item.name.toLowerCase().includes(text) ||
        item.alias.toLowerCase().includes(text) ||
        item.code.toLowerCase().includes(text)
      )
    })
  }, [list, keyword, category])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 可引入 = 后台维护 + 未引入 */
  const selectable = (item: FactorItem) => !item.referenced

  const selectedItems = useMemo(
    () => rows.filter((item) => selectedIds.has(item.id) && selectable(item)),
    [rows, selectedIds],
  )

  /** 全部未引用因子（「全部引用」的范围，不受查询条件与分页影响） */
  const unreferenced = useMemo(() => list.filter(selectable), [list])

  const toggleRow = (item: FactorItem) => {
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

  const columns: Column<FactorItem>[] = [
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
          aria-label={`选择因子 ${row.name}`}
          checked={selectedIds.has(row.id)}
          disabled={!selectable(row)}
          onChange={() => toggleRow(row)}
        />
      ),
    },
    { key: 'code', title: '因子编码', width: 88, render: (row) => <span className="mono nowrap">{row.code}</span> },
    { key: 'name', title: '因子名称', width: 160, render: (row) => <span className="nowrap">{row.name}</span> },
    { key: 'alias', title: '因子别名', width: 130, render: (row) => <span className="nowrap">{row.alias || '-'}</span> },
    {
      key: 'category',
      title: '因子分类',
      width: 116,
      render: (row) => <Tag tone={factorCategoryTone[row.category]}>{factorCategoryText[row.category]}</Tag>,
    },
    {
      key: 'value',
      title: '因子值 / 单位',
      width: 150,
      render: (row) => (
        <span className="mono nowrap">
          {row.value} {factorUnitText(row)}
        </span>
      ),
    },
    {
      key: 'industries',
      title: '适用行业',
      width: 170,
      render: (row) => (
        <span className="cell-ellipsis" title={industryText(row)}>
          {industryText(row)}
        </span>
      ),
    },
    { key: 'publisher', title: '发布机构', width: 190, render: (row) => publisherText(row) },
    {
      key: 'referenced',
      title: '引用状态',
      width: 90,
      render: (row) =>
        row.referenced ? <Tag tone="success">已引用</Tag> : <Tag tone="default">未引用</Tag>,
    },
  ]

  const runReference = async (ids: string[]) => {
    if (ids.length === 0) return
    setSubmitting(true)
    try {
      const result = await referenceBackendFactors(ids)
      setSelectedIds(new Set())
      onSubmitted(result)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => runReference(selectedItems.map((item) => item.id))

  /** 全部引用：一次引用当前因子库中所有未引用因子 */
  const handleReferenceAll = () => runReference(unreferenced.map((item) => item.id))

  return (
    <Modal
      open={open}
      title="引用因子库"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            disabled={selectedItems.length === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? '引用中…' : `引用所选因子（${selectedItems.length}）`}
          </Button>
        </>
      }
    >
      <div className="view-block">
        <div className="view-block-title flex-between">
          <span>后台排放因子库（environment 库 · 启用中）</span>
          <Button size="small" disabled={unreferenced.length === 0 || submitting} onClick={handleReferenceAll}>
            全部引用
          </Button>
        </div>
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">因子名称 / 别名</span>
            <Input value={keyword} placeholder="请输入" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">因子分类</span>
            <Select
              value={category}
              placeholder="全部"
              options={categoryOptions}
              onChange={(e) => setCategory(e.target.value as '' | FactorCategory)}
            />
          </div>
          <div className="query-actions">
            <Button
              onClick={() => {
                setKeyword('')
                setCategory('')
                setPage(1)
              }}
            >
              重置
            </Button>
          </div>
        </div>
        <div className="factor-modal-table">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </Modal>
  )
}

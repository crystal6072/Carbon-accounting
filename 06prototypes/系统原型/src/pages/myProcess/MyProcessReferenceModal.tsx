import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal, Pagination, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchBackendProcesses, fetchCategories } from '@/mock'
import type { CategoryItem, ProcessItem } from '@/types'
import '@/pages/process/ProcessPage.css'
import './MyProcessPage.css'

const PAGE_SIZE = 6

interface MyProcessReferenceModalProps {
  open: boolean
  onClose: () => void
}

/**
 * 前台「我的工艺库」→ 从平台工艺库选择：
 * 列出平台级工艺流程库工艺，每行「选择」后直接跳转工艺新增编辑页（带入平台工艺数据为可编辑副本），
 * 可多次选择复制（业务裁定：引用 = 复制副本，编辑不影响平台源头，与「我的产品库」一致）。
 */
export default function MyProcessReferenceModal({ open, onClose }: MyProcessReferenceModalProps) {
  const navigate = useNavigate()
  const [list, setList] = useState<ProcessItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [processes, categoryList] = await Promise.all([fetchBackendProcesses(), fetchCategories()])
      setList(processes)
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
        item.name.toLowerCase().includes(text) ||
        item.code.toLowerCase().includes(text) ||
        category.toLowerCase().includes(text) ||
        (item.lifecycleStage ?? '').toLowerCase().includes(text)
      )
    })
  }, [list, keyword, categoryName])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<ProcessItem>[] = [
    {
      key: 'name',
      title: '工艺流程名称',
      width: 180,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: '适用产品分类',
      width: 140,
      render: (row) => {
        const category = categoryName.get(row.categoryId)
        return category?.name ?? '-'
      },
    },
    {
      key: 'lifecycleStage',
      title: '所属生命周期阶段',
      width: 150,
      render: (row) => <span className="nowrap">{row.lifecycleStage || '-'}</span>,
    },
    {
      key: 'action',
      title: '操作',
      width: 80,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/my-process/new?ref=${row.id}`)}>
          选择
        </button>
      ),
    },
  ]

  return (
    <Modal open={open} title="平台工艺库" size="lg" onClose={onClose}>
      <div className="view-block" data-ann-target="my-process.reference">
        <div className="ref-query">
          <Input
            className="ref-query-input"
            value={keyword}
            placeholder="搜索工艺名称 / 分类 / 生命周期阶段"
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
        <div className="process-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </Modal>
  )
}

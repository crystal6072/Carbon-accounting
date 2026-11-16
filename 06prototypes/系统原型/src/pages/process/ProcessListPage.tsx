import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { exportWorkbook, timestampedName } from '@/shared/utils/excel'
import {
  deleteProcess,
  fetchCategories,
  fetchProcesses,
  updateProcessUseStatus,
} from '@/mock'
import type { CategoryItem, EnableStatus, ProcessItem } from '@/types'
import ProcessConfirmModal from './ProcessConfirmModal'
import type { ProcessConfirmMode } from './ProcessConfirmModal'
import { useStatusText, useStatusTone } from './processMeta'
import './ProcessPage.css'

const PAGE_SIZE = 20

interface QueryState {
  name: string
  categoryText: string
  useStatus: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = {
  name: '',
  categoryText: '',
  useStatus: '',
}

export default function ProcessListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<ProcessItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ process: ProcessItem; mode: ProcessConfirmMode } | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [processes, categoryList] = await Promise.all([
        fetchProcesses(),
        fetchCategories(),
      ])
      setList(processes)
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

  const rows = useMemo(() => {
    let data = list
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.categoryText.trim()) {
      const keyword = query.categoryText.trim().toLowerCase()
      data = data.filter((item) => {
        const cat = categoryName.get(item.categoryId)
        return cat ? `${cat.name} ${cat.code}`.toLowerCase().includes(keyword) : false
      })
    }
    if (query.useStatus) {
      data = data.filter((item) => item.useStatus === query.useStatus)
    }
    return data
  }, [list, query, categoryName])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = async () => {
    if (!confirm) return
    const { process: target, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteProcess(target.id)
        toast('删除成功')
      } else {
        await updateProcessUseStatus(target.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(mode === 'enable' ? '上架成功' : '下架成功')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /**
   * 导出 Excel：导出当前搜索范围内的全部工艺流程（与搜索条件匹配，与分页无关），
   * 工序明细按工序顺序以「工序1 -> 工序2」形式内联为一列。
   */
  const handleExport = async () => {
    if (rows.length === 0) {
      toast('当前搜索范围内没有可导出的数据', 'error')
      return
    }
    setExporting(true)
    try {
      const processRows = rows.map((item) => {
        const detailText = [...item.operations]
          .sort((a, b) => a.order - b.order)
          .map((op) => op.opName)
          .join(' -> ')
        return [
          item.name,
          categoryName.get(item.categoryId)?.name ?? '-',
          item.lifecycleStage || '-',
          useStatusText[item.useStatus],
          item.operations.length,
          detailText || '-',
          item.updatedAt,
        ]
      })

      await exportWorkbook(timestampedName('工艺流程'), [
        {
          name: '工艺流程',
          columns: [
            { title: '工艺流程名称', width: 24 },
            { title: '适用产品分类' },
            { title: '所属生命周期阶段' },
            { title: '上架状态' },
            { title: '工序数量' },
            { title: '工序明细', width: 40 },
            { title: '更新时间', width: 18 },
          ],
          rows: processRows,
        },
      ])
      toast(`导出成功，共 ${rows.length} 个工艺流程`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'error')
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<ProcessItem>[] = [
    {
      key: 'name',
      title: <span data-ann-target="process.col.name">工艺流程名称</span>,
      width: 170,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: <span data-ann-target="process.col.category">适用产品分类</span>,
      width: 140,
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
    {
      key: 'lifecycleStage',
      title: <span data-ann-target="process.col.lifecycle">所属生命周期阶段</span>,
      width: 140,
      render: (row) => <span className="nowrap">{row.lifecycleStage || '-'}</span>,
    },
    {
      key: 'useStatus',
      title: <span data-ann-target="process.col.status">上架状态</span>,
      width: 100,
      render: (row) => <Tag tone={useStatusTone[row.useStatus]}>{useStatusText[row.useStatus]}</Tag>,
    },
    {
      key: 'operations',
      title: '工序数量',
      width: 100,
      render: (row) => <span className="nowrap">{row.operations.length} 道</span>,
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 150,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 170,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="process.row.view" onClick={() => navigate(`/basic/process/${row.id}`)}>
            查看
          </button>
          <button className="link" data-ann-target="process.row.edit" onClick={() => navigate(`/basic/process/${row.id}/edit`)}>
            编辑
          </button>
          {row.useStatus === 'disabled' ? (
            <>
              <button className="link" data-ann-target="process.row.enable" onClick={() => setConfirm({ process: row, mode: 'enable' })}>
                上架
              </button>
              <button className="link link-danger" data-ann-target="process.row.delete" onClick={() => setConfirm({ process: row, mode: 'delete' })}>
                删除
              </button>
            </>
          ) : (
            <button className="link link-danger" data-ann-target="process.row.disable" onClick={() => setConfirm({ process: row, mode: 'disable' })}>
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
        breadcrumb={['系统管理', '工艺流程管理', '工艺流程']}
        title={<span data-ann-target="process.page.global">工艺流程</span>}
        actions={
          <Button variant="primary" data-ann-target="process.add" onClick={() => navigate('/basic/process/new')}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="process.query.bar">
          <div className="query-item">
            <span className="query-label">工艺流程名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">适用产品分类</span>
            <Input
              value={query.categoryText}
              placeholder="名称 / 编码模糊匹配"
              onChange={(e) => setQuery((prev) => ({ ...prev, categoryText: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">上架状态</span>
            <Select
              value={query.useStatus}
              placeholder="全部"
              options={[
                { label: '上架', value: 'enabled' },
                { label: '下架', value: 'disabled' },
              ]}
              onChange={(e) => setQuery((prev) => ({ ...prev, useStatus: e.target.value as '' | EnableStatus }))}
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
            <span className="toolbar-title">工艺流程列表</span>
          </div>
          <Button variant="primary" disabled={exporting} onClick={handleExport}>
            {exporting ? '导出中…' : '导出'}
          </Button>
        </div>

        <div className="process-table-wrap" data-ann-target="process.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <ProcessConfirmModal
        open={!!confirm}
        process={confirm?.process ?? null}
        mode={confirm?.mode ?? 'enable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

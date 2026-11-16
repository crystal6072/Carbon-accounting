import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  batchUpdateCarbonDetectionStatus,
  deleteCarbonDetection,
  fetchCarbonDetections,
  updateCarbonDetectionStatus,
} from '@/mock'
import type { CarbonDetectionItem, ShelfStatus } from '@/types'
import CarbonDetectionConfirmModal from './CarbonDetectionConfirmModal'
import type { ConfirmMode } from './CarbonDetectionConfirmModal'
import CarbonDetectionFormModal from './CarbonDetectionFormModal'
import CarbonDetectionViewModal from './CarbonDetectionViewModal'
import { canDeleteDetection, shelfStatusText, shelfStatusTone } from './carbonDetectionMeta'
import './CarbonDetectionPage.css'

const PAGE_SIZE = 20

interface QueryState {
  reportNo: string
  sampleName: string
  detectionAgency: string
  status: '' | ShelfStatus
}

const EMPTY_QUERY: QueryState = {
  reportNo: '',
  sampleName: '',
  detectionAgency: '',
  status: '',
}

export default function CarbonDetectionListPage() {
  const toast = useToast()

  const [list, setList] = useState<CarbonDetectionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ item: CarbonDetectionItem; mode: ConfirmMode } | null>(null)
  const [batchStatus, setBatchStatus] = useState<ShelfStatus | null>(null)
  const [batching, setBatching] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchCarbonDetections())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { label: '上架', value: 'on_shelf' },
      { label: '下架', value: 'off_shelf' },
    ],
    [],
  )

  const rows = useMemo(() => {
    let data = list
    if (query.reportNo.trim()) {
      data = data.filter((item) => item.reportNo.toLowerCase().includes(query.reportNo.trim().toLowerCase()))
    }
    if (query.sampleName.trim()) {
      data = data.filter((item) => item.sampleName.includes(query.sampleName.trim()))
    }
    if (query.detectionAgency.trim()) {
      data = data.filter((item) => item.detectionAgency.includes(query.detectionAgency.trim()))
    }
    if (query.status) data = data.filter((item) => item.status === query.status)
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectedItems = useMemo(() => list.filter((item) => selectedIds.has(item.id)), [list, selectedIds])
  const allPagedSelected = pagedRows.length > 0 && pagedRows.every((row) => selectedIds.has(row.id))

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPaged = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      pagedRows.forEach((row) => (checked ? next.add(row.id) : next.delete(row.id)))
      return next
    })
  }

  const openView = (id: string) => {
    setViewId(id)
    setViewOpen(true)
  }

  const openEdit = (id: string | null) => {
    setEditId(id)
    setFormOpen(true)
  }

  const handleRowConfirm = async () => {
    if (!confirm) return
    const { item, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteCarbonDetection(item.id)
        toast('删除成功')
      } else {
        const status: ShelfStatus = mode === 'shelf_on' ? 'on_shelf' : 'off_shelf'
        await updateCarbonDetectionStatus(item.id, status)
        toast(mode === 'shelf_on' ? '上架成功' : '下架成功')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleBatchConfirm = async () => {
    if (!batchStatus) return
    const status = batchStatus
    const action = status === 'on_shelf' ? '上架' : '下架'
    setBatching(true)
    try {
      const result = await batchUpdateCarbonDetectionStatus(
        selectedItems.map((item) => item.id),
        status,
      )
      setBatchStatus(null)
      setSelectedIds(new Set())
      await load()
      if (result.failed.length === 0) toast(`批量${action}成功：共 ${result.success} 条`)
      else toast(`批量${action}完成：成功 ${result.success} 条，跳过 ${result.failed.length} 条`, 'error')
    } catch (error) {
      toast(error instanceof Error ? error.message : '批量操作失败', 'error')
    } finally {
      setBatching(false)
    }
  }

  const handleSaved = async () => {
    setFormOpen(false)
    setEditId(null)
    await load()
  }

  /** 导出：按当前查询条件生成 CSV（保留导出；无数据时按钮不渲染） */
  const handleExport = () => {
    try {
      const header = [
        '报告编号',
        '样品名称',
        '委托单位',
        '检测机构',
        '样品数量',
        '检测周期',
        '收样日期',
        '检测项目及结果',
        '报告日期',
        '检测标准',
        '客户信息',
        '附件数',
        '使用状态',
      ]
      const lines = rows.map((item) => [
        item.reportNo,
        item.sampleName,
        item.clientUnit,
        item.detectionAgency,
        item.quantity,
        `${item.detectionCycleStart} 至 ${item.detectionCycleEnd}`,
        item.receiveDate,
        item.detectionItems,
        item.reportDate,
        item.standard,
        item.customerInfo,
        String(item.attachments?.length ?? 0),
        shelfStatusText[item.status],
      ])
      const csv = [header, ...lines]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `含碳量检测库_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast(`已导出当前查询条件下 ${rows.length} 条记录`)
    } catch {
      toast('导出失败', 'error')
    }
  }

  const columns: Column<CarbonDetectionItem>[] = [
    {
      key: 'selection',
      title: (
        <input
          type="checkbox"
          className="material-check"
          aria-label="全选当前页"
          checked={allPagedSelected}
          onChange={(e) => toggleAllPaged(e.target.checked)}
        />
      ),
      width: 60,
      align: 'center',
      render: (row) => (
        <input
          type="checkbox"
          className="material-check"
          checked={selectedIds.has(row.id)}
          aria-label={`选择检测记录 ${row.reportNo}`}
          onChange={() => toggleRow(row.id)}
        />
      ),
    },
    {
      key: 'reportNo',
      title: '报告编号',
      width: 220,
      render: (row) => (
        <button className="link mono nowrap" data-ann-target="carbon.row.view" onClick={() => openView(row.id)}>
          {row.reportNo}
        </button>
      ),
    },
    {
      key: 'sampleName',
      title: '样品名称',
      width: 160,
      render: (row) => (
        <span className="cell-ellipsis" title={row.sampleName}>
          {row.sampleName}
        </span>
      ),
    },
    {
      key: 'detectionAgency',
      title: '检测机构',
      width: 180,
      render: (row) => (
        <span className="cell-ellipsis" title={row.detectionAgency}>
          {row.detectionAgency}
        </span>
      ),
    },
    { key: 'reportDate', title: '报告日期', width: 120, render: (row) => <span className="nowrap">{row.reportDate}</span> },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 150,
      render: (row) => <span className="nowrap">{row.createdAt}</span>,
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 150,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'status',
      title: <span data-ann-target="carbon.col.status">使用状态</span>,
      width: 90,
      render: (row) => <Tag tone={shelfStatusTone[row.status]}>{shelfStatusText[row.status]}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="carbon.row.view" onClick={() => openView(row.id)}>
            查看
          </button>
          <button className="link" data-ann-target="carbon.row.edit" onClick={() => openEdit(row.id)}>
            编辑
          </button>
          {row.status === 'on_shelf' ? (
            <button className="link" data-ann-target="carbon.row.shelf" onClick={() => setConfirm({ item: row, mode: 'shelf_off' })}>
              下架
            </button>
          ) : (
            <button className="link" data-ann-target="carbon.row.shelf" onClick={() => setConfirm({ item: row, mode: 'shelf_on' })}>
              上架
            </button>
          )}
          {canDeleteDetection(row) && (
            <button className="link link-danger" data-ann-target="carbon.row.delete" onClick={() => setConfirm({ item: row, mode: 'delete' })}>
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
        breadcrumb={['产品碳足迹', '含碳量检测库']}
        title="含碳量检测库"
        actions={
          <Button variant="primary" data-ann-target="carbon.add" onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="carbon.query.bar">
          <div className="query-item">
            <span className="query-label">报告编号</span>
            <Input
              value={query.reportNo}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, reportNo: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">样品名称</span>
            <Input
              value={query.sampleName}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, sampleName: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">检测机构</span>
            <Input
              value={query.detectionAgency}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, detectionAgency: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">使用状态</span>
            <Select
              value={query.status}
              placeholder="全部"
              options={statusOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | ShelfStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="carbon.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>
              重置
            </Button>
            <Button variant="primary" data-ann-target="carbon.query.search" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">含碳量检测列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 已选 {selectedItems.length} 条
            </span>
          </div>
          <div className="flex gap-xs">
            {rows.length > 0 && (
              <Button size="small" data-ann-target="carbon.export" onClick={handleExport}>
                导出
              </Button>
            )}
            <Button
              size="small"
              data-ann-target="carbon.batch.on"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchStatus('on_shelf')}
            >
              批量上架
            </Button>
            <Button
              size="small"
              data-ann-target="carbon.batch.off"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchStatus('off_shelf')}
            >
              批量下架
            </Button>
          </div>
        </div>

        <div className="material-table-wrap" data-ann-target="carbon.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <CarbonDetectionViewModal
        open={viewOpen}
        detectionId={viewId}
        onClose={() => {
          setViewOpen(false)
          setViewId(null)
        }}
        onEdit={(id) => {
          setViewOpen(false)
          setViewId(null)
          openEdit(id)
        }}
      />

      <CarbonDetectionFormModal
        open={formOpen}
        detectionId={editId}
        onClose={() => {
          setFormOpen(false)
          setEditId(null)
        }}
        onSaved={handleSaved}
      />

      <CarbonDetectionConfirmModal
        open={!!confirm}
        item={confirm?.item ?? null}
        mode={confirm?.mode ?? 'shelf_off'}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />

      {batchStatus && (
        <CarbonDetectionConfirmModal
          open={!!batchStatus}
          item={null}
          mode={batchStatus === 'on_shelf' ? 'shelf_on' : 'shelf_off'}
          count={selectedItems.length}
          submitting={batching}
          onClose={() => setBatchStatus(null)}
          onConfirm={handleBatchConfirm}
        />
      )}
    </>
  )
}

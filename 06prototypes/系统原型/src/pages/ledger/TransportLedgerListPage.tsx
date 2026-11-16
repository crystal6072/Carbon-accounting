import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { deleteTransportLedger, fetchTransportLedgers, importTransportLedgers } from '@/mock'
import type { TransportLedgerItem, TransportLedgerPayload, TransportMode, TransportType } from '@/types'
import { exportWorkbook, timestampedName } from '@/shared/utils/excel'
import TransportLedgerFormModal from './TransportLedgerFormModal'
import TransportLedgerViewModal from './TransportLedgerViewModal'
import LedgerImportModal from './LedgerImportModal'
import {
  TRANSPORT_LEDGER_IMPORT_HEADERS,
  TRANSPORT_MODE_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
  buildTransportLedgerRow,
  transportDateText,
  transportModeChain,
  transportModeText,
  transportModeTone,
  transportSegmentDetail,
  transportSegments,
  transportTypeText,
  transportTypeTone,
} from './transportLedgerMeta'
import './ledger.css'

const PAGE_SIZE = 20

interface QueryState {
  transportType: '' | TransportType
  transportMode: '' | TransportMode
  /** 运输日期起（按区间重叠匹配） */
  dateStart: string
  /** 运输日期止（按区间重叠匹配） */
  dateEnd: string
}

const EMPTY_QUERY: QueryState = { transportType: '', transportMode: '', dateStart: '', dateEnd: '' }

export default function TransportLedgerListPage() {
  const toast = useToast()

  const [list, setList] = useState<TransportLedgerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [viewItem, setViewItem] = useState<TransportLedgerItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<TransportLedgerItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ ids: string[]; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchTransportLedgers())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    let data = list
    if (query.transportType) data = data.filter((item) => item.transportType === query.transportType)
    // 多段运输：任一分段命中该运输方式即算命中
    if (query.transportMode)
      data = data.filter((item) => transportSegments(item).some((seg) => seg.transportMode === query.transportMode))
    // 运输日期按区间重叠匹配：记录区间与查询区间有交集即命中
    if (query.dateStart) data = data.filter((item) => (item.transportDateEnd || item.transportDateStart) >= query.dateStart)
    if (query.dateEnd) data = data.filter((item) => (item.transportDateStart || item.transportDateEnd) <= query.dateEnd)
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

  const openEdit = (item: TransportLedgerItem | null) => {
    setEditItem(item)
    setFormOpen(true)
  }

  const handleSaved = async () => {
    setFormOpen(false)
    setEditItem(null)
    await load()
  }

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return
    const names =
      ids.length === 1
        ? `「${list.find((i) => i.id === ids[0])?.relatedOrder || ids[0]}」`
        : `选中的 ${ids.length} 条记录`
    setConfirm({ ids, name: names })
  }

  const handleDelete = async () => {
    if (!confirm) return
    setDeleting(true)
    try {
      for (const id of confirm.ids) await deleteTransportLedger(id)
      toast(`已删除 ${confirm.ids.length} 条记录`)
      setConfirm(null)
      setSelectedIds(new Set())
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleImport = async (payloads: unknown[]) => {
    await importTransportLedgers(payloads as TransportLedgerPayload[])
    await load()
  }

  const handleExport = async () => {
    try {
      const header = [
        '运输类型',
        '运输方式',
        '运输段数',
        '起点',
        '终点',
        '运输距离(km)',
        '实际载重(t)',
        '核定载重(t)',
        '装载率(%)',
        '能耗(L)',
        '承运商',
        '车牌号',
        '运输开始日期',
        '运输结束日期',
        '关联单据号',
        '分段明细',
        '数据凭证',
      ]
      const lines = rows.map((item) => {
        const segments = transportSegments(item)
        return [
          transportTypeText[item.transportType],
          transportModeChain(segments),
          segments.length,
          item.startPoint,
          item.endPoint,
          item.distance,
          item.loadWeight,
          item.ratedWeight ?? '-',
          item.loadingRate ?? '-',
          item.fuelConsumption,
          item.carrier,
          item.licensePlate,
          item.transportDateStart,
          item.transportDateEnd,
          item.relatedOrder,
          transportSegmentDetail(segments),
          item.vouchers?.map((v) => v.name).join('、') || '-',
        ]
      })
      await exportWorkbook(timestampedName('运输台账'), [
        { name: '运输台账', columns: header.map((h) => ({ title: h })), rows: lines as (string | number)[][] },
      ])
      toast(`已导出当前查询条件下 ${rows.length} 条记录`)
    } catch {
      toast('导出失败', 'error')
    }
  }

  const columns: Column<TransportLedgerItem>[] = [
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
          aria-label={`选择记录 ${row.id}`}
          onChange={() => toggleRow(row.id)}
        />
      ),
    },
    {
      key: 'transportDate',
      title: '运输日期',
      width: 200,
      render: (row) => <span className="nowrap">{transportDateText(row)}</span>,
    },
    {
      key: 'transportType',
      title: '运输类型',
      width: 110,
      render: (row) => <Tag tone={transportTypeTone[row.transportType]}>{transportTypeText[row.transportType]}</Tag>,
    },
    {
      key: 'transportMode',
      title: '运输方式',
      width: 220,
      render: (row) => {
        const segments = transportSegments(row)
        if (segments.length === 1)
          return (
            <Tag tone={transportModeTone[segments[0].transportMode]}>{transportModeText[segments[0].transportMode]}</Tag>
          )
        return (
          <span className="segment-mode-chain">
            {segments.map((seg, index) => (
              <span key={seg.id}>
                <Tag tone={transportModeTone[seg.transportMode]}>{transportModeText[seg.transportMode]}</Tag>
                {index < segments.length - 1 && <span className="segment-arrow">→</span>}
              </span>
            ))}
            <span className="segment-count">{segments.length} 段</span>
          </span>
        )
      },
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 160,
      render: (row) => <span className="nowrap">{row.updatedAt || '-'}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => setViewItem(row)}>
            查看
          </button>
          <button className="link" onClick={() => openEdit(row)}>
            编辑
          </button>
          <button className="link link-danger" onClick={() => requestDelete([row.id])}>
            删除
          </button>
        </span>
      ),
    },
  ]

  const typeOptions: SelectOption[] = TRANSPORT_TYPE_OPTIONS
  const modeOptions: SelectOption[] = TRANSPORT_MODE_OPTIONS

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '台账管理', '运输台账管理']}
        title="运输台账管理"
        actions={
          <Button variant="primary" onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">运输类型</span>
            <Select
              value={query.transportType}
              placeholder="全部"
              options={typeOptions}
              onChange={(e) => setQuery((p) => ({ ...p, transportType: e.target.value as '' | TransportType }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">运输方式</span>
            <Select
              value={query.transportMode}
              placeholder="全部"
              options={modeOptions}
              onChange={(e) => setQuery((p) => ({ ...p, transportMode: e.target.value as '' | TransportMode }))}
            />
          </div>
          <div className="query-item query-item-date">
            <span className="query-label">运输日期</span>
            <div className="date-range">
              <Input
                type="date"
                value={query.dateStart}
                onChange={(e) => setQuery((p) => ({ ...p, dateStart: e.target.value }))}
              />
              <span className="date-range-sep">~</span>
              <Input
                type="date"
                value={query.dateEnd}
                onChange={(e) => setQuery((p) => ({ ...p, dateEnd: e.target.value }))}
              />
            </div>
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
            <span className="toolbar-title">运输台账列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 已选 {selectedItems.length} 条
            </span>
          </div>
          <div className="flex gap-xs">
            <Button size="small" onClick={() => setImportOpen(true)}>
              导入
            </Button>
            {rows.length > 0 && (
              <Button size="small" onClick={handleExport}>
                导出
              </Button>
            )}
            <Button size="small" disabled={selectedItems.length === 0} onClick={() => requestDelete(selectedItems.map((i) => i.id))}>
              批量删除
            </Button>
          </div>
        </div>

        <div className="material-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <TransportLedgerViewModal
        open={!!viewItem}
        item={viewItem}
        onClose={() => setViewItem(null)}
        onEdit={(item) => {
          setViewItem(null)
          openEdit(item)
        }}
      />

      <TransportLedgerFormModal
        open={formOpen}
        initial={editItem}
        onClose={() => {
          setFormOpen(false)
          setEditItem(null)
        }}
        onSaved={handleSaved}
      />

      <LedgerImportModal
        open={importOpen}
        title="运输台账导入"
        templateName="运输台账导入模板"
        headers={TRANSPORT_LEDGER_IMPORT_HEADERS}
        buildRow={buildTransportLedgerRow}
        onImport={handleImport}
        onClose={() => setImportOpen(false)}
      />

      <ConfirmDeleteModal
        open={!!confirm}
        name={confirm?.name ?? ''}
        count={confirm?.ids.length ?? 0}
        submitting={deleting}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}

interface ConfirmDeleteModalProps {
  open: boolean
  name: string
  count: number
  submitting: boolean
  onClose: () => void
  onConfirm: () => void
}

function ConfirmDeleteModal({ open, name, count, submitting, onClose, onConfirm }: ConfirmDeleteModalProps) {
  return (
    <Modal
      open={open}
      title="确认删除"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="danger" disabled={submitting} onClick={onConfirm}>
            {submitting ? '删除中…' : '确认删除'}
          </Button>
        </>
      }
    >
      <p className="confirm-body">
        删除 {name} 为物理删除，不可恢复。{count > 1 ? '（共 ' + count + ' 条）' : ''}
      </p>
    </Modal>
  )
}

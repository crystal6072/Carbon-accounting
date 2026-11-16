import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  deleteEnergyLedger,
  fetchEnergyLedgers,
  importEnergyLedgers,
} from '@/mock'
import type { EnergyLedgerItem, EnergyLedgerPayload, LedgerEnergyType } from '@/types'
import { exportWorkbook, timestampedName } from '@/shared/utils/excel'
import EnergyLedgerFormModal from './EnergyLedgerFormModal'
import EnergyLedgerViewModal from './EnergyLedgerViewModal'
import LedgerImportModal from './LedgerImportModal'
import {
  ENERGY_LEDGER_IMPORT_HEADERS,
  ENERGY_TYPE_OPTIONS,
  buildEnergyLedgerRow,
  electricitySourceText,
  energyTypeText,
  energyTypeTone,
  ledgerPeriodText,
  waterSourceText,
} from './energyLedgerMeta'
import './ledger.css'

const PAGE_SIZE = 20

interface QueryState {
  /** 所属周期 · 起 */
  periodStart: string
  /** 所属周期 · 止 */
  periodEnd: string
  processName: string
  energyType: '' | LedgerEnergyType
}

const EMPTY_QUERY: QueryState = { periodStart: '', periodEnd: '', processName: '', energyType: '' }

export default function EnergyLedgerListPage() {
  const toast = useToast()

  const [list, setList] = useState<EnergyLedgerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [viewItem, setViewItem] = useState<EnergyLedgerItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<EnergyLedgerItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ ids: string[]; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchEnergyLedgers())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    let data = list
    // 周期区间按「重叠」筛选：记录的周期与查询区间有交集即命中
    if (query.periodStart.trim()) data = data.filter((item) => item.recordEndDate >= query.periodStart.trim())
    if (query.periodEnd.trim()) data = data.filter((item) => item.recordStartDate <= query.periodEnd.trim())
    if (query.processName.trim()) data = data.filter((item) => item.processName.includes(query.processName.trim()))
    if (query.energyType) data = data.filter((item) => item.energyType === query.energyType)
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

  const openEdit = (item: EnergyLedgerItem | null) => {
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
    const names = ids.length === 1 ? `「${list.find((i) => i.id === ids[0])?.processName ?? ''}」` : `选中的 ${ids.length} 条记录`
    setConfirm({ ids, name: names })
  }

  const handleDelete = async () => {
    if (!confirm) return
    setDeleting(true)
    try {
      for (const id of confirm.ids) await deleteEnergyLedger(id)
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
    await importEnergyLedgers(payloads as EnergyLedgerPayload[])
    await load()
  }

  const handleExport = async () => {
    try {
      const header = ['所属工序/车间', '所属周期起', '所属周期止', '能源类型', '消耗数量', '单位', '用电类型', '水源类型', '备注', '数据源凭证']
      const lines = rows.map((item) => [
        item.processName,
        item.recordStartDate,
        item.recordEndDate,
        energyTypeText[item.energyType],
        item.consumptionAmount,
        item.unit,
        item.electricitySource ? electricitySourceText[item.electricitySource] : '-',
        item.waterSource ? waterSourceText[item.waterSource] : '-',
        item.remark || '-',
        item.vouchers?.map((v) => v.name).join('、') || '-',
      ])
      await exportWorkbook(timestampedName('加工能耗台账'), [
        { name: '加工能耗台账', columns: header.map((h) => ({ title: h })), rows: lines as (string | number)[][] },
      ])
      toast(`已导出当前查询条件下 ${rows.length} 条记录`)
    } catch {
      toast('导出失败', 'error')
    }
  }

  const columns: Column<EnergyLedgerItem>[] = [
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
      key: 'recordPeriod',
      title: '所属周期',
      width: 200,
      render: (row) => <span className="nowrap">{ledgerPeriodText(row)}</span>,
    },
    {
      key: 'processName',
      title: '所属工序/车间',
      width: 140,
      render: (row) => (
        <span className="cell-ellipsis" title={row.processName}>
          {row.processName}
        </span>
      ),
    },
    {
      key: 'energyType',
      title: '能源类型',
      width: 100,
      render: (row) => <Tag tone={energyTypeTone[row.energyType]}>{energyTypeText[row.energyType]}</Tag>,
    },
    {
      key: 'consumptionAmount',
      title: '消耗数值',
      width: 140,
      render: (row) => (
        <span className="nowrap">
          {row.consumptionAmount} {row.unit}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 160,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
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

  const energyTypeOptions: SelectOption[] = ENERGY_TYPE_OPTIONS

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '台账管理', '加工能耗台账']}
        title="加工能耗台账"
        actions={
          <Button variant="primary" onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item query-item-period">
            <span className="query-label">所属周期</span>
            <div className="date-range">
              <Input
                type="date"
                aria-label="所属周期起"
                value={query.periodStart}
                onChange={(e) => setQuery((p) => ({ ...p, periodStart: e.target.value }))}
              />
              <span className="date-range-sep">至</span>
              <Input
                type="date"
                aria-label="所属周期止"
                value={query.periodEnd}
                onChange={(e) => setQuery((p) => ({ ...p, periodEnd: e.target.value }))}
              />
            </div>
          </div>
          <div className="query-item">
            <span className="query-label">所属工序/车间</span>
            <Input
              value={query.processName}
              placeholder="请输入"
              onChange={(e) => setQuery((p) => ({ ...p, processName: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">能源类型</span>
            <Select
              value={query.energyType}
              placeholder="全部"
              options={energyTypeOptions}
              onChange={(e) => setQuery((p) => ({ ...p, energyType: e.target.value as '' | LedgerEnergyType }))}
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
            <span className="toolbar-title">加工能耗台账列表</span>
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

      <EnergyLedgerViewModal
        open={!!viewItem}
        item={viewItem}
        onClose={() => setViewItem(null)}
        onEdit={(item) => {
          setViewItem(null)
          openEdit(item)
        }}
      />

      <EnergyLedgerFormModal
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
        title="加工能耗台账导入"
        templateName="加工能耗台账导入模板"
        headers={ENERGY_LEDGER_IMPORT_HEADERS}
        buildRow={buildEnergyLedgerRow}
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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, CascaderSelect, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  batchUpdateEnergyStatus,
  deleteEnergy,
  fetchEnergies,
  fetchIndustryTreeOptions,
  updateEnergyStatus,
} from '@/mock'
import type { EnergyBatchResult } from '@/mock'
import type { EnableStatus, EnergyItem, EnergyType, TreeOption } from '@/types'
import EnergyBatchConfirmModal from './EnergyBatchConfirmModal'
import EnergyBatchResultModal from './EnergyBatchResultModal'
import EnergyConfirmModal from './EnergyConfirmModal'
import type { EnergyConfirmMode } from './EnergyConfirmModal'
import EnergyFormModal from './EnergyFormModal'
import EnergyViewModal from './EnergyViewModal'
import {
  canDeleteEnergy,
  energyTypeOrder,
  energyTypeText,
  energyTypeTone,
  industriesText,
  useStatusText,
  useStatusTone,
} from './energyMeta'
import './EnergyPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  energyType: '' | EnergyType
  industry: string
  status: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = {
  code: '',
  name: '',
  energyType: '',
  industry: '',
  status: '',
}

export default function EnergyListPage() {
  const toast = useToast()

  const [list, setList] = useState<EnergyItem[]>([])
  /** 适用行业多级选项（行业库四级） */
  const [industryTree, setIndustryTree] = useState<TreeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ energy: EnergyItem; mode: EnergyConfirmMode } | null>(null)
  const [batchStatus, setBatchStatus] = useState<EnableStatus | null>(null)
  const [batchResult, setBatchResult] = useState<{ status: EnableStatus; data: EnergyBatchResult } | null>(null)
  const [batching, setBatching] = useState(false)
  /** 查看弹窗 */
  const [viewOpen, setViewOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  /** 新增 / 编辑弹窗：null = 新增，字符串 = 编辑对应能源 */
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [energies, industryTreeList] = await Promise.all([fetchEnergies(), fetchIndustryTreeOptions()])
      setList(energies)
      setIndustryTree(industryTreeList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const energyTypeOptions: SelectOption[] = useMemo(
    () => energyTypeOrder.map((energyType) => ({ label: energyTypeText[energyType], value: energyType })),
    [],
  )

  const industryOptions: TreeOption[] = useMemo(() => industryTree, [industryTree])

  const rows = useMemo(() => {
    let data = list
    if (query.code.trim()) {
      const keyword = query.code.trim().toLowerCase()
      data = data.filter((item) => item.code.toLowerCase().includes(keyword))
    }
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.energyType) {
      data = data.filter((item) => item.energyType === query.energyType)
    }
    if (query.industry) {
      data = data.filter((item) => item.industries.includes(query.industry))
    }
    if (query.status) {
      data = data.filter((item) => item.status === query.status)
    }
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 勾选项按当前列表求交集：已删除 / 被筛掉的条目自动移出选择集 */
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

  /** 表头全选：作用于当前页（跨页已选项保留） */
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
    const { energy, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteEnergy(energy.id)
        toast('删除成功')
      } else {
        await updateEnergyStatus(energy.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(mode === 'enable' ? '启用成功' : '禁用成功')
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
    const action = status === 'enabled' ? '启用' : '停用'
    setBatching(true)
    try {
      const result = await batchUpdateEnergyStatus(
        selectedItems.map((item) => item.id),
        status,
      )
      setBatchStatus(null)
      setSelectedIds(new Set())
      await load()
      if (result.failed.length === 0) {
        toast(`批量${action}成功：共 ${result.success} 条`)
      } else {
        toast(`批量${action}完成：成功 ${result.success} 条，跳过 ${result.failed.length} 条`, 'error')
        setBatchResult({ status, data: result })
      }
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

  const columns: Column<EnergyItem>[] = [
    {
      key: 'selection',
      title: (
        <input
          type="checkbox"
          className="energy-check"
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
          className="energy-check"
          checked={selectedIds.has(row.id)}
          aria-label={`选择能源 ${row.name}`}
          onChange={() => toggleRow(row.id)}
        />
      ),
    },
    {
      key: 'code',
      title: <span data-ann-target="energy.col.code">能源编码</span>,
      width: 120,
      render: (row) => (
        <button className="link mono nowrap" data-ann-target="energy.row.code" onClick={() => openView(row.id)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: <span data-ann-target="energy.col.name">能源名称</span>,
      width: 160,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'energyType',
      title: <span data-ann-target="energy.col.energyType">能源类型</span>,
      width: 110,
      render: (row) => <Tag tone={energyTypeTone[row.energyType]}>{energyTypeText[row.energyType]}</Tag>,
    },
    {
      key: 'industries',
      title: <span data-ann-target="energy.col.industries">适用行业</span>,
      width: 240,
      render: (row) => (
        <span className="cell-ellipsis" title={industriesText(row.industries)}>
          {industriesText(row.industries)}
        </span>
      ),
    },
    {
      key: 'status',
      title: <span data-ann-target="energy.col.status">使用状态</span>,
      width: 90,
      render: (row) => <Tag tone={useStatusTone[row.status]}>{useStatusText[row.status]}</Tag>,
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
      width: 180,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="energy.row.view" onClick={() => openView(row.id)}>
            查看
          </button>
          <button className="link" data-ann-target="energy.row.edit" onClick={() => openEdit(row.id)}>
            编辑
          </button>
          {row.status === 'disabled' ? (
            <button className="link" data-ann-target="energy.row.enable" onClick={() => setConfirm({ energy: row, mode: 'enable' })}>
              启用
            </button>
          ) : (
            <button className="link link-danger" data-ann-target="energy.row.disable" onClick={() => setConfirm({ energy: row, mode: 'disable' })}>
              禁用
            </button>
          )}
          {/* 删除仅对「已禁用」的能源开放，启用态隐藏入口 */}
          {canDeleteEnergy(row) && (
            <button className="link link-danger" data-ann-target="energy.row.delete" onClick={() => setConfirm({ energy: row, mode: 'delete' })}>
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
        breadcrumb={['系统管理', '基础库', '能源库']}
        title={<span data-ann-target="energy.page.global">能源库</span>}
        actions={
          <Button variant="primary" data-ann-target="energy.add" onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="energy.query.bar">
          <div className="query-item">
            <span className="query-label">能源编码</span>
            <Input
              value={query.code}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">能源名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">能源类型</span>
            <Select
              value={query.energyType}
              placeholder="全部"
              options={energyTypeOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, energyType: e.target.value as '' | EnergyType }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">适用行业</span>
            <CascaderSelect
              value={query.industry}
              placeholder="全部"
              options={industryOptions}
              searchPlaceholder="搜索行业名称 / 编码"
              onChange={(value) => setQuery((prev) => ({ ...prev, industry: value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">使用状态</span>
            <Select
              value={query.status}
              placeholder="全部"
              options={[
                { label: '启用', value: 'enabled' },
                { label: '禁用', value: 'disabled' },
              ]}
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | EnableStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="energy.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" data-ann-target="energy.query.search" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">能源列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 已选 {selectedItems.length} 条
            </span>
          </div>
          <div className="flex gap-xs">
            <Button
              size="small"
              data-ann-target="energy.batch.enable"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchStatus('enabled')}
            >
              批量启用
            </Button>
            <Button
              size="small"
              data-ann-target="energy.batch.disable"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchStatus('disabled')}
            >
              批量停用
            </Button>
          </div>
        </div>

        <div className="energy-table-wrap" data-ann-target="energy.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <EnergyViewModal
        open={viewOpen}
        energyId={viewId}
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

      <EnergyFormModal
        open={formOpen}
        energyId={editId}
        onClose={() => {
          setFormOpen(false)
          setEditId(null)
        }}
        onSaved={handleSaved}
      />

      <EnergyConfirmModal
        open={!!confirm}
        energy={confirm?.energy ?? null}
        mode={confirm?.mode ?? 'enable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />

      <EnergyBatchConfirmModal
        open={!!batchStatus}
        status={batchStatus ?? 'enabled'}
        count={selectedItems.length}
        submitting={batching}
        onClose={() => setBatchStatus(null)}
        onConfirm={handleBatchConfirm}
      />

      <EnergyBatchResultModal
        open={!!batchResult}
        status={batchResult?.status ?? 'enabled'}
        result={batchResult?.data ?? null}
        onClose={() => setBatchResult(null)}
      />
    </>
  )
}

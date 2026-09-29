import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { batchDeleteUnits, batchUpdateUnitStatus, deleteUnit, fetchUnits, updateUnitStatus } from '@/mock'
import type { UnitBatchResult } from '@/mock'
import type { EnableStatus, UnitItem, UnitType } from '@/types'
import UnitBatchConfirmModal from './UnitBatchConfirmModal'
import type { UnitBatchMode } from './UnitBatchConfirmModal'
import UnitBatchResultModal from './UnitBatchResultModal'
import UnitConfirmModal from './UnitConfirmModal'
import type { UnitConfirmMode } from './UnitConfirmModal'
import {
  baseFlagText,
  baseUnitText,
  canDeleteUnit,
  canDisableUnit,
  factorText,
  unitTypeOrder,
  unitTypeText,
  unitTypeTone,
  useStatusText,
  useStatusTone,
} from './unitMeta'
import './UnitPage.css'

const PAGE_SIZE = 20

interface QueryState {
  name: string
  symbol: string
  unitType: '' | UnitType
  status: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = { name: '', symbol: '', unitType: '', status: '' }

export default function UnitListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<UnitItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ unit: UnitItem; mode: UnitConfirmMode } | null>(null)
  const [batchMode, setBatchMode] = useState<UnitBatchMode | null>(null)
  const [batchResult, setBatchResult] = useState<{ mode: UnitBatchMode; data: UnitBatchResult } | null>(null)
  const [batching, setBatching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchUnits())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const typeOptions: SelectOption[] = useMemo(
    () => unitTypeOrder.map((type) => ({ label: unitTypeText[type], value: type })),
    [],
  )

  const rows = useMemo(() => {
    let data = list
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.symbol.trim()) {
      const keyword = query.symbol.trim().toLowerCase()
      data = data.filter((item) => item.symbol.toLowerCase().includes(keyword))
    }
    if (query.unitType) {
      data = data.filter((item) => item.unitType === query.unitType)
    }
    if (query.status) {
      data = data.filter((item) => item.status === query.status)
    }
    // 按单位类型分组展示：类型顺序固定，组内基准单位在前（列表按类型归集）
    return [...data].sort((a, b) => {
      const typeDiff = unitTypeOrder.indexOf(a.unitType) - unitTypeOrder.indexOf(b.unitType)
      if (typeDiff !== 0) return typeDiff
      if (a.isBase !== b.isBase) return a.isBase ? -1 : 1
      return 0
    })
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 勾选项按当前列表求交集：被删除 / 被筛掉的条目自动移出选择集 */
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

  const openView = (id: string) => navigate(`/basic/unit/${id}`)

  const handleRowConfirm = async () => {
    if (!confirm) return
    const { unit, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteUnit(unit.id)
        toast('删除成功')
      } else {
        await updateUnitStatus(unit.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(mode === 'enable' ? '启用成功' : '禁用成功')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleBatchConfirm = async () => {
    if (!batchMode) return
    const mode = batchMode
    const ids = selectedItems.map((item) => item.id)
    setBatching(true)
    try {
      const result = mode === 'enable' ? await batchUpdateUnitStatus(ids, 'enabled') : await batchDeleteUnits(ids)
      setBatchMode(null)
      setSelectedIds(new Set())
      await load()
      if (result.failed.length === 0) {
        toast(`批量${mode === 'enable' ? '启用' : '删除'}成功：共 ${result.success} 条`)
      } else {
        toast(
          `批量${mode === 'enable' ? '启用' : '删除'}完成：成功 ${result.success} 条，跳过 ${result.failed.length} 条`,
          'error',
        )
        setBatchResult({ mode, data: result })
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '批量操作失败', 'error')
    } finally {
      setBatching(false)
    }
  }

  const columns: Column<UnitItem>[] = [
    {
      key: 'selection',
      title: (
        <input
          type="checkbox"
          className="unit-check"
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
          className="unit-check"
          checked={selectedIds.has(row.id)}
          aria-label={`选择单位 ${row.name}`}
          onChange={() => toggleRow(row.id)}
        />
      ),
    },
    {
      key: 'name',
      title: '单位名称',
      width: 130,
      render: (row) => (
        <button className="link" onClick={() => openView(row.id)}>
          {row.name}
        </button>
      ),
    },
    {
      key: 'symbol',
      title: '单位符号',
      width: 96,
      render: (row) => <span className="mono nowrap">{row.symbol}</span>,
    },
    {
      key: 'unitType',
      title: '单位类型',
      width: 100,
      render: (row) => <Tag tone={unitTypeTone[row.unitType]}>{unitTypeText[row.unitType]}</Tag>,
    },
    {
      key: 'isBase',
      title: '基准标记',
      width: 100,
      render: (row) => <Tag tone={row.isBase ? 'success' : 'default'}>{baseFlagText(row)}</Tag>,
    },
    {
      key: 'baseUnit',
      title: '关联基准单位',
      width: 110,
      render: (row) => <span className="nowrap">{baseUnitText(row)}</span>,
    },
    {
      key: 'factor',
      title: '换算系数',
      width: 90,
      render: (row) => <span className="nowrap">{factorText(row)}</span>,
    },
    {
      key: 'status',
      title: '使用状态',
      width: 90,
      render: (row) => <Tag tone={useStatusTone[row.status]}>{useStatusText[row.status]}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 170,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => openView(row.id)}>
            查看
          </button>
          <button className="link" onClick={() => navigate(`/basic/unit/${row.id}/edit`)}>
            编辑
          </button>
          {row.status === 'enabled' ? (
            canDisableUnit(row) && (
              <button className="link link-danger" onClick={() => setConfirm({ unit: row, mode: 'disable' })}>
                禁用
              </button>
            )
          ) : (
            <button className="link" onClick={() => setConfirm({ unit: row, mode: 'enable' })}>
              启用
            </button>
          )}
          {/* 删除仅对「已禁用」的非基准单位开放，其余状态隐藏入口 */}
          {canDeleteUnit(row) && (
            <button className="link link-danger" onClick={() => setConfirm({ unit: row, mode: 'delete' })}>
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
        breadcrumb={['后台管理', '基础库', '计量单位库']}
        title="计量单位库"
        description="一本单位字典：单位类型为系统内置枚举，不开放维护；换算按「基准中转」"
        actions={
          <Button variant="primary" onClick={() => navigate('/basic/unit/new')}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">单位名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">单位符号</span>
            <Input
              value={query.symbol}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, symbol: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">单位类型</span>
            <Select
              value={query.unitType}
              placeholder="全部"
              options={typeOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, unitType: e.target.value as '' | UnitType }))}
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
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">单位字典</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 已选 {selectedItems.length} 条 · 按单位类型分组展示，各类型（「数量」除外）有且仅有 1 个基准单位
            </span>
          </div>
          <div className="flex gap-xs">
            <Button
              size="small"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchMode('enable')}
            >
              批量启用
            </Button>
            <Button
              size="small"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchMode('delete')}
            >
              批量删除
            </Button>
            <Button onClick={() => toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)}>导出</Button>
          </div>
        </div>

        <div className="unit-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <UnitConfirmModal
        open={!!confirm}
        unit={confirm?.unit ?? null}
        mode={confirm?.mode ?? 'enable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />

      <UnitBatchConfirmModal
        open={!!batchMode}
        mode={batchMode ?? 'enable'}
        count={selectedItems.length}
        submitting={batching}
        onClose={() => setBatchMode(null)}
        onConfirm={handleBatchConfirm}
      />

      <UnitBatchResultModal
        open={!!batchResult}
        mode={batchResult?.mode ?? 'enable'}
        result={batchResult?.data ?? null}
        onClose={() => setBatchResult(null)}
      />
    </>
  )
}

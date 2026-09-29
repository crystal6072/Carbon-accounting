import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  batchDeleteFactors,
  batchUpdateFactorStatus,
  deleteFactor,
  fetchFactors,
  updateFactorStatus,
} from '@/mock'
import type { FactorBatchResult } from '@/mock'
import type { EnableStatus, FactorCategory, FactorItem } from '@/types'
import FactorBatchConfirmModal from './FactorBatchConfirmModal'
import type { FactorBatchMode } from './FactorBatchConfirmModal'
import FactorBatchResultModal from './FactorBatchResultModal'
import FactorConfirmModal from './FactorConfirmModal'
import type { FactorConfirmMode } from './FactorConfirmModal'
import FactorImportModal from './FactorImportModal'
import FactorReferenceModal from './FactorReferenceModal'
import {
  canDeleteFactor,
  canDisableFactor,
  canEnableFactor,
  canMaintainFactor,
  factorCategoryOrder,
  factorCategoryText,
  factorCategoryTone,
  factorMaintainerText,
  factorMaintainerTone,
  factorUnitText,
  industryText,
  useStatusText,
  useStatusTone,
} from './factorMeta'
import type { FactorScope } from './factorMeta'
import './FactorPage.css'

const PAGE_SIZE = 20

interface FactorListPageProps {
  /** backend = 后台管理 → 核算模型 → 排放因子库；frontend = 前台「我的因子库」 */
  mode?: FactorScope
}

interface QueryState {
  keyword: string
  category: '' | FactorCategory
  sourceCategory: string
  status: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = { keyword: '', category: '', sourceCategory: '', status: '' }

export default function FactorListPage({ mode = 'backend' }: FactorListPageProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const isFrontend = mode === 'frontend'
  const basePath = isFrontend ? '/pcf/my-factor' : '/model/factor'

  const [list, setList] = useState<FactorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ factor: FactorItem; mode: FactorConfirmMode } | null>(null)
  const [batchMode, setBatchMode] = useState<FactorBatchMode | null>(null)
  const [batchResult, setBatchResult] = useState<{ mode: FactorBatchMode; data: FactorBatchResult } | null>(null)
  const [batching, setBatching] = useState(false)
  const [referenceOpen, setReferenceOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchFactors())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categoryOptions: SelectOption[] = useMemo(
    () => factorCategoryOrder.map((category) => ({ label: factorCategoryText[category], value: category })),
    [],
  )

  const rows = useMemo(() => {
    // 前台「我的因子库」= 组织自建因子 + 已引入的后台维护因子（后台因子以只读引用方式呈现）
    let data = isFrontend ? list.filter((item) => item.source === 'custom' || item.referenced) : list
    const keyword = query.keyword.trim().toLowerCase()
    if (keyword) {
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.alias.toLowerCase().includes(keyword) ||
          item.code.toLowerCase().includes(keyword),
      )
    }
    if (query.category) data = data.filter((item) => item.category === query.category)
    if (query.sourceCategory.trim()) {
      data = data.filter((item) => item.sourceCategory.includes(query.sourceCategory.trim()))
    }
    if (query.status) data = data.filter((item) => item.status === query.status)
    return [...data].sort((a, b) => (a.code < b.code ? -1 : 1))
  }, [list, query, isFrontend])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectedItems = useMemo(() => rows.filter((item) => selectedIds.has(item.id)), [rows, selectedIds])

  /** 可被批量操作的条目：前台「我的因子库」中**后台维护因子只读**，自动跳过 */
  const batchableItems = useMemo(
    () => (isFrontend ? selectedItems.filter((item) => canMaintainFactor(item)) : selectedItems),
    [selectedItems, isFrontend],
  )

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

  const openView = (id: string) => navigate(`${basePath}/${id}`)

  const handleRowConfirm = async () => {
    if (!confirm) return
    const { factor, mode: action } = confirm
    try {
      if (action === 'delete') {
        await deleteFactor(factor.id)
        toast('删除成功')
      } else {
        await updateFactorStatus(factor.id, action === 'enable' ? 'enabled' : 'disabled')
        toast(action === 'enable' ? '启用成功' : '禁用成功')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleBatchConfirm = async () => {
    if (!batchMode) return
    const action = batchMode
    const ids = batchableItems.map((item) => item.id)
    setBatching(true)
    try {
      const result =
        action === 'delete'
          ? await batchDeleteFactors(ids)
          : await batchUpdateFactorStatus(ids, action === 'enable' ? 'enabled' : 'disabled')
      setBatchMode(null)
      setSelectedIds(new Set())
      await load()
      const label = action === 'enable' ? '启用' : action === 'disable' ? '禁用' : '删除'
      if (result.failed.length === 0) {
        toast(`批量${label}成功：共 ${result.success} 条`)
      } else {
        toast(`批量${label}完成：成功 ${result.success} 条，跳过 ${result.failed.length} 条`, 'error')
        setBatchResult({ mode: action, data: result })
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '批量操作失败', 'error')
    } finally {
      setBatching(false)
    }
  }

  /** 引用因子库完成：刷新列表，存在跳过条目时展示结果弹窗 */
  const handleReferenced = async (result: FactorBatchResult) => {
    setSelectedIds(new Set())
    await load()
    if (result.failed.length === 0) {
      toast(`引用成功：共 ${result.success} 条`)
      return
    }
    toast(`引用完成：成功 ${result.success} 条，跳过 ${result.failed.length} 条`, 'error')
    setBatchResult({ mode: 'reference', data: result })
  }

  /** 模板导入完成：刷新列表（结果由导入弹窗自行展示） */
  const handleImported = async (result: FactorBatchResult) => {
    setSelectedIds(new Set())
    await load()
    if (result.failed.length === 0) toast(`导入成功：共 ${result.success} 条`)
    else toast(`导入完成：成功 ${result.success} 条，失败 ${result.failed.length} 条`, 'error')
  }

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
      width: 60,
      align: 'center',
      render: (row) => (
        <input
          type="checkbox"
          className="factor-check"
          checked={selectedIds.has(row.id)}
          aria-label={`选择因子 ${row.name}`}
          onChange={() => toggleRow(row.id)}
        />
      ),
    },
    {
      key: 'name',
      title: '因子名称',
      width: 176,
      render: (row) => (
        <button className="link" onClick={() => openView(row.id)}>
          {row.name}
        </button>
      ),
    },
    {
      key: 'alias',
      title: '因子别名',
      width: 150,
      render: (row) => <span className="nowrap">{row.alias || '-'}</span>,
    },
    {
      key: 'category',
      title: '因子分类',
      width: 118,
      render: (row) => <Tag tone={factorCategoryTone[row.category]}>{factorCategoryText[row.category]}</Tag>,
    },
    // 前台「我的因子库」需区分「组织自建 / 后台维护（只读）」
    ...(isFrontend
      ? [
          {
            key: 'maintainer',
            title: '维护方',
            width: 100,
            render: (row: FactorItem) => (
              <Tag tone={factorMaintainerTone[row.source]}>{factorMaintainerText[row.source]}</Tag>
            ),
          } as Column<FactorItem>,
        ]
      : []),
    {
      key: 'value',
      title: '因子值 / 单位',
      width: 170,
      render: (row) => (
        <span className="mono nowrap">
          {row.value} {factorUnitText(row)}
        </span>
      ),
    },
    {
      key: 'industries',
      title: '适用行业',
      width: 190,
      render: (row) => (
        <span className="cell-ellipsis" title={industryText(row)}>
          {industryText(row)}
        </span>
      ),
    },
    {
      key: 'status',
      title: '使用状态',
      width: 90,
      render: (row) => <Tag tone={useStatusTone[row.status]}>{useStatusText[row.status]}</Tag>,
    },
    {
      key: 'updatedAt',
      title: '操作时间',
      width: 150,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 170,
      render: (row) => {
        // 前台「我的因子库」：后台维护因子**只读**，仅可查看
        if (isFrontend && !canMaintainFactor(row)) {
          return (
            <span className="row-actions">
              <button className="link" onClick={() => openView(row.id)}>
                查看
              </button>
            </span>
          )
        }
        return (
          <span className="row-actions">
            <button className="link" onClick={() => openView(row.id)}>
              查看
            </button>
            <button className="link" onClick={() => navigate(`${basePath}/${row.id}/edit`)}>
              编辑
            </button>
            {row.status === 'enabled' ? (
              canDisableFactor(row) && (
                <button className="link link-danger" onClick={() => setConfirm({ factor: row, mode: 'disable' })}>
                  禁用
                </button>
              )
            ) : (
              canEnableFactor(row) && (
                <button className="link" onClick={() => setConfirm({ factor: row, mode: 'enable' })}>
                  启用
                </button>
              )
            )}
            {canDeleteFactor(row) && (
              <button className="link link-danger" onClick={() => setConfirm({ factor: row, mode: 'delete' })}>
                删除
              </button>
            )}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={isFrontend ? ['前台业务平台', '我的因子库'] : ['后台管理', '核算模型', '排放因子库']}
        title={isFrontend ? '我的因子库' : '排放因子库'}
        description={
          isFrontend
            ? '组织自建因子 + 已引入的后台维护因子（只读）；匹配优先级「组织自建 > 系统预置」'
            : '因子字典：维护因子信息与来源信息；匹配规则由核算模型内置、只读，本页不做配置'
        }
        actions={
          <>
            {isFrontend && <Button onClick={() => setReferenceOpen(true)}>引用因子库</Button>}
            <Button onClick={() => setImportOpen(true)}>导入</Button>
            <Button variant="primary" onClick={() => navigate(`${basePath}/new`)}>
              新增
            </Button>
          </>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">因子名称 / 别名</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">因子分类</span>
            <Select
              value={query.category}
              placeholder="全部"
              options={categoryOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, category: e.target.value as '' | FactorCategory }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">来源类别</span>
            <Input
              value={query.sourceCategory}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, sourceCategory: e.target.value }))}
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
            <span className="toolbar-title">因子字典</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 已选 {selectedItems.length} 条
              {isFrontend && selectedItems.length > batchableItems.length && (
                <span className="factor-inline-warn">
                  （含 {selectedItems.length - batchableItems.length} 条后台维护因子，只读、批量操作将跳过）
                </span>
              )}{' '}
              · 匹配优先级「组织自建 &gt; 系统预置」
            </span>
          </div>
          <div className="flex gap-xs">
            <Button size="small" disabled={batchableItems.length === 0 || batching} onClick={() => setBatchMode('enable')}>
              批量启用
            </Button>
            <Button size="small" disabled={batchableItems.length === 0 || batching} onClick={() => setBatchMode('disable')}>
              批量禁用
            </Button>
            <Button size="small" disabled={batchableItems.length === 0 || batching} onClick={() => setBatchMode('delete')}>
              批量删除
            </Button>
            <Button size="small" onClick={() => setImportOpen(true)}>
              导入
            </Button>
            <Button onClick={() => toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)}>导出</Button>
          </div>
        </div>

        <div className="factor-table-wrap factor-table-sticky">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <FactorConfirmModal
        open={!!confirm}
        factor={confirm?.factor ?? null}
        mode={confirm?.mode ?? 'disable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />

      <FactorBatchConfirmModal
        open={!!batchMode}
        mode={batchMode ?? 'enable'}
        count={batchableItems.length}
        submitting={batching}
        onClose={() => setBatchMode(null)}
        onConfirm={handleBatchConfirm}
      />

      <FactorBatchResultModal
        open={!!batchResult}
        mode={batchResult?.mode ?? 'enable'}
        result={batchResult?.data ?? null}
        onClose={() => setBatchResult(null)}
      />

      <FactorReferenceModal
        open={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        onSubmitted={handleReferenced}
      />

      <FactorImportModal
        open={importOpen}
        scope={isFrontend ? 'frontend' : 'backend'}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />
    </>
  )
}

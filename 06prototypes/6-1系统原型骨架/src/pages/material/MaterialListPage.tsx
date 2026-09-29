import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  batchUpdateMaterialStatus,
  deleteMaterial,
  fetchIndustryOptions,
  fetchMaterials,
  updateMaterialStatus,
} from '@/mock'
import type { MaterialBatchResult } from '@/mock'
import type { EnableStatus, MaterialFlowType, MaterialItem, MaterialSubCategory } from '@/types'
import MaterialBatchConfirmModal from './MaterialBatchConfirmModal'
import MaterialBatchResultModal from './MaterialBatchResultModal'
import MaterialConfirmModal from './MaterialConfirmModal'
import type { MaterialConfirmMode } from './MaterialConfirmModal'
import MaterialFormModal from './MaterialFormModal'
import MaterialViewModal from './MaterialViewModal'
import {
  canDeleteMaterial,
  industriesText,
  materialFlowTypeOrder,
  materialFlowTypeText,
  materialFlowTypeTone,
  materialSubCategoryOrder,
  materialSubCategoryText,
  useStatusText,
  useStatusTone,
} from './materialMeta'
import './MaterialPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  flowType: '' | MaterialFlowType
  subCategory: '' | MaterialSubCategory
  industry: string
  status: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = {
  code: '',
  name: '',
  flowType: '',
  subCategory: '',
  industry: '',
  status: '',
}

export default function MaterialListPage() {
  const toast = useToast()

  const [list, setList] = useState<MaterialItem[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ material: MaterialItem; mode: MaterialConfirmMode } | null>(null)
  const [batchStatus, setBatchStatus] = useState<EnableStatus | null>(null)
  const [batchResult, setBatchResult] = useState<{ status: EnableStatus; data: MaterialBatchResult } | null>(null)
  const [batching, setBatching] = useState(false)
  /** 查看弹窗 */
  const [viewOpen, setViewOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  /** 新增 / 编辑弹窗：null = 新增，字符串 = 编辑对应物料 */
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [materials, industryList] = await Promise.all([fetchMaterials(), fetchIndustryOptions()])
      setList(materials)
      setIndustries(industryList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const flowTypeOptions: SelectOption[] = useMemo(
    () => materialFlowTypeOrder.map((flowType) => ({ label: materialFlowTypeText[flowType], value: flowType })),
    [],
  )

  const subCategoryOptions: SelectOption[] = useMemo(
    () =>
      materialSubCategoryOrder.map((subCategory) => ({
        label: materialSubCategoryText[subCategory],
        value: subCategory,
      })),
    [],
  )

  const industryOptions: SelectOption[] = useMemo(
    () => industries.map((industry) => ({ label: industry, value: industry })),
    [industries],
  )

  const rows = useMemo(() => {
    let data = list
    if (query.code.trim()) {
      const keyword = query.code.trim().toLowerCase()
      data = data.filter((item) => item.code.toLowerCase().includes(keyword))
    }
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.flowType) {
      data = data.filter((item) => item.flowType === query.flowType)
    }
    if (query.subCategory) {
      data = data.filter((item) => item.subCategory === query.subCategory)
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
    const { material, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteMaterial(material.id)
        toast('删除成功')
      } else {
        await updateMaterialStatus(material.id, mode === 'enable' ? 'enabled' : 'disabled')
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
      const result = await batchUpdateMaterialStatus(
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

  const columns: Column<MaterialItem>[] = [
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
          aria-label={`选择物料 ${row.name}`}
          onChange={() => toggleRow(row.id)}
        />
      ),
    },
    {
      key: 'code',
      title: '物料编码',
      width: 120,
      render: (row) => (
        <button className="link mono nowrap" onClick={() => openView(row.id)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: '物料名称',
      width: 160,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'flowType',
      title: '物料类型',
      width: 170,
      render: (row) => (
        <span className="flex gap-xs">
          <Tag tone={materialFlowTypeTone[row.flowType]}>{materialFlowTypeText[row.flowType]}</Tag>
          {row.subCategory && <span className="toolbar-tip">{materialSubCategoryText[row.subCategory]}</span>}
        </span>
      ),
    },
    {
      key: 'industries',
      title: '适用行业',
      width: 180,
      render: (row) => (
        <span className="cell-ellipsis" title={industriesText(row.industries)}>
          {industriesText(row.industries)}
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
          <button className="link" onClick={() => openView(row.id)}>
            查看
          </button>
          <button className="link" onClick={() => openEdit(row.id)}>
            编辑
          </button>
          {row.status === 'disabled' ? (
            <button className="link" onClick={() => setConfirm({ material: row, mode: 'enable' })}>
              启用
            </button>
          ) : (
            <button className="link link-danger" onClick={() => setConfirm({ material: row, mode: 'disable' })}>
              禁用
            </button>
          )}
          {/* 删除仅对「已禁用」的物料开放，启用态隐藏入口 */}
          {canDeleteMaterial(row) && (
            <button className="link link-danger" onClick={() => setConfirm({ material: row, mode: 'delete' })}>
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
        breadcrumb={['后台管理', '基础库', '物料库']}
        title="物料库"
        actions={
          <Button variant="primary" onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">物料编码</span>
            <Input
              value={query.code}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">物料名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">物料类型</span>
            <Select
              value={query.flowType}
              placeholder="全部"
              options={flowTypeOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, flowType: e.target.value as '' | MaterialFlowType }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">物料子类</span>
            <Select
              value={query.subCategory}
              placeholder="全部"
              options={subCategoryOptions}
              onChange={(e) =>
                setQuery((prev) => ({ ...prev, subCategory: e.target.value as '' | MaterialSubCategory }))
              }
            />
          </div>
          <div className="query-item">
            <span className="query-label">适用行业</span>
            <Select
              value={query.industry}
              placeholder="全部"
              options={industryOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, industry: e.target.value }))}
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
            <span className="toolbar-title">物料列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 已选 {selectedItems.length} 条
            </span>
          </div>
          <div className="flex gap-xs">
            <Button
              size="small"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchStatus('enabled')}
            >
              批量启用
            </Button>
            <Button
              size="small"
              disabled={selectedItems.length === 0 || batching}
              onClick={() => setBatchStatus('disabled')}
            >
              批量停用
            </Button>
            <Button onClick={() => toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)}>导出</Button>
          </div>
        </div>

        <div className="material-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <MaterialViewModal
        open={viewOpen}
        materialId={viewId}
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

      <MaterialFormModal
        open={formOpen}
        materialId={editId}
        onClose={() => {
          setFormOpen(false)
          setEditId(null)
        }}
        onSaved={handleSaved}
      />

      <MaterialConfirmModal
        open={!!confirm}
        material={confirm?.material ?? null}
        mode={confirm?.mode ?? 'enable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />

      <MaterialBatchConfirmModal
        open={!!batchStatus}
        status={batchStatus ?? 'enabled'}
        count={selectedItems.length}
        submitting={batching}
        onClose={() => setBatchStatus(null)}
        onConfirm={handleBatchConfirm}
      />

      <MaterialBatchResultModal
        open={!!batchResult}
        status={batchResult?.status ?? 'enabled'}
        result={batchResult?.data ?? null}
        onClose={() => setBatchResult(null)}
      />
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { deleteOperation, fetchOperations, updateOperationUseStatus } from '@/mock'
import type { EnableStatus, OperationItem, OperationType } from '@/types'
import OperationConfirmModal from './OperationConfirmModal'
import type { OperationConfirmMode } from './OperationConfirmModal'
import { operationTypeOrder, operationTypeText, operationTypeTone, useStatusText, useStatusTone } from './operationMeta'
import './OperationPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  type: '' | OperationType
  useStatus: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = { code: '', name: '', type: '', useStatus: '' }

export default function OperationListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<OperationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [grouped, setGrouped] = useState(false)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ operation: OperationItem; mode: OperationConfirmMode } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchOperations())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const typeOptions: SelectOption[] = operationTypeOrder.map((type) => ({
    label: operationTypeText[type],
    value: type,
  }))

  const rows = useMemo(() => {
    let data = list
    if (query.code.trim()) {
      const keyword = query.code.trim().toLowerCase()
      data = data.filter((item) => item.code.toLowerCase().includes(keyword))
    }
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.type) {
      data = data.filter((item) => item.type === query.type)
    }
    if (query.useStatus) {
      data = data.filter((item) => item.useStatus === query.useStatus)
    }
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = async () => {
    if (!confirm) return
    const { operation, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteOperation(operation.id)
        toast('删除成功')
      } else {
        await updateOperationUseStatus(operation.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(mode === 'enable' ? '启用成功' : '禁用成功')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<OperationItem>[] = [
    {
      key: 'code',
      title: <span data-ann-target="operation.col.code">工序编码</span>,
      width: 130,
      render: (row) => (
        <button className="link mono nowrap" onClick={() => navigate(`/basic/operation/${row.id}`)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: <span data-ann-target="operation.col.name">工序名称</span>,
      width: 160,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'type',
      title: <span data-ann-target="operation.col.type">工序类型</span>,
      width: 110,
      render: (row) => <Tag tone={operationTypeTone[row.type]}>{operationTypeText[row.type]}</Tag>,
    },
    {
      key: 'useStatus',
      title: <span data-ann-target="operation.col.status">使用状态</span>,
      width: 100,
      render: (row) => <Tag tone={useStatusTone[row.useStatus]}>{useStatusText[row.useStatus]}</Tag>,
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
      width: 200,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="operation.row.view" onClick={() => navigate(`/basic/operation/${row.id}`)}>
            查看
          </button>
          <button className="link" data-ann-target="operation.row.edit" onClick={() => navigate(`/basic/operation/${row.id}/edit`)}>
            编辑
          </button>
          {row.useStatus === 'disabled' ? (
            <button className="link" data-ann-target="operation.row.enable" onClick={() => setConfirm({ operation: row, mode: 'enable' })}>
              启用
            </button>
          ) : (
            <button className="link link-danger" data-ann-target="operation.row.disable" onClick={() => setConfirm({ operation: row, mode: 'disable' })}>
              禁用
            </button>
          )}
          {row.useStatus === 'disabled' && (
            <button className="link link-danger" data-ann-target="operation.row.delete" onClick={() => setConfirm({ operation: row, mode: 'delete' })}>
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
        breadcrumb={['系统管理', '工艺流程管理', '工序']}
        title={<span data-ann-target="operation.page.global">工序</span>}
        description="只维护「有哪些数据项」与单位，不填数量（数量 = 工序单耗，在核算模型 / 数据录入阶段填写）；模板可自由编辑、引用即复制、不做版本化"
        actions={
          <Button variant="primary" data-ann-target="operation.add" onClick={() => navigate('/basic/operation/new')}>
            新增
          </Button>
        }
      />

      <div className="card" data-ann-target="operation.page.list">
        <div className="query-bar" data-ann-target="operation.query.bar">
          <div className="query-item">
            <span className="query-label">工序编码</span>
            <Input
              value={query.code}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">工序名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">工序类型</span>
            <Select
              value={query.type}
              placeholder="全部"
              options={typeOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, type: e.target.value as '' | OperationType }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">使用状态</span>
            <Select
              value={query.useStatus}
              placeholder="全部"
              options={[
                { label: '启用', value: 'enabled' },
                { label: '禁用', value: 'disabled' },
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
            <span className="toolbar-title">工序列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 删除仅在「已禁用」状态开放（R-016）；已被引用的工序仍可禁用
            </span>
          </div>
          <div className="flex gap-xs">
            <Button size="small" data-ann-target="operation.group" onClick={() => setGrouped((prev) => !prev)}>
              {grouped ? '取消按类型分组' : '按工序类型分组'}
            </Button>
            <Button onClick={() => toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)}>导出</Button>
          </div>
        </div>

        {grouped ? (
          <div className="operation-group-wrap">
            {operationTypeOrder.map((type) => {
              const groupRows = rows.filter((item) => item.type === type)
              if (groupRows.length === 0) return null
              return (
                <div className="operation-group" key={type}>
                  <div className="operation-group-header">
                    <Tag tone={operationTypeTone[type]}>{operationTypeText[type]}</Tag>
                    <span className="toolbar-tip">共 {groupRows.length} 条</span>
                  </div>
                  <div className="operation-table-wrap">
                    <Table columns={columns} data={groupRows} rowKey={(row) => row.id} loading={loading} />
                  </div>
                </div>
              )
            })}
            {!loading && rows.length === 0 && <div className="empty">暂无数据</div>}
          </div>
        ) : (
          <>
            <div className="operation-table-wrap">
              <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
            </div>
            <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      <OperationConfirmModal
        open={!!confirm}
        operation={confirm?.operation ?? null}
        mode={confirm?.mode ?? 'enable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

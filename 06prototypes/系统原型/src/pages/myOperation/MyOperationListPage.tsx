import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { deleteMyOperation, fetchMyOperations, updateMyOperationUseStatus } from '@/mock'
import type { EnableStatus, MyOperationItem, OperationType } from '@/types'
import {
  operationTypeOrder,
  operationTypeText,
  operationTypeTone,
  useStatusText,
  useStatusTone,
} from '@/pages/operation/operationMeta'
import MyOperationReferenceModal from './MyOperationReferenceModal'
import NewMyOperationMenu from './NewMyOperationMenu'
import { MY_OPERATION_BREADCRUMB } from './myOperationMeta'
import '@/pages/operation/OperationPage.css'
import '@/pages/myProcess/MyProcessPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  type: '' | OperationType
  useStatus: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = { code: '', name: '', type: '', useStatus: '' }

/**
 * 我的工序库（前台 · 组织自建工序）：
 * 与「我的工艺库」并列，支持自定义工序与从平台工序库复制；
 * 复制/自建后均为本组织可编辑数据，支持查看 / 编辑 / 启停 / 删除。
 */
export default function MyOperationListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<MyOperationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [referenceOpen, setReferenceOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ operation: MyOperationItem; mode: 'enable' | 'disable' } | null>(null)
  const [deleting, setDeleting] = useState<MyOperationItem | null>(null)

  const handleCreate = (mode: 'custom' | 'platform') => {
    if (mode === 'platform') {
      setReferenceOpen(true)
    } else {
      navigate('/pcf/my-operation/new')
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchMyOperations())
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
    try {
      await updateMyOperationUseStatus(confirm.operation.id, confirm.mode === 'enable' ? 'enabled' : 'disabled')
      toast(confirm.mode === 'enable' ? '启用成功' : '禁用成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteMyOperation(deleting.id)
      toast('删除成功')
      setDeleting(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  const columns: Column<MyOperationItem>[] = [
    {
      key: 'code',
      title: '工序编码',
      width: 130,
      render: (row) => (
        <button
          className="link mono nowrap"
          data-ann-target="my-operation.row.view"
          onClick={() => navigate(`/pcf/my-operation/${row.id}`)}
        >
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: '工序名称',
      width: 160,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'type',
      title: '工序类型',
      width: 100,
      render: (row) => <Tag tone={operationTypeTone[row.type]}>{operationTypeText[row.type]}</Tag>,
    },
    {
      key: 'useStatus',
      title: '使用状态',
      width: 90,
      render: (row) => <Tag tone={useStatusTone[row.useStatus]}>{useStatusText[row.useStatus]}</Tag>,
    },
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
      key: 'actions',
      title: '操作',
      width: 190,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/pcf/my-operation/${row.id}`)}>
            查看
          </button>
          <button
            className="link"
            data-ann-target="my-operation.edit"
            onClick={() => navigate(`/pcf/my-operation/${row.id}/edit`)}
          >
            编辑
          </button>
          {row.useStatus === 'disabled' ? (
            <button
              className="link"
              data-ann-target="my-operation.status"
              onClick={() => setConfirm({ operation: row, mode: 'enable' })}
            >
              启用
            </button>
          ) : (
            <button
              className="link link-danger"
              data-ann-target="my-operation.status"
              onClick={() => setConfirm({ operation: row, mode: 'disable' })}
            >
              禁用
            </button>
          )}
          <button className="link link-danger" data-ann-target="my-operation.delete" onClick={() => setDeleting(row)}>
            删除
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={MY_OPERATION_BREADCRUMB}
        title={<span data-ann-target="my-operation.page.global">我的工序库</span>}
        description="组织级工序库：自定义工序，或批量从平台工序库复制可编辑副本"
        actions={<NewMyOperationMenu onSelect={handleCreate} />}
      />

      <div className="card" data-ann-target="my-operation.list">
        <div className="query-bar" data-ann-target="my-operation.query">
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
            <span className="toolbar-tip">共 {rows.length} 条</span>
          </div>
          <Button data-ann-target="my-operation.export" onClick={() => toast(`导出任务已创建，共 ${rows.length} 条`)}>
            导出
          </Button>
        </div>

        <div className="operation-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <MyOperationReferenceModal
        open={referenceOpen}
        onClose={() => setReferenceOpen(false)}
        onCopied={() => void load()}
      />

      <Modal
        open={!!confirm}
        title={confirm?.mode === 'enable' ? '确认启用' : '确认禁用'}
        size="sm"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>取消</Button>
            <Button variant={confirm?.mode === 'enable' ? 'primary' : 'danger'} onClick={handleConfirm}>
              {confirm?.mode === 'enable' ? '确认启用' : '确认禁用'}
            </Button>
          </>
        }
      >
        <div className="modal-confirm-text">
          <div>
            <div>
              确认{confirm?.mode === 'enable' ? '启用' : '禁用'}工序「{confirm?.operation.name}」（
              {confirm?.operation.code}）？
            </div>
            <div className="modal-confirm-tip">
              {confirm?.mode === 'enable'
                ? '启用后该工序可被新的工艺流程引用。'
                : '禁用后该工序不可被新的工艺流程引用；已复制出去的工艺流程副本不受影响。'}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        title="确认删除"
        size="sm"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <div className="modal-confirm-text">
          <div>
            <div>
              确认删除工序「{deleting?.name}」（{deleting?.code}）？
            </div>
            <div className="modal-confirm-tip">
              删除后不可恢复；若工艺流程仍引用该工序，需在工艺流程侧调整（本模块不做引用校验）。
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { deleteStandard, fetchStandards } from '@/mock'
import type { StandardItem } from '@/types'
import StandardConfirmModal from './StandardConfirmModal'
import type { StandardConfirmMode } from './StandardConfirmModal'
import { standardStatusTone } from './standardMeta'
import './StandardPage.css'

const PAGE_SIZE = 10

interface QueryState {
  /** 标准号（模糊） */
  code: string
  /** 标准名称（模糊，匹配中文标准名称） */
  nameZh: string
  /** 标准状态（模糊，录入框） */
  status: string
}

const EMPTY_QUERY: QueryState = { code: '', nameZh: '', status: '' }

export default function StandardListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<StandardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ standard: StandardItem; mode: StandardConfirmMode } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchStandards())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 查询：按标准号 / 标准名称 / 标准状态筛选 */
  const rows = useMemo(() => {
    let data = list
    if (query.code.trim()) {
      const keyword = query.code.trim().toLowerCase()
      data = data.filter((item) => item.code.toLowerCase().includes(keyword))
    }
    if (query.nameZh.trim()) {
      data = data.filter((item) => item.nameZh.includes(query.nameZh.trim()))
    }
    if (query.status.trim()) {
      data = data.filter((item) => item.status.includes(query.status.trim()))
    }
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openView = (id: string) => navigate(`/basic/standard/${id}`)

  const handleRowConfirm = async () => {
    if (!confirm) return
    try {
      await deleteStandard(confirm.standard.id)
      toast('删除成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<StandardItem>[] = [
    {
      key: 'code',
      title: <span data-ann-target="standard.col.code">标准号</span>,
      width: 180,
      render: (row) => (
        <button className="link mono nowrap" data-ann-target="standard.row.code" onClick={() => openView(row.id)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'nameZh',
      title: <span data-ann-target="standard.col.nameZh">标准名称</span>,
      render: (row) => (
        <button className="link" data-ann-target="standard.row.name" onClick={() => openView(row.id)}>
          {row.nameZh}
        </button>
      ),
    },
    {
      key: 'status',
      title: <span data-ann-target="standard.col.status">标准状态</span>,
      width: 120,
      render: (row) => <Tag tone={standardStatusTone(row.status)}>{row.status || '-'}</Tag>,
    },
    {
      key: 'publishDate',
      title: <span data-ann-target="standard.col.publishDate">发布日期</span>,
      width: 120,
      render: (row) => <span className="nowrap">{row.publishDate || '-'}</span>,
    },
    {
      key: 'implementDate',
      title: <span data-ann-target="standard.col.implementDate">实施日期</span>,
      width: 120,
      render: (row) => <span className="nowrap">{row.implementDate || '-'}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 160,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="standard.row.view" onClick={() => openView(row.id)}>
            查看
          </button>
          <button className="link" data-ann-target="standard.row.edit" onClick={() => navigate(`/basic/standard/${row.id}/edit`)}>
            编辑
          </button>
          <button className="link link-danger" data-ann-target="standard.row.delete" onClick={() => setConfirm({ standard: row, mode: 'delete' })}>
            删除
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '基础库', '标准文件库']}
        title={<span data-ann-target="standard.page.global">标准文件库</span>}
        description="核算依据的字典：一个标准号 = 一条记录；可随时编辑、删除"
        actions={
          <Button variant="primary" data-ann-target="standard.add" onClick={() => navigate('/basic/standard/new')}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="standard.query.bar">
          <div className="query-item">
            <span className="query-label">标准号</span>
            <Input
              value={query.code}
              placeholder="如 GB/T 24067-2024"
              onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">标准名称</span>
            <Input
              value={query.nameZh}
              placeholder="如 产品碳足迹"
              onChange={(e) => setQuery((prev) => ({ ...prev, nameZh: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">标准状态</span>
            <Input
              value={query.status}
              placeholder="如 现行"
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="standard.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" data-ann-target="standard.query.search" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">标准字典</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 「来源链接」与「附件」二选一；附件仅限内部查阅，不得作为对外交付物（A3）
            </span>
          </div>
        </div>

        <div className="standard-table-wrap" data-ann-target="standard.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <StandardConfirmModal
        open={!!confirm}
        standard={confirm?.standard ?? null}
        mode={confirm?.mode ?? 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />
    </>
  )
}

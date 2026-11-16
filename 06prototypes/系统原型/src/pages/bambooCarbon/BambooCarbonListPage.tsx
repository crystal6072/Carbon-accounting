import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  canMaintainKnowledge,
  deleteBambooCarbonTopic,
  fetchBambooCarbonTopics,
  type BambooCarbonQuery,
} from '@/mock'
import type { BambooCarbonTopic } from '@/types'
import BambooCarbonConfirmModal from './BambooCarbonConfirmModal'
import {
  BAMBOO_CATEGORY_LABEL,
  BAMBOO_CATEGORY_OPTIONS,
  BAMBOO_STATUS_LABEL,
  bambooStatusTone,
} from './bambooCarbonMeta'
import './BambooCarbonPage.css'

const PAGE_SIZE = 10

const EMPTY_QUERY: BambooCarbonQuery = { category: '', title: '', status: '' }

export default function BambooCarbonListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const canMaintain = canMaintainKnowledge()

  const [list, setList] = useState<BambooCarbonTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<BambooCarbonQuery>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<BambooCarbonTopic | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchBambooCarbonTopics())
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    let data = list
    if (query.category) data = data.filter((item) => item.category === query.category)
    if (query.title?.trim()) {
      const kw = query.title.trim().toLowerCase()
      data = data.filter((item) => item.title.toLowerCase().includes(kw))
    }
    if (query.status) data = data.filter((item) => item.status === query.status)
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openView = (id: string) => navigate(`/basic/bamboo-carbon/${id}`)

  const handleRowConfirm = async () => {
    if (!confirm) return
    try {
      await deleteBambooCarbonTopic(confirm.id)
      toast('删除成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<BambooCarbonTopic>[] = [
    {
      key: 'title',
      title: '标题',
      render: (row) => (
        <button className="link" onClick={() => openView(row.id)}>
          {row.title}
        </button>
      ),
    },
    {
      key: 'category',
      title: '所属分类',
      width: 120,
      render: (row) => <span className="nowrap">{BAMBOO_CATEGORY_LABEL[row.category]}</span>,
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row) => <Tag tone={bambooStatusTone(row.status)}>{BAMBOO_STATUS_LABEL[row.status]}</Tag>,
    },
    {
      key: 'publishedAt',
      title: '发布时间',
      width: 160,
      render: (row) => <span className="nowrap">{row.publishedAt || '-'}</span>,
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
          {canMaintain && (
            <>
              <button className="link" onClick={() => navigate(`/basic/bamboo-carbon/${row.id}/edit`)}>编辑</button>
              <button className="link link-danger" onClick={() => setConfirm(row)}>删除</button>
            </>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '碳核算知识库', '木竹碳专题库']}
        title="木竹碳专题库"
        description="碳固存 / 碳循环 / 生物质碳排放 / 核算指南与工具 / 行业动态与政策。由平台运营统一维护发布，企业业务端只读查阅。"
        actions={
          canMaintain && (
            <Button variant="primary" onClick={() => navigate('/basic/bamboo-carbon/new')}>
              新增文章
            </Button>
          )
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">所属分类</span>
            <Select
              value={query.category}
              placeholder="全部"
              options={BAMBOO_CATEGORY_OPTIONS}
              onChange={(e) => setQuery((prev) => ({ ...prev, category: e.target.value as BambooCarbonQuery['category'] }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">文章标题</span>
            <Input
              value={query.title}
              placeholder="输入标题搜索"
              onChange={(e) => setQuery((prev) => ({ ...prev, title: e.target.value }))}
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
            <span className="toolbar-title">专题文章</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 平台统一维护发布；企业端只读查阅已发布内容
            </span>
          </div>
        </div>

        <div className="bamboo-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <BambooCarbonConfirmModal
        open={!!confirm}
        topic={confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />
    </>
  )
}

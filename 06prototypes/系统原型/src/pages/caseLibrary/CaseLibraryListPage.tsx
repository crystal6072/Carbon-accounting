import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { canMaintainKnowledge, deleteCase, fetchCases, type CarbonCaseQuery } from '@/mock'
import type { CarbonCase } from '@/types'
import CaseLibraryConfirmModal from './CaseLibraryConfirmModal'
import { CASE_TYPE_LABEL, CASE_TYPE_OPTIONS, CASE_STATUS_LABEL, caseStatusTone, reductionText } from './caseLibraryMeta'
import './CaseLibraryPage.css'

const PAGE_SIZE = 10

const EMPTY_QUERY: CarbonCaseQuery = { caseType: '', industry: '', caseName: '', status: '' }

export default function CaseLibraryListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const canMaintain = canMaintainKnowledge()

  const [list, setList] = useState<CarbonCase[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<CarbonCaseQuery>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<CarbonCase | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchCases())
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
    if (query.caseType) data = data.filter((item) => item.caseType === query.caseType)
    if (query.industry?.trim()) {
      const kw = query.industry.trim().toLowerCase()
      data = data.filter((item) => item.industry.toLowerCase().includes(kw))
    }
    if (query.caseName?.trim()) {
      const kw = query.caseName.trim().toLowerCase()
      data = data.filter((item) => item.caseName.toLowerCase().includes(kw))
    }
    if (query.status) data = data.filter((item) => item.status === query.status)
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openView = (id: string) => navigate(`/case/library/${id}`)

  const handleRowConfirm = async () => {
    if (!confirm) return
    try {
      await deleteCase(confirm.id)
      toast('删除成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<CarbonCase>[] = [
    {
      key: 'caseName',
      title: '案例名称',
      render: (row) => (
        <button className="link" onClick={() => openView(row.id)}>
          {row.caseName}
        </button>
      ),
    },
    {
      key: 'caseType',
      title: '案例类型',
      width: 110,
      render: (row) => <Tag tone="default">{CASE_TYPE_LABEL[row.caseType]}</Tag>,
    },
    {
      key: 'industry',
      title: '所属行业',
      width: 200,
      render: (row) => <span className="cell-ellipsis" title={row.industry}>{row.industry}</span>,
    },
    {
      key: 'reductionAmount',
      title: '年减排量',
      width: 140,
      render: (row) => <span className="nowrap">{reductionText(row.reductionAmount)}</span>,
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row) => <Tag tone={caseStatusTone(row.status)}>{CASE_STATUS_LABEL[row.status]}</Tag>,
    },
    {
      key: 'publishedAt',
      title: '发布时间',
      width: 150,
      render: (row) => <span className="nowrap">{row.publishedAt || '-'}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => openView(row.id)}>查看</button>
          {canMaintain && (
            <>
              <button className="link" onClick={() => navigate(`/case/library/${row.id}/edit`)}>编辑</button>
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
        breadcrumb={['系统管理', '碳核算知识库', '典型案例库']}
        title="典型案例库"
        description="行业减排 / 核算 / 优化案例的结构化沉淀。由平台运营统一维护发布，企业业务端只读查阅。"
        actions={
          canMaintain && (
            <Button variant="primary" onClick={() => navigate('/case/library/new')}>
              新增案例
            </Button>
          )
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">案例类型</span>
            <Select
              value={query.caseType}
              placeholder="全部"
              options={CASE_TYPE_OPTIONS}
              onChange={(e) => setQuery((prev) => ({ ...prev, caseType: e.target.value as CarbonCaseQuery['caseType'] }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">所属行业</span>
            <Input
              value={query.industry}
              placeholder="输入行业关键词"
              onChange={(e) => setQuery((prev) => ({ ...prev, industry: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">案例名称</span>
            <Input
              value={query.caseName}
              placeholder="输入名称搜索"
              onChange={(e) => setQuery((prev) => ({ ...prev, caseName: e.target.value }))}
            />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>搜索</Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">案例列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 平台统一维护发布；企业端只读查阅已发布案例
            </span>
          </div>
        </div>

        <div className="case-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <CaseLibraryConfirmModal
        open={!!confirm}
        item={confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleRowConfirm}
      />
    </>
  )
}

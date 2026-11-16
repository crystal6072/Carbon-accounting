import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { TreeOption } from '@/types'
import {
  copyBaseline,
  deleteBaseline,
  fetchBaselines,
} from '@/mock/baselines'
import type { Boundary, DataSource, IndustryBaseline } from '@/mock/baselines'
import { fetchIndustryTreeOptions, systemBoundaryItems } from '@/mock'
import {
  DATA_SOURCE_SELECT_OPTIONS,
  DATA_SOURCE_TEXT,
  DATA_SOURCE_TONE,
  boundaryText,
  boundaryTone,
  numText,
} from './baselineMeta'
import IndustryBaselineConfirmModal from './IndustryBaselineConfirmModal'
import type { BaselineConfirmMode } from './IndustryBaselineConfirmModal'
import './IndustryBaselinePage.css'

const PAGE_SIZE = 10

/** 行业库树 → 末级行业扁平选项（value=行业编码，label=行业名称，供下拉与筛选复用） */
function collectIndustryLeaves(nodes: TreeOption[], prefix: string[] = []): { value: string; label: string; path: string }[] {
  const out: { value: string; label: string; path: string }[] = []
  for (const n of nodes) {
    const path = [...prefix, n.label]
    if (n.children && n.children.length) {
      out.push(...collectIndustryLeaves(n.children as TreeOption[], path))
    } else {
      out.push({ value: (n.extra as string) ?? n.value, label: n.label, path: path.join(' / ') })
    }
  }
  return out
}

const EMPTY_QUERY = {
  codeOrName: '',
  industry: '',
  boundary: '' as Boundary | '',
  dataSource: '' as DataSource | '',
  sourceType: '',
}

export default function IndustryBaselineListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<IndustryBaseline[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ baseline: IndustryBaseline; mode: BaselineConfirmMode } | null>(null)

  const [industryOptions, setIndustryOptions] = useState<{ value: string; label: string; path: string }[]>([])
  const [boundaryOptions, setBoundaryOptions] = useState<{ value: string; label: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchBaselines())
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      const [indTree, bd] = await Promise.all([fetchIndustryTreeOptions(), Promise.resolve(systemBoundaryItems())])
      setIndustryOptions(collectIndustryLeaves(indTree))
      setBoundaryOptions([{ value: '', label: '全部' }, ...bd.map((it) => ({ value: it.code, label: it.label }))])
    })()
  }, [])

  const industrySelectOptions = useMemo(
    () => [{ value: '', label: '全部' }, ...industryOptions.map((o) => ({ value: o.value, label: o.label }))],
    [industryOptions],
  )

  const rows = useMemo(() => {
    let data = list
    const kw = query.codeOrName.trim().toLowerCase()
    if (kw) data = data.filter((b) => b.baselineName.toLowerCase().includes(kw) || b.baselineCode.toLowerCase().includes(kw))
    if (query.industry) data = data.filter((b) => b.industryCode === query.industry)
    if (query.boundary) data = data.filter((b) => b.boundary === query.boundary)
    if (query.dataSource) data = data.filter((b) => b.dataSource === query.dataSource)
    if (query.sourceType) data = data.filter((b) => b.sourceType === query.sourceType)
    return data
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openView = (id: string) => navigate(`/baseline/industry/${id}`)
  const openEdit = (id: string) => navigate(`/baseline/industry/${id}/edit`)

  const handleAction = async (mode: BaselineConfirmMode, baseline: IndustryBaseline) => {
    if (mode === 'boundary') return
    try {
      if (mode === 'delete') await deleteBaseline(baseline.id)
      toast('操作成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleCopy = async (baseline: IndustryBaseline) => {
    try {
      const copied = await copyBaseline(baseline.id)
      toast('已复制为新记录，请在编辑页调整边界 / 适用年份 / 产品分类等')
      navigate(`/baseline/industry/${copied.id}/edit`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '复制失败', 'error')
    }
  }

  const columns: Column<IndustryBaseline>[] = [
    {
      key: 'dataSource',
      title: '数据来源',
      width: 90,
      render: (row) => <Tag tone={DATA_SOURCE_TONE[row.dataSource]}>{DATA_SOURCE_TEXT[row.dataSource]}</Tag>,
    },
    {
      key: 'baselineCode',
      title: '基线编号',
      width: 170,
      render: (row) => <span className="mono nowrap">{row.baselineCode}</span>,
    },
    {
      key: 'baselineName',
      title: '基线名称',
      render: (row) => (
        <button className="link" data-ann-target="baseline.row.name" onClick={() => openView(row.id)}>
          {row.baselineName}
        </button>
      ),
    },
    {
      key: 'industry',
      title: '行业',
      width: 160,
      render: (row) => <span className="mono nowrap" title={row.industryPath}>{row.industryName}</span>,
    },
    {
      key: 'boundary',
      title: '边界',
      width: 150,
      render: (row) => <Tag tone={boundaryTone(row.boundary)}>{boundaryText(row.boundary)}</Tag>,
    },
    {
      key: 'unit',
      title: '单位',
      width: 90,
      render: (row) => <span className="nowrap">{`${row.unitValue} ${row.unitCode}`}</span>,
    },
    {
      key: 'totalEmission',
      title: '基线总值',
      width: 100,
      align: 'right',
      render: (row) => <span className="mono">{numText(row.totalEmission)}</span>,
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 140,
      render: (row) => <span className="nowrap">{row.updatedAt || '-'}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="baseline.row.view" onClick={() => openView(row.id)}>查看</button>
          <button className="link" data-ann-target="baseline.row.edit" onClick={() => openEdit(row.id)}>编辑</button>
          <button className="link link-danger" data-ann-target="baseline.row.delete" onClick={() => setConfirm({ baseline: row, mode: 'delete' })}>删除</button>
          <button className="link" data-ann-target="baseline.row.copy" onClick={() => handleCopy(row)}>复制</button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品碳基线库', '行业基线录入']}
        title={<span data-ann-target="baseline.page.global">行业基线录入</span>}
        description="按行业 / 产品分类 / 系统边界 / 基准年维护产品碳足迹基线（系统预置 + 组织自建），供报告对标引用"
        actions={
          <Button variant="primary" data-ann-target="baseline.add" onClick={() => navigate('/baseline/industry/new')}>
            新增基线
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="baseline.query.bar">
          <div className="query-item">
            <span className="query-label">编号 / 名称</span>
            <Input
              value={query.codeOrName}
              placeholder="如 纤维板 / IB-2025"
              onChange={(e) => setQuery((prev) => ({ ...prev, codeOrName: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">行业</span>
            <Select
              value={query.industry}
              options={industrySelectOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, industry: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">系统边界</span>
            <Select
              value={query.boundary}
              options={boundaryOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, boundary: e.target.value as Boundary | '' }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">数据来源</span>
            <Select
              value={query.dataSource}
              options={DATA_SOURCE_SELECT_OPTIONS}
              onChange={(e) => setQuery((prev) => ({ ...prev, dataSource: e.target.value as DataSource | '' }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">来源类型</span>
            <Input
              value={query.sourceType}
              placeholder="如 行业统计"
              onChange={(e) => setQuery((prev) => ({ ...prev, sourceType: e.target.value }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="baseline.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" data-ann-target="baseline.query.search" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">行业基线</span>
            <span className="toolbar-tip">共 {rows.length} 条 · 同一行业 + 边界 + 年份仅允许 1 条可用基线（系统内置 + 组织自建互斥）</span>
          </div>
        </div>

        <div className="baseline-table-wrap" data-ann-target="baseline.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <IndustryBaselineConfirmModal
        open={!!confirm}
        mode={confirm?.mode ?? 'delete'}
        baseline={confirm?.baseline ?? null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && handleAction(confirm.mode, confirm.baseline)}
      />
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  deleteProcess,
  fetchCategories,
  fetchIndustryOptions,
  fetchLifecycleOptions,
  fetchProcesses,
  fetchProducts,
  updateProcessUseStatus,
} from '@/mock'
import type { CategoryItem, EnableStatus, ProcessItem } from '@/types'
import ProcessConfirmModal from './ProcessConfirmModal'
import type { ProcessConfirmMode } from './ProcessConfirmModal'
import { useStatusText, useStatusTone } from './processMeta'
import './ProcessPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  categoryId: string
  industry: string
  lifecycleStage: string
  useStatus: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = {
  code: '',
  name: '',
  categoryId: '',
  industry: '',
  lifecycleStage: '',
  useStatus: '',
}

export default function ProcessListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<ProcessItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [lifecycles, setLifecycles] = useState<string[]>([])
  /** 工艺流程编码 → 已复制产品数（只读反查，由产品侧引用关系反推） */
  const [copiedMap, setCopiedMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ process: ProcessItem; mode: ProcessConfirmMode } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [processes, categoryList, products, industryList, lifecycleList] = await Promise.all([
        fetchProcesses(),
        fetchCategories(),
        fetchProducts(),
        fetchIndustryOptions(),
        fetchLifecycleOptions(),
      ])
      setList(processes)
      setCategories(categoryList)
      setIndustries(industryList)
      setLifecycles(lifecycleList)

      const counter = new Map<string, number>()
      products.forEach((product) => {
        product.processes.forEach((process) => {
          counter.set(process.processCode, (counter.get(process.processCode) ?? 0) + 1)
        })
      })
      setCopiedMap(counter)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categoryName = useMemo(() => {
    const map = new Map<string, CategoryItem>()
    categories.forEach((item) => map.set(item.id, item))
    return map
  }, [categories])

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories
        .slice()
        .sort((a, b) => a.level - b.level || (a.sortNo ?? 9999) - (b.sortNo ?? 9999))
        .map((item) => ({
          label: `${'　'.repeat(item.level - 1)}${item.name}${item.status === 'disabled' ? '（已禁用）' : ''}`,
          value: item.id,
        })),
    [categories],
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
    if (query.categoryId) {
      data = data.filter((item) => item.categoryId === query.categoryId)
    }
    if (query.industry) {
      data = data.filter((item) => item.industry === query.industry)
    }
    if (query.lifecycleStage) {
      data = data.filter((item) => item.lifecycleStage === query.lifecycleStage)
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
    const { process: target, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteProcess(target.id)
        toast('删除成功')
      } else {
        await updateProcessUseStatus(target.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(mode === 'enable' ? '启用成功' : '禁用成功')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<ProcessItem>[] = [
    {
      key: 'code',
      title: '工艺流程编码',
      width: 140,
      render: (row) => (
        <button className="link mono nowrap" onClick={() => navigate(`/basic/process/${row.id}`)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'name',
      title: '工艺流程名称',
      width: 170,
      render: (row) => (
        <span className="cell-ellipsis" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: '适用产品分类',
      width: 140,
      render: (row) => {
        const category = categoryName.get(row.categoryId)
        if (!category) return '-'
        return category.status === 'disabled' ? (
          <span className="flex gap-xs">
            {category.name}
            <Tag>已禁用</Tag>
          </span>
        ) : (
          category.name
        )
      },
    },
    {
      key: 'industry',
      title: '所属行业',
      width: 130,
      render: (row) => <span className="nowrap">{row.industry || '-'}</span>,
    },
    {
      key: 'lifecycleStage',
      title: '所属生命周期阶段',
      width: 140,
      render: (row) => <span className="nowrap">{row.lifecycleStage || '-'}</span>,
    },
    {
      key: 'useStatus',
      title: '使用状态',
      width: 100,
      render: (row) => <Tag tone={useStatusTone[row.useStatus]}>{useStatusText[row.useStatus]}</Tag>,
    },
    {
      key: 'operations',
      title: '工序数量',
      width: 100,
      render: (row) => <span className="nowrap">{row.operations.length} 道</span>,
    },
    {
      key: 'copied',
      title: '已复制产品数',
      width: 120,
      render: (row) => {
        const count = copiedMap.get(row.code) ?? 0
        return count > 0 ? <Tag tone="info">{count} 个</Tag> : '-'
      },
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
      width: 170,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/basic/process/${row.id}`)}>
            查看
          </button>
          <button className="link" onClick={() => navigate(`/basic/process/${row.id}/edit`)}>
            编辑
          </button>
          {row.useStatus === 'disabled' ? (
            <>
              <button className="link" onClick={() => setConfirm({ process: row, mode: 'enable' })}>
                启用
              </button>
              <button className="link link-danger" onClick={() => setConfirm({ process: row, mode: 'delete' })}>
                删除
              </button>
            </>
          ) : (
            <button className="link link-danger" onClick={() => setConfirm({ process: row, mode: 'disable' })}>
              禁用
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '工艺流程管理', '工艺流程']}
        title="工艺流程"
        description="工艺流程把工序装配为有序工序链：模板间引用工序、被产品引用时复制并冻结（R-010）；不做版本化，通过启用 / 禁用控制能否被产品引用"
        actions={
          <Button variant="primary" onClick={() => navigate('/basic/process/new')}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">工艺流程编码</span>
            <Input
              value={query.code}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">工艺流程名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">适用产品分类</span>
            <Select
              value={query.categoryId}
              placeholder="全部"
              options={categoryOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, categoryId: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">所属行业</span>
            <Select
              value={query.industry}
              placeholder="全部"
              options={industries.map((item) => ({ label: item, value: item }))}
              onChange={(e) => setQuery((prev) => ({ ...prev, industry: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">所属生命周期阶段</span>
            <Select
              value={query.lifecycleStage}
              placeholder="全部"
              options={lifecycles.map((item) => ({ label: item, value: item }))}
              onChange={(e) => setQuery((prev) => ({ ...prev, lifecycleStage: e.target.value }))}
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
            <span className="toolbar-title">工艺流程列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 仅「启用」的工艺流程可被产品引用（R-009）；删除仅对「禁用」开放、不检查引用状态（R-013）
            </span>
          </div>
          <Button onClick={() => toast(`导出任务已创建，共 ${rows.length} 条（原型模拟，含工序明细）`)}>导出</Button>
        </div>

        <div className="process-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <ProcessConfirmModal
        open={!!confirm}
        process={confirm?.process ?? null}
        mode={confirm?.mode ?? 'enable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

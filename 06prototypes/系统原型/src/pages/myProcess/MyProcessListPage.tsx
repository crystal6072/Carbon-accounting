import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CascaderSelect, Input, Modal, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import { collectTreeValues } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { deleteMyProcess, fetchCategories, fetchCategoryTreeOptions, fetchMyProcesses } from '@/mock'
import type { CategoryItem, MyProcessItem, TreeOption } from '@/types'
import ProcessConfirmModal from '@/pages/process/ProcessConfirmModal'
import type { ProcessConfirmMode } from '@/pages/process/ProcessConfirmModal'
import MyProcessReferenceModal from './MyProcessReferenceModal'
import NewMyProcessMenu from './NewMyProcessMenu'
import { MY_PROCESS_BREADCRUMB } from './myProcessMeta'
import '@/pages/process/ProcessPage.css'
import './MyProcessPage.css'

const PAGE_SIZE = 20

interface QueryState {
  name: string
  categoryId: string
}

const EMPTY_QUERY: QueryState = { name: '', categoryId: '' }

export default function MyProcessListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<MyProcessItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  /** 产品分类多级选项（一级 / 二级 / 三级），供筛选使用 */
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState<{ process: MyProcessItem; mode: ProcessConfirmMode } | null>(null)
  const [referenceOpen, setReferenceOpen] = useState(false)

  /** 新增工艺方式选择（下拉）：自定义工艺 / 从平台工艺库选择 */
  const handleCreate = (mode: 'custom' | 'platform') => {
    if (mode === 'platform') {
      setReferenceOpen(true)
    } else {
      navigate('/pcf/my-process/new')
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [processes, categoryList, categoryTreeList] = await Promise.all([
        fetchMyProcesses(),
        fetchCategories(),
        fetchCategoryTreeOptions(),
      ])
      setList(processes)
      setCategories(categoryList)
      setCategoryTree(categoryTreeList)
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

  const categoryOptions = useMemo<TreeOption[]>(() => categoryTree, [categoryTree])

  const rows = useMemo(() => {
    let data = list
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.categoryId) {
      /** 选中父级分类时，命中其下所有子级分类 */
      const matched = new Set(collectTreeValues(categoryOptions, query.categoryId))
      data = data.filter((item) => matched.has(item.categoryId))
    }
    return data
  }, [list, query, categoryOptions])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = async () => {
    if (!confirm) return
    const { process: target } = confirm
    try {
      await deleteMyProcess(target.id)
      toast('删除成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<MyProcessItem>[] = [
    {
      key: 'name',
      title: '工艺流程名称',
      width: 180,
      render: (row) => (
        <button className="link cell-ellipsis" title={row.name} data-ann-target="my-process.row.view" onClick={() => navigate(`/pcf/my-process/${row.id}`)}>
          {row.name}
        </button>
      ),
    },
    {
      key: 'categoryId',
      title: '适用产品分类',
      width: 130,
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
      key: 'lifecycleStage',
      title: '所属生命周期阶段',
      width: 140,
      render: (row) => <span className="nowrap">{row.lifecycleStage || '-'}</span>,
    },
    {
      key: 'operations',
      title: '工序数量',
      width: 100,
      render: (row) => <span className="nowrap">{row.operations.length} 道</span>,
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
          <button className="link" onClick={() => navigate(`/pcf/my-process/${row.id}`)}>
            查看
          </button>
          <button className="link" data-ann-target="my-process.edit" onClick={() => navigate(`/pcf/my-process/${row.id}/edit`)}>
            编辑
          </button>
          <button className="link link-danger" data-ann-target="my-process.delete" onClick={() => setConfirm({ process: row, mode: 'delete' })}>
            删除
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={MY_PROCESS_BREADCRUMB}
        title="我的工艺库"
        actions={<NewMyProcessMenu onSelect={handleCreate} />}
      />

      <div className="card" data-ann-target="my-process.list">
        <div className="query-bar" data-ann-target="my-process.query">
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
            <CascaderSelect
              value={query.categoryId}
              placeholder="全部"
              options={categoryOptions}
              allowParent
              searchPlaceholder="搜索分类名称 / 编码"
              onChange={(value) => setQuery((prev) => ({ ...prev, categoryId: value }))}
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
            <span className="toolbar-title">工艺列表</span>
            <span className="toolbar-tip">共 {rows.length} 条</span>
          </div>
          <Button data-ann-target="my-process.export" onClick={() => toast(`导出任务已创建，共 ${rows.length} 条`)}>导出</Button>
        </div>

        <div className="process-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <MyProcessReferenceModal open={referenceOpen} onClose={() => setReferenceOpen(false)} />

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

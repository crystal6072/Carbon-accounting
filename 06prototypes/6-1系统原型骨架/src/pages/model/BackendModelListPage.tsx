import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  boundaryLabelOf,
  deleteModel,
  disableModel,
  enableModel,
  fetchCategories,
  fetchModels,
  publishModel,
} from '@/mock'
import type { CarbonModel, ModelStatus } from '@/mock'
import type { CategoryItem } from '@/types'
import { MODEL_PAGE_SIZE, MODEL_STATUS_TEXT, MODEL_STATUS_TONE } from './modelMeta'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 后台 · 模型管理列表。
 * 状态机：`草稿 → 已发布 → 已停用 → 重新启用`；
 * 删除仅限草稿 / 已停用；已发布模型需先停用再编辑。
 */
export default function BackendModelListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<CarbonModel[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | ModelStatus>('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [models, categoryList] = await Promise.all([fetchModels(), fetchCategories()])
      setList(models)
      setCategories(categoryList)
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
    setPage(1)
  }, [keyword, status])

  const categoryName = (categoryId: string) => categories.find((item) => item.id === categoryId)?.name ?? '-'

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return list.filter((item) => {
      if (status && item.status !== status) return false
      if (!text) return true
      return item.name.toLowerCase().includes(text) || item.code.toLowerCase().includes(text)
    })
  }, [list, keyword, status])

  const pagedRows = rows.slice((page - 1) * MODEL_PAGE_SIZE, page * MODEL_PAGE_SIZE)

  const run = async (action: () => Promise<unknown>, successText: string) => {
    try {
      await action()
      toast(successText)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handlePublish = (model: CarbonModel) => {
    const isEnable = model.status === 'disabled'
    const verb = isEnable ? '重新启用' : '发布'
    const tip = isEnable ? '启用后前台模型库重新可见。' : '发布后前台模型库可见。'
    if (!window.confirm(`确认${verb}模型「${model.name}」？${tip}`)) return
    void run(() => publishModel(model.id), `${verb}成功`)
  }

  const handleDisable = (model: CarbonModel) => {
    if (!window.confirm(`确认停用模型「${model.name}」？停用后前台模型库不再展示，已引用该模型的项目不受影响。`)) return
    void run(() => disableModel(model.id), '停用成功')
  }

  const handleDelete = (model: CarbonModel) => {
    if (!window.confirm(`确认删除模型「${model.name}」？删除后不可恢复。`)) return
    void run(() => deleteModel(model.id), '删除成功')
  }

  const statusOptions: SelectOption[] = [
    { label: '草稿', value: 'draft' },
    { label: '已发布', value: 'published' },
    { label: '已停用', value: 'disabled' },
  ]

  const columns: Column<CarbonModel>[] = [
    {
      key: 'name',
      title: '模型名称',
      width: 260,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/model/library/${row.id}`)}>
          <span className="cell-ellipsis">{row.name}</span>
        </button>
      ),
    },
    { key: 'code', title: '模型编码', width: 110, render: (row) => <span className="mono">{row.code}</span> },
    { key: 'category', title: '产品分类', width: 160, render: (row) => <span className="cell-ellipsis">{categoryName(row.categoryId)}</span> },
    {
      key: 'standard',
      title: '核算标准',
      width: 150,
      render: (row) => <span className="cell-ellipsis">{row.standardName || '-'}</span>,
    },
    { key: 'boundary', title: '系统边界', width: 110, render: (row) => boundaryLabelOf(row.boundary) },
    {
      key: 'structure',
      title: '结构',
      width: 150,
      render: (row) => (
        <span className="toolbar-tip">
          {row.lifecycleStages.filter((stage) => stage.included).length} 阶段 · {row.items.length} 数据项
          {row.nodes.length > 0 && ` · ${row.nodes.length} 节点`}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: 90,
      render: (row) => <Tag tone={MODEL_STATUS_TONE[row.status]}>{MODEL_STATUS_TEXT[row.status]}</Tag>,
    },
    { key: 'updatedAt', title: '更新时间', width: 150, render: (row) => row.updatedAt },
    {
      key: 'actions',
      title: '操作',
      width: 190,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/model/library/${row.id}`)}>
            查看
          </button>
          {row.status !== 'published' && (
            <button className="link" onClick={() => navigate(`/model/library/${row.id}/edit`)}>
              编辑
            </button>
          )}
          {row.status !== 'published' && (
            <button className="link" onClick={() => handlePublish(row)}>
              {row.status === 'disabled' ? '重新启用' : '发布'}
            </button>
          )}
          {row.status === 'published' && (
            <button className="link" onClick={() => handleDisable(row)}>
              停用
            </button>
          )}
          {row.status !== 'published' && (
            <button className="link link-danger" onClick={() => handleDelete(row)}>
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
        breadcrumb={['系统管理', '模型管理']}
        title="模型管理"
        description="维护可复用的核算模型模板（目标与范围 + 产品建模）；发布后前台「模型库」可见，可供新建核算项目直接引用。"
        actions={
          <Button variant="primary" onClick={() => navigate('/model/library/new')}>
            新建模型
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">模型名称 / 编码</span>
            <Input value={keyword} placeholder="请输入" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">状态</span>
            <Select
              value={status}
              placeholder="全部"
              options={statusOptions}
              onChange={(e) => setStatus(e.target.value as '' | ModelStatus)}
            />
          </div>
          <div className="query-actions">
            <Button
              onClick={() => {
                setKeyword('')
                setStatus('')
              }}
            >
              重置
            </Button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="pcf-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} emptyText="暂无模型" />
        </div>
        <div className="toolbar-tip" style={{ padding: '8px 16px' }}>
          草稿：仅后台可见，可编辑 / 删除；已发布：前台模型库可见，需先停用才能编辑；已停用：前台不可见，可重新启用或删除。
        </div>
        <Pagination total={rows.length} page={page} pageSize={MODEL_PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  )
}

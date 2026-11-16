import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { boundaryLabelOf, deleteLifecycleStage, fetchLifecycleStages, updateLifecycleStageStatus } from '@/mock'
import type { LifecycleStageItem } from '@/types'
import LifecycleConfirmModal from './LifecycleConfirmModal'
import type { LifecycleConfirmMode } from './LifecycleConfirmModal'
import LifecycleFormModal from './LifecycleFormModal'
import LifecycleViewModal from './LifecycleViewModal'
import {
  canDeleteStage,
  groupStages,
  isCommonBoundary,
  levelText,
  levelTone,
  useStatusText,
  useStatusTone,
} from './lifecycleMeta'
import './LifecyclePage.css'

const PAGE_SIZE = 20

interface QueryState {
  name: string
  level: '' | '1' | '2'
  status: '' | 'enabled' | 'disabled'
}

const EMPTY_QUERY: QueryState = { name: '', level: '', status: '' }

/** 列表行：一级行 + 其下二级行（缩进展示）；`matched` 区分「命中结果」与「分组上下文行」 */
interface Row {
  stage: LifecycleStageItem
  isChild: boolean
  childCount: number
  matched: boolean
}

export default function LifecycleListPage() {
  const toast = useToast()

  const [list, setList] = useState<LifecycleStageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ stage: LifecycleStageItem; mode: LifecycleConfirmMode } | null>(null)
  /** 查看弹窗 */
  const [viewOpen, setViewOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  /** 新增 / 编辑弹窗：null = 新增，字符串 = 编辑对应阶段 */
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchLifecycleStages())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const match = useCallback(
    (stage: LifecycleStageItem) => {
      if (query.name.trim() && !stage.name.includes(query.name.trim())) return false
      if (query.level && String(stage.level) !== query.level) return false
      if (query.status && stage.status !== query.status) return false
      return true
    },
    [query],
  )

  /** 按一级 / 二级分组展示：二级行缩进于其一级阶段之下；筛选命中二级时保留其一级分组行作为上下文 */
  const rows = useMemo<Row[]>(() => {
    const result: Row[] = []
    groupStages(list).forEach((group) => {
      const primaryMatched = match(group.primary)
      const children = group.children.filter(match)
      if (!primaryMatched && children.length === 0) return
      result.push({ stage: group.primary, isChild: false, childCount: children.length, matched: primaryMatched })
      children.forEach((child) => result.push({ stage: child, isChild: true, childCount: 0, matched: true }))
    })
    return result
  }, [list, match])

  useEffect(() => {
    setPage(1)
  }, [query])

  const matchedCount = useMemo(() => rows.filter((row) => row.matched).length, [rows])
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openView = (id: string) => {
    setViewId(id)
    setViewOpen(true)
  }

  const openEdit = (id: string | null) => {
    setEditId(id)
    setFormOpen(true)
  }

  const handleConfirm = async () => {
    if (!confirm) return
    const { stage, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteLifecycleStage(stage.id)
        toast('删除成功')
      } else {
        /** 级联禁用：禁用一级阶段时同步禁用其下启用态二级阶段（与 mock 层口径一致） */
        const cascade =
          mode === 'disable' && stage.level === 1
            ? list.filter((item) => item.parentId === stage.id && item.status !== 'disabled').length
            : 0
        await updateLifecycleStageStatus(stage.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(
          mode === 'enable'
            ? '启用成功'
            : cascade > 0
              ? `禁用成功，其下 ${cascade} 个二级阶段已同步禁用`
              : '禁用成功',
        )
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'name',
      title: <span data-ann-target="lifecycle.col.name">阶段名称</span>,
      width: 280,
      render: (row) => (
        <span className="stage-cell">
          {row.isChild && <span className="stage-indent">└</span>}
          <button
            className={['link', 'stage-name', row.isChild ? 'stage-name-child' : 'stage-name-primary'].join(' ')}
            data-ann-target="lifecycle.row.name"
            onClick={() => openView(row.stage.id)}
          >
            {row.stage.name}
          </button>
          {!row.isChild && row.childCount > 0 && <span className="stage-child-count">{row.childCount} 个二级</span>}
        </span>
      ),
    },
    {
      key: 'level',
      title: <span data-ann-target="lifecycle.col.level">阶段层级</span>,
      width: 100,
      render: (row) => <Tag tone={levelTone[row.stage.level]}>{levelText[row.stage.level]}</Tag>,
    },
    {
      key: 'boundaries',
      title: <span data-ann-target="lifecycle.col.boundaries">适用系统边界</span>,
      width: 240,
      render: (row) =>
        isCommonBoundary(row.stage) ? (
          <Tag>全边界通用</Tag>
        ) : (
          <span className="boundary-cell">
            {row.stage.boundaries.map((code) => (
              <Tag key={code} tone="info">
                {boundaryLabelOf(code)}
              </Tag>
            ))}
          </span>
        ),
    },
    {
      key: 'status',
      title: <span data-ann-target="lifecycle.col.status">使用状态</span>,
      width: 90,
      render: (row) => <Tag tone={useStatusTone[row.stage.status]}>{useStatusText[row.stage.status]}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="lifecycle.row.view" onClick={() => openView(row.stage.id)}>
            查看
          </button>
          <button className="link" data-ann-target="lifecycle.row.edit" onClick={() => openEdit(row.stage.id)}>
            编辑
          </button>
          {row.stage.status === 'disabled' ? (
            <button className="link" data-ann-target="lifecycle.row.enable" onClick={() => setConfirm({ stage: row.stage, mode: 'enable' })}>
              启用
            </button>
          ) : (
            <button className="link link-danger" data-ann-target="lifecycle.row.disable" onClick={() => setConfirm({ stage: row.stage, mode: 'disable' })}>
              禁用
            </button>
          )}
          {/* 删除仅对「已禁用」的阶段开放，启用态隐藏入口 */}
          {canDeleteStage(row.stage) && (
            <button className="link link-danger" data-ann-target="lifecycle.row.delete" onClick={() => setConfirm({ stage: row.stage, mode: 'delete' })}>
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
        breadcrumb={['系统管理', '基础库', '生命周期阶段']}
        title={<span data-ann-target="lifecycle.page.global">生命周期阶段</span>}
        description="生命周期阶段字典：层级仅一级 / 二级，按「数据字典 · 系统边界」维护适用边界（多选）"
        actions={
          <Button variant="primary" data-ann-target="lifecycle.add" onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="lifecycle.query.bar">
          <div className="query-item">
            <span className="query-label">阶段名称</span>
            <Input
              value={query.name}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">阶段层级</span>
            <Select
              value={query.level}
              placeholder="全部"
              options={[
                { label: '一级', value: '1' },
                { label: '二级', value: '2' },
              ]}
              onChange={(e) => setQuery((prev) => ({ ...prev, level: e.target.value as '' | '1' | '2' }))}
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
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | 'enabled' | 'disabled' }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="lifecycle.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" data-ann-target="lifecycle.query.search" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">阶段列表</span>
            <span className="toolbar-tip">
              共 {matchedCount} 条 · 按一级 / 二级分组展示（二级缩进于其一级阶段之下；筛选命中二级阶段时，
              其所属一级阶段作为分组行一并展示，不计入结果数）
            </span>
          </div>
        </div>

        <div className="lifecycle-table-wrap" data-ann-target="lifecycle.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.stage.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <LifecycleViewModal
        open={viewOpen}
        stageId={viewId}
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

      <LifecycleFormModal
        open={formOpen}
        stageId={editId}
        onClose={() => {
          setFormOpen(false)
          setEditId(null)
        }}
        onSaved={async () => {
          setFormOpen(false)
          setEditId(null)
          await load()
        }}
      />

      <LifecycleConfirmModal
        open={!!confirm}
        stage={confirm?.stage ?? null}
        mode={confirm?.mode ?? 'enable'}
        childCount={
          confirm?.stage ? list.filter((item) => item.parentId === confirm.stage.id).length : 0
        }
        cascadeCount={
          confirm?.stage
            ? list.filter((item) => item.parentId === confirm.stage.id && item.status !== 'disabled').length
            : 0
        }
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

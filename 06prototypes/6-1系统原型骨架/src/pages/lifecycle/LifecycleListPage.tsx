import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { deleteLifecycleStage, fetchIndustryOptions, fetchLifecycleStages, updateLifecycleStageStatus } from '@/mock'
import type { LifecycleStageItem } from '@/types'
import LifecycleConfirmModal from './LifecycleConfirmModal'
import type { LifecycleConfirmMode } from './LifecycleConfirmModal'
import LifecycleFormModal from './LifecycleFormModal'
import LifecycleViewModal from './LifecycleViewModal'
import {
  canDeleteStage,
  groupStages,
  inclusionText,
  inclusionTone,
  isCommonIndustry,
  levelText,
  levelTone,
  useStatusText,
  useStatusTone,
} from './lifecycleMeta'
import './LifecyclePage.css'

const PAGE_SIZE = 20

/** 「适用行业」筛选中的「全行业通用（适用行业为空）」哨兵值 */
const COMMON_INDUSTRY = '__common__'

interface QueryState {
  name: string
  level: '' | '1' | '2'
  industry: string
  status: '' | 'enabled' | 'disabled'
}

const EMPTY_QUERY: QueryState = { name: '', level: '', industry: '', status: '' }

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
  const [industries, setIndustries] = useState<string[]>([])
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
      const [stages, industryList] = await Promise.all([fetchLifecycleStages(), fetchIndustryOptions()])
      setList(stages)
      setIndustries(industryList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const industryOptions: SelectOption[] = useMemo(
    () => [
      { label: '（全行业通用）', value: COMMON_INDUSTRY },
      ...industries.map((item) => ({ label: item, value: item })),
    ],
    [industries],
  )

  const match = useCallback(
    (stage: LifecycleStageItem) => {
      if (query.name.trim() && !stage.name.includes(query.name.trim())) return false
      if (query.level && String(stage.level) !== query.level) return false
      if (query.industry === COMMON_INDUSTRY) {
        if (!isCommonIndustry(stage)) return false
      } else if (query.industry && !stage.industries.includes(query.industry)) {
        return false
      }
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
        await updateLifecycleStageStatus(stage.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(mode === 'enable' ? '启用成功' : '禁用成功')
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
      title: '阶段名称',
      width: 280,
      render: (row) => (
        <span className="stage-cell">
          {row.isChild && <span className="stage-indent">└</span>}
          <button
            className={['link', 'stage-name', row.isChild ? 'stage-name-child' : 'stage-name-primary'].join(' ')}
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
      title: '阶段层级',
      width: 100,
      render: (row) => <Tag tone={levelTone[row.stage.level]}>{levelText[row.stage.level]}</Tag>,
    },
    {
      key: 'industries',
      title: '适用行业',
      width: 260,
      render: (row) => (
        <span
          className={['industry-cell', isCommonIndustry(row.stage) ? 'industry-common' : ''].filter(Boolean).join(' ')}
          title={isCommonIndustry(row.stage) ? '适用行业为空 = 全行业通用' : row.stage.industries.join('、')}
        >
          {isCommonIndustry(row.stage) ? '全行业通用' : row.stage.industries.join('、')}
        </span>
      ),
    },
    {
      key: 'gateRule',
      title: '摇篮到大门纳入规则',
      width: 150,
      render: (row) => <Tag tone={inclusionTone[row.stage.gateRule]}>{inclusionText[row.stage.gateRule]}</Tag>,
    },
    {
      key: 'graveRule',
      title: '摇篮到坟墓纳入规则',
      width: 150,
      render: (row) => <Tag tone={inclusionTone[row.stage.graveRule]}>{inclusionText[row.stage.graveRule]}</Tag>,
    },
    {
      key: 'status',
      title: '使用状态',
      width: 90,
      render: (row) => <Tag tone={useStatusTone[row.stage.status]}>{useStatusText[row.stage.status]}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => openView(row.stage.id)}>
            查看
          </button>
          <button className="link" onClick={() => openEdit(row.stage.id)}>
            编辑
          </button>
          {row.stage.status === 'disabled' ? (
            <button className="link" onClick={() => setConfirm({ stage: row.stage, mode: 'enable' })}>
              启用
            </button>
          ) : (
            <button className="link link-danger" onClick={() => setConfirm({ stage: row.stage, mode: 'disable' })}>
              禁用
            </button>
          )}
          {/* 删除仅对「已禁用」的阶段开放，启用态隐藏入口 */}
          {canDeleteStage(row.stage) && (
            <button className="link link-danger" onClick={() => setConfirm({ stage: row.stage, mode: 'delete' })}>
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
        breadcrumb={['后台管理', '基础库', '生命周期阶段']}
        title="生命周期阶段"
        description="填报、检测、汇总与报告的阶段骨架：层级仅一级 / 二级，按边界维护三态纳入规则"
        actions={
          <Button variant="primary" onClick={() => openEdit(null)}>
            新增
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
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
            <span className="query-label">适用行业</span>
            <Select
              value={query.industry}
              placeholder="全部"
              options={industryOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, industry: e.target.value }))}
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
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>
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
          <Button onClick={() => toast(`导出任务已创建，共 ${matchedCount} 条（原型模拟，含两个边界的纳入规则）`)}>
            导出
          </Button>
        </div>

        <div className="lifecycle-table-wrap">
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
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

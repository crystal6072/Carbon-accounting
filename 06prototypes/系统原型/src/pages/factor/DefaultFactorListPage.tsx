import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  DEFAULT_FACTOR_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  REGION_OPTIONS,
  YEAR_OPTIONS,
  fetchDefaultFactors,
  type DefaultFactor,
} from '@/mock/config'
import DefaultFactorFormModal from './DefaultFactorFormModal'
import ConfirmModal from '../config/ConfirmModal'

const PAGE_SIZE = 10

const STATUS_META: Record<DefaultFactor['status'], { label: string; tone: 'success' | 'default' | 'error' }> = {
  enabled: { label: '已启用', tone: 'success' },
  disabled: { label: '已停用', tone: 'default' },
  expired: { label: '已失效', tone: 'error' },
}
const keyOf = (f: DefaultFactor) => `${f.industry}|${f.lifecycle}|${f.objectType}|${f.objectCode}|${f.region}|${f.year}`
const factorLabel = (f: DefaultFactor) => `${f.objectType} / ${f.objectName || f.objectCode}`

const STAGE_OPTS = [
  { label: '全部阶段', value: '' },
  { label: '原料获取', value: '原料获取' },
  { label: '生产阶段', value: '生产阶段' },
  { label: '运输', value: '运输' },
  { label: '生命末期', value: '生命末期' },
]

interface Query {
  industry: string
  lifecycle: string
  objectType: string
  region: string
  year: string
  status: string
}

const EMPTY: Query = { industry: '', lifecycle: '', objectType: '', region: '', year: '', status: '' }

/** 单条 / 批量启用停用：统一走二次确认 */
interface StatusAction {
  ids: string[]
  status: 'enabled' | 'disabled'
}

export default function DefaultFactorListPage() {
  const toast = useToast()
  const [list, setList] = useState<DefaultFactor[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<Query>(EMPTY)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DefaultFactor | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [pendingStatus, setPendingStatus] = useState<StatusAction | null>(null)
  const [confirmDel, setConfirmDel] = useState<DefaultFactor | null>(null)
  const [confirmOverwrite, setConfirmOverwrite] = useState<DefaultFactor | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchDefaultFactors())
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const expiredCount = list.filter((f) => f.status === 'expired').length

  const rows = useMemo(() => {
    return list.filter((f) => {
      if (query.industry && f.industry !== query.industry) return false
      if (query.lifecycle && f.lifecycle !== query.lifecycle) return false
      if (query.objectType && f.objectType !== query.objectType) return false
      if (query.region && f.region !== query.region) return false
      if (query.year && f.year !== query.year) return false
      if (query.status && f.status !== query.status) return false
      return true
    })
  }, [list, query])
  useEffect(() => setPage(1), [query])
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 可参与启停的勾选行（已失效规则须重新绑定因子，不允许勾选） */
  const selectedRows = useMemo(
    () => list.filter((f) => selectedKeys.includes(f.id) && f.status !== 'expired'),
    [list, selectedKeys],
  )
  const statusTarget = pendingStatus?.ids.length === 1 ? list.find((f) => f.id === pendingStatus.ids[0]) : null

  const handleSave = (f: DefaultFactor) => {
    const dup = list.find((x) => x.id !== f.id && keyOf(x) === keyOf(f))
    if (dup && dup.status !== 'expired') {
      setConfirmOverwrite(f)
      return
    }
    // 失效规则重新绑定有效因子后恢复「已启用」
    const next: DefaultFactor = {
      ...f,
      status: f.status === 'expired' && f.factorName !== editing?.factorName ? 'enabled' : f.status,
    }
    setList((prev) => {
      const exists = prev.some((x) => x.id === f.id)
      return exists ? prev.map((x) => (x.id === f.id ? { ...x, ...next, updatedAt: now() } : x)) : [...prev, { ...next, updatedAt: now() }]
    })
    toast('保存成功')
    setFormOpen(false)
    setEditing(null)
  }

  const handleDelete = () => {
    if (!confirmDel) return
    setList((prev) => prev.filter((x) => x.id !== confirmDel.id))
    setSelectedKeys((prev) => prev.filter((id) => id !== confirmDel.id))
    toast('已删除')
    setConfirmDel(null)
  }

  /** 单条 / 批量启用停用：已失效与目标状态一致的规则跳过，不静默变更 */
  const handleStatusConfirm = () => {
    if (!pendingStatus) return
    const { ids, status } = pendingStatus
    const action = status === 'enabled' ? '启用' : '停用'
    const batch = ids.length > 1
    const targets = list.filter((f) => ids.includes(f.id) && f.status !== 'expired' && f.status !== status)
    if (targets.length === 0) {
      toast(`所选规则无需重复${action}`)
      setPendingStatus(null)
      return
    }
    const targetIds = new Set(targets.map((f) => f.id))
    setList((prev) => prev.map((f) => (targetIds.has(f.id) ? { ...f, status, updatedAt: now() } : f)))
    const skipped = ids.length - targets.length
    toast(
      `${batch ? '批量' : ''}${action}成功：${targets.length} 条${skipped > 0 ? `，跳过 ${skipped} 条（已失效 / 状态未变化）` : ''}`,
    )
    setSelectedKeys([])
    setPendingStatus(null)
  }

  const columns: Column<DefaultFactor>[] = [
    { key: 'type', title: '类型', width: 100, render: (f) => f.objectType },
    { key: 'data', title: '排放数据', width: 180, render: (f) => <span className="cell-ellipsis">{f.objectName || f.objectCode}</span> },
    { key: 'factor', title: '目标因子', width: 260, render: (f) => <span className="cell-ellipsis">{f.factorName}{f.factorValue ? ` · ${f.factorValue} ${f.factorUnit}` : ''}</span> },
    { key: 'priority', title: '优先级', width: 80, align: 'right', render: (f) => f.priority },
    { key: 'status', title: '状态', width: 100, align: 'center', render: (f) => <Tag tone={STATUS_META[f.status].tone}>{STATUS_META[f.status].label}</Tag> },
    { key: 'updatedAt', title: '更新时间', width: 150, align: 'center', render: (f) => <span className="nowrap">{f.updatedAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 170,
      render: (f) => (
        <span className="row-actions">
          <button className="link" data-ann-target="config.factor.row.edit" onClick={() => { setEditing(f); setFormOpen(true) }}>编辑</button>
          {f.status === 'enabled' && (
            <button className="link" onClick={() => setPendingStatus({ ids: [f.id], status: 'disabled' })}>停用</button>
          )}
          {f.status === 'disabled' && (
            <button className="link" onClick={() => setPendingStatus({ ids: [f.id], status: 'enabled' })}>启用</button>
          )}
          {f.status === 'expired' ? (
            <button className="link link-danger" onClick={() => { setEditing(f); setFormOpen(true) }}>换因子</button>
          ) : (
            <button className="link link-danger" onClick={() => setConfirmDel(f)}>删除</button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['因子库管理', '默认因子']}
        title="默认因子"
        description="按行业 / 阶段 / 类型 / 排放数据 / 区域 / 年度配置平台级默认因子规则，建模时预选推荐、可替换留痕。本规则归属因子库域，不改变计算逻辑。"
        actions={<Button variant="primary" data-ann-target="config.factor.add" onClick={() => { setEditing(null); setFormOpen(true) }}>新增规则</Button>}
      />

      {expiredCount > 0 && (
        <div className="alert alert-warning" style={{ marginTop: 0 }}>
          <IconAlert /> 有 {expiredCount} 条默认因子因引用因子失效而停用，请重新绑定。
          <button className="link" style={{ marginLeft: 8 }} onClick={() => setQuery((p) => ({ ...p, status: 'expired' }))}>去处理</button>
        </div>
      )}

      <div className="card" data-ann-target="config.factor.global">
        <div className="query-bar" data-ann-target="config.factor.query">
          <div className="query-item">
            <span className="query-label">适用行业</span>
            <Select placeholder="全部" value={query.industry} options={INDUSTRY_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, industry: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">生命周期阶段</span>
            <Select placeholder="全部" value={query.lifecycle} options={STAGE_OPTS} onChange={(e) => setQuery((p) => ({ ...p, lifecycle: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">类型</span>
            <Select placeholder="全部" value={query.objectType} options={OBJECT_TYPE_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, objectType: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">区域</span>
            <Select placeholder="全部" value={query.region} options={REGION_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, region: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">适用年度</span>
            <Select placeholder="全部" value={query.year} options={YEAR_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, year: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">状态</span>
            <Select placeholder="全部" value={query.status} options={DEFAULT_FACTOR_STATUS_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, status: e.target.value }))} />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>搜索</Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">默认因子规则</span>
            <span className="toolbar-tip">共 {rows.length} 条 · 已选 {selectedRows.length} 条 · 优先级数值越小越先命中；停用后不参与预选</span>
          </div>
          <div className="flex gap-xs">
            <Button
              size="small"
              disabled={selectedRows.length === 0}
              data-ann-target="config.factor.batch.enable"
              onClick={() => setPendingStatus({ ids: selectedKeys, status: 'enabled' })}
            >
              批量启用
            </Button>
            <Button
              size="small"
              disabled={selectedRows.length === 0}
              data-ann-target="config.factor.batch.disable"
              onClick={() => setPendingStatus({ ids: selectedKeys, status: 'disabled' })}
            >
              批量停用
            </Button>
          </div>
        </div>

        <div data-ann-target="config.factor.table">
        <Table
          columns={columns}
          data={paged}
          rowKey={(f) => f.id}
          loading={loading}
          rowClassName={(f) => (f.status === 'expired' ? 'expired-row' : '')}
          rowSelection={{
            selectedKeys,
            onChange: setSelectedKeys,
            disabled: (f) => f.status === 'expired',
          }}
        />
        </div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <DefaultFactorFormModal open={formOpen} factor={editing} onClose={() => { setFormOpen(false); setEditing(null) }} onSave={handleSave} />

      <ConfirmModal
        open={!!pendingStatus}
        title={pendingStatus ? `${pendingStatus.ids.length > 1 ? '确认批量' : '确认'}${pendingStatus.status === 'enabled' ? '启用' : '停用'}` : ''}
        message={pendingStatus ? `${pendingStatus.ids.length > 1 ? `对已勾选的 ${pendingStatus.ids.length} 条默认因子规则` : `对「${statusTarget ? factorLabel(statusTarget) : ''}」`}执行${pendingStatus.status === 'enabled' ? '启用' : '停用'}？` : ''}
        tip={pendingStatus?.status === 'enabled' ? '启用后参与建模预选；已失效规则需重新绑定因子，将被跳过。' : '停用后不再参与业务端核算与预选；已失效规则将被跳过。'}
        confirmText={pendingStatus ? `${pendingStatus.ids.length > 1 ? '确认批量' : '确认'}${pendingStatus.status === 'enabled' ? '启用' : '停用'}` : '确认'}
        onClose={() => setPendingStatus(null)}
        onConfirm={handleStatusConfirm}
      />

      <ConfirmModal open={!!confirmDel} title="确认删除" message={confirmDel ? `删除「${factorLabel(confirmDel)}」后该配置将不再参与预选，是否删除？` : ''} confirmText="确认删除" danger onClose={() => setConfirmDel(null)} onConfirm={handleDelete} />

      <ConfirmModal open={!!confirmOverwrite} title="覆盖已有规则" message={`已存在相同配置的规则（${confirmOverwrite?.id}），是否覆盖保存？`} confirmText="覆盖保存" onClose={() => setConfirmOverwrite(null)} onConfirm={() => { if (confirmOverwrite) handleSave(confirmOverwrite); setConfirmOverwrite(null) }} />
    </>
  )
}

function now() {
  return new Date().toLocaleString('zh-CN').slice(0, 16).replace('/', '-')
}
function IconAlert() {
  return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
}

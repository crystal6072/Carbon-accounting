import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchReportTemplates, type ReportTemplate } from '@/mock/config'
import ConfirmModal from './ConfirmModal'
import './config.css'

const PAGE_SIZE = 10

const BOUNDARY_OPTS = [
  { label: '全部', value: '' },
  { label: '全部边界', value: '全部' },
  { label: '摇篮到大门', value: '摇篮到大门' },
  { label: '大门到大门', value: '大门到大门' },
  { label: '摇篮到坟墓', value: '摇篮到坟墓' },
]
const STATUS_OPTS = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
]
const STATUS_META: Record<ReportTemplate['status'], { label: string; tone: 'default' | 'success' }> = {
  draft: { label: '草稿', tone: 'default' },
  enabled: { label: '已启用', tone: 'success' },
  disabled: { label: '已停用', tone: 'default' },
}

interface Query {
  name: string
  boundary: string
  standard: string
  status: string
}
const EMPTY: Query = { name: '', boundary: '', standard: '', status: '' }

export default function ReportTemplateListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<Query>(EMPTY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ t: ReportTemplate; action: 'enable' | 'disable' | 'delete' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchReportTemplates())
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    return list.filter((t) => {
      if (query.name.trim() && !t.name.includes(query.name.trim())) return false
      if (query.boundary && t.boundary !== query.boundary) return false
      if (query.standard.trim() && !t.standardNo.includes(query.standard.trim()) && !t.standardName.includes(query.standard.trim())) return false
      if (query.status && t.status !== query.status) return false
      return true
    })
  }, [list, query])
  useEffect(() => setPage(1), [query])
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const apply = (patch: Partial<ReportTemplate>) => setList((prev) => prev.map((t) => (t.id === confirm?.t.id ? { ...t, ...patch } : t)))

  const handleConfirm = () => {
    if (!confirm) return
    if (confirm.action === 'enable') { apply({ status: 'enabled' }); toast('模板已启用') }
    else if (confirm.action === 'disable') { apply({ status: 'disabled' }); toast('模板已停用') }
    else { setList((prev) => prev.filter((t) => t.id !== confirm.t.id)); toast('已删除') }
    setConfirm(null)
  }

  const columns: Column<ReportTemplate>[] = [
    {
      key: 'no',
      title: '模板编号',
      width: 200,
      render: (t) => (
        <button className="link mono nowrap" onClick={() => navigate(`/config/report-template/${t.id}`)}>
          {t.templateNo}
        </button>
      ),
    },
    { key: 'name', title: '模板名称', render: (t) => t.name },
    { key: 'boundary', title: '适用边界', width: 120, render: (t) => t.boundary },
    { key: 'standard', title: '适用标准', width: 220, render: (t) => (t.standardNo ? `${t.standardNo} ${t.standardName}` : '不限标准') },
    {
      key: 'source',
      title: '来源',
      width: 100,
      align: 'center',
      render: (t) => <Tag tone={t.source === '系统预置' ? 'primary' : 'default'}>{t.source}</Tag>,
    },
    { key: 'count', title: '章节数', width: 80, align: 'right', render: (t) => t.sections.length },
    { key: 'status', title: '状态', width: 100, align: 'center', render: (t) => <Tag tone={STATUS_META[t.status].tone}>{STATUS_META[t.status].label}</Tag> },
    { key: 'updatedAt', title: '更新时间', width: 150, align: 'center', render: (t) => <span className="nowrap">{t.updatedAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 190,
      render: (t) => (
        <span className="row-actions">
          {t.source === '系统预置' ? (
            <>
              <button className="link" onClick={() => navigate(`/config/report-template/${t.id}`)}>查看</button>
              <button className="link" onClick={() => navigate(`/config/report-template/new?copy=${t.id}`)}>复制</button>
            </>
          ) : (
            <>
              <button className="link" onClick={() => navigate(`/config/report-template/${t.id}/edit`)}>编辑</button>
              {t.status !== 'enabled' && <button className="link" onClick={() => setConfirm({ t, action: 'enable' })}>启用</button>}
              {t.status === 'enabled' && <button className="link" onClick={() => setConfirm({ t, action: 'disable' })}>停用</button>}
              {t.status !== 'enabled' && <button className="link link-danger" onClick={() => setConfirm({ t, action: 'delete' })}>删除</button>}
            </>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '报告模板']}
        title="报告模板"
        description="报告章节与固定文案配置（不改变排版与核算结果）。锁定章节不可隐藏；停用最后 1 个启用模板将被阻断。"
        actions={<Button variant="primary" onClick={() => navigate('/config/report-template/new')}>新建模板</Button>}
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">模板名称</span>
            <Input value={query.name} placeholder="模板名称" onChange={(e) => setQuery((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">适用边界</span>
            <Select placeholder="全部" value={query.boundary} options={BOUNDARY_OPTS} onChange={(e) => setQuery((p) => ({ ...p, boundary: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">适用标准</span>
            <Input value={query.standard} placeholder="标准号或名称" onChange={(e) => setQuery((p) => ({ ...p, standard: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">状态</span>
            <Select placeholder="全部" value={query.status} options={STATUS_OPTS} onChange={(e) => setQuery((p) => ({ ...p, status: e.target.value }))} />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>搜索</Button>
          </div>
        </div>

        <div className="toolbar">
          <span className="toolbar-title">报告模板</span>
          <span className="toolbar-tip">共 {rows.length} 条</span>
        </div>

        <Table columns={columns} data={paged} rowKey={(t) => t.id} loading={loading} />
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.action === 'disable' ? '确认停用' : confirm?.action === 'delete' ? '确认删除' : '确认启用'}
        message={
          confirm?.action === 'disable'
            ? `停用后该边界若无其他启用模板，报告生成将无模板可用，是否停用「${confirm.t.name}」？`
            : confirm?.action === 'delete'
            ? `删除模板「${confirm.t.name}」后不可恢复，是否删除？`
            : `启用模板「${confirm.t.name}」，是否继续？`
        }
        confirmText={confirm?.action === 'disable' ? '确认停用' : confirm?.action === 'delete' ? '确认删除' : '确认启用'}
        danger={confirm?.action === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

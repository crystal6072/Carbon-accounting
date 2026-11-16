import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  fetchReportTemplates,
  setReportTemplateStatus,
  removeReportTemplate,
  type ReportTemplate,
} from '@/mock/config'
import ConfirmModal from './ConfirmModal'
import './config.css'

const PAGE_SIZE = 10

const TYPE_OPTS = [
  { label: '全部', value: '' },
  { label: '碳足迹报告', value: '碳足迹报告' },
  { label: '碳标签报告', value: '碳标签报告' },
]
const STATUS_OPTS = [
  { label: '全部', value: '' },
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
]
const SOURCE_OPTS = [
  { label: '全部', value: '' },
  { label: '系统预置', value: '系统预置' },
  { label: '自定义', value: '自定义' },
]

interface Query {
  name: string
  templateType: string
  status: string
  source: string
}
const EMPTY: Query = { name: '', templateType: '', status: '', source: '' }

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

  const rows = useMemo(
    () =>
      list.filter((t) => {
        if (query.name.trim() && !t.name.includes(query.name.trim())) return false
        if (query.templateType && t.templateType !== query.templateType) return false
        if (query.status && t.status !== query.status) return false
        if (query.source && t.source !== query.source) return false
        return true
      }),
    [list, query],
  )
  useEffect(() => setPage(1), [query])
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = async () => {
    if (!confirm) return
    if (confirm.action === 'delete') {
      if (confirm.t.source === '系统预置') {
        toast('系统预置模板不允许删除', 'error')
        setConfirm(null)
        return
      }
      await removeReportTemplate(confirm.t.id)
      toast(`已删除模板「${confirm.t.name}」`)
      setConfirm(null)
      await load()
      return
    }
    const status = confirm.action === 'enable' ? 'enabled' : 'disabled'
    await setReportTemplateStatus(confirm.t.id, status)
    toast(confirm.action === 'enable' ? `已启用模板「${confirm.t.name}」` : `已停用模板「${confirm.t.name}」`)
    setConfirm(null)
    await load()
  }

  const columns: Column<ReportTemplate>[] = [
    {
      key: 'name',
      title: '模板名称',
      render: (t) => (
        <button className="link" onClick={() => navigate(`/config/report-template/${t.id}`)}>
          {t.name}
        </button>
      ),
    },
    {
      key: 'templateType',
      title: '模板类型',
      width: 140,
      align: 'center',
      render: (t) => <Tag tone={t.templateType === '碳足迹报告' ? 'primary' : 'default'}>{t.templateType}</Tag>,
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      align: 'center',
      render: (t) => <Tag tone={t.status === 'enabled' ? 'success' : 'default'}>{t.status === 'enabled' ? '启用' : '停用'}</Tag>,
    },
    {
      key: 'source',
      title: '数据来源',
      width: 120,
      align: 'center',
      render: (t) => <Tag tone={t.source === '系统预置' ? 'primary' : 'default'}>{t.source}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 220,
      render: (t) => (
        <span className="row-actions">
          {t.source === '系统预置' ? (
            <button className="link" data-ann-target="config.report.row.view" onClick={() => navigate(`/config/report-template/${t.id}`)}>查看</button>
          ) : (
            <>
              <button className="link" onClick={() => navigate(`/config/report-template/${t.id}/edit`)}>编辑</button>
              {t.status === 'enabled' ? (
                <button className="link" onClick={() => setConfirm({ t, action: 'disable' })}>停用</button>
              ) : (
                <button className="link" onClick={() => setConfirm({ t, action: 'enable' })}>启用</button>
              )}
              <button className="link link-danger" onClick={() => setConfirm({ t, action: 'delete' })}>删除</button>
            </>
          )}
          <button className="link" data-ann-target="config.report.row.copy" onClick={() => navigate(`/config/report-template/new?copy=${t.id}`)}>复制</button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '报告模板']}
        title="报告模板"
        description="模板由研发线下整理、打好取值字段标签并内置系统。系统预置模板只读、不可删除，可复制为副本后仅修改固定文字；自定义模板可编辑、启停与删除；取值字段与系统装配不可修改。"
      />

      <div className="card" data-ann-target="config.report.global">
        <div className="query-bar" data-ann-target="config.report.query">
          <div className="query-item">
            <span className="query-label">模板名称</span>
            <Input value={query.name} placeholder="模板名称" onChange={(e) => setQuery((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">模板类型</span>
            <Select value={query.templateType} options={TYPE_OPTS} onChange={(e) => setQuery((p) => ({ ...p, templateType: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">状态</span>
            <Select value={query.status} options={STATUS_OPTS} onChange={(e) => setQuery((p) => ({ ...p, status: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">数据来源</span>
            <Select value={query.source} options={SOURCE_OPTS} onChange={(e) => setQuery((p) => ({ ...p, source: e.target.value }))} />
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

        <div data-ann-target="config.report.table"><Table columns={columns} data={paged} rowKey={(t) => t.id} loading={loading} /></div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.action === 'delete' ? '确认删除' : confirm?.action === 'disable' ? '确认停用' : '确认启用'}
        message={
          confirm
            ? confirm.action === 'delete'
              ? `删除模板「${confirm.t.name}」后不可恢复，是否删除？`
              : confirm.action === 'disable'
                ? `停用模板「${confirm.t.name}」后，该模板将不再用于新生成的报告，是否停用？`
                : `启用模板「${confirm.t.name}」后，该模板可用于新生成的报告，是否启用？`
            : ''
        }
        confirmText={confirm?.action === 'delete' ? '确认删除' : confirm?.action === 'disable' ? '确认停用' : '确认启用'}
        danger={confirm?.action === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

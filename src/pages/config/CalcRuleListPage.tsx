import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  CALC_RULE_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  STANDARD_OPTIONS,
  fetchCalcRules,
  type CalcRule,
} from '@/mock/config'
import ConfirmModal from './ConfirmModal'
import './config.css'

const PAGE_SIZE = 10

const RULE_STATUS_META: Record<CalcRule['status'], { label: string; tone: 'default' | 'success' }> = {
  draft: { label: '草稿', tone: 'default' },
  enabled: { label: '已启用', tone: 'success' },
}

interface Query {
  ruleNo: string
  ruleName: string
  standardNo: string
  status: string
  industry: string
}

const EMPTY: Query = { ruleNo: '', ruleName: '', standardNo: '', status: '', industry: '' }

export default function CalcRuleListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<CalcRule[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<Query>(EMPTY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<CalcRule | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchCalcRules())
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    return list.filter((r) => {
      if (query.ruleNo.trim() && !r.ruleNo.toLowerCase().includes(query.ruleNo.trim().toLowerCase())) return false
      if (query.ruleName.trim() && !r.ruleName.includes(query.ruleName.trim())) return false
      if (query.standardNo && r.standardNo !== query.standardNo) return false
      if (query.status && r.status !== query.status) return false
      if (query.industry && !r.applicableIndustry.includes(query.industry)) return false
      return true
    })
  }, [list, query])

  useEffect(() => setPage(1), [query])
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = () => {
    if (!confirm) return
    setList((prev) => prev.map((r) => (r.id === confirm.id ? { ...r, status: 'enabled' } : r)))
    toast('规则已启用')
    setConfirm(null)
  }

  const columns: Column<CalcRule>[] = [
    {
      key: 'ruleNo',
      title: '规则编号',
      width: 170,
      render: (r) => (
        <button className="link mono nowrap" onClick={() => navigate(`/config/calc-rule/${r.id}`)}>
          {r.ruleNo}
        </button>
      ),
    },
    { key: 'ruleName', title: '规则名称', render: (r) => r.ruleName },
    {
      key: 'standard',
      title: '标准号',
      width: 260,
      render: (r) => (
        <div>
          <div className="mono nowrap">{r.standardNo}</div>
          <div className="text-tertiary" style={{ fontSize: 12 }}>
            {r.standardName}
          </div>
        </div>
      ),
    },
    {
      key: 'industry',
      title: '适用行业',
      width: 150,
      render: (r) => (r.applicableIndustry.length ? `${r.applicableIndustry.slice(0, 2).join('、')}${r.applicableIndustry.length > 2 ? ` +${r.applicableIndustry.length - 2}` : ''}` : '全行业'),
    },
    {
      key: 'status',
      title: '规则状态',
      width: 100,
      align: 'center',
      render: (r) => <Tag tone={RULE_STATUS_META[r.status].tone}>{RULE_STATUS_META[r.status].label}</Tag>,
    },
    {
      key: 'revision',
      title: '修订号',
      width: 80,
      align: 'right',
      render: (r) => `V${r.revisionNo}`,
    },
    { key: 'updatedAt', title: '更新时间', width: 150, align: 'center', render: (r) => <span className="nowrap">{r.updatedAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      render: (r) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/config/calc-rule/${r.id}/edit`)}>编辑</button>
          {r.status === 'draft' && (
            <button className="link" onClick={() => setConfirm(r)}>启用</button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '核算规则']}
        title="核算规则"
        description="按标准号=一套规则，记录取舍 / 忽略项 / GWP / 公式 / 分配。本配置仅用于标准口径记录与展示，不参与核算求值。"
        actions={<Button variant="primary" onClick={() => navigate('/config/calc-rule/new')}>新建规则</Button>}
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">规则编号</span>
            <Input value={query.ruleNo} placeholder="如 RULE-20261027" onChange={(e) => setQuery((p) => ({ ...p, ruleNo: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">规则名称</span>
            <Input value={query.ruleName} placeholder="规则名称" onChange={(e) => setQuery((p) => ({ ...p, ruleName: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">标准号</span>
            <Select placeholder="全部" value={query.standardNo} options={STANDARD_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, standardNo: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">规则状态</span>
            <Select placeholder="全部" value={query.status} options={CALC_RULE_STATUS_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, status: e.target.value }))} />
          </div>
          <div className="query-item">
            <span className="query-label">适用行业</span>
            <Select placeholder="全部" value={query.industry} options={INDUSTRY_OPTIONS} onChange={(e) => setQuery((p) => ({ ...p, industry: e.target.value }))} />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>搜索</Button>
          </div>
        </div>

        <div className="toolbar">
          <span className="toolbar-title">核算规则</span>
          <span className="toolbar-tip">共 {rows.length} 条</span>
        </div>

        <Table columns={columns} data={paged} rowKey={(r) => r.id} loading={loading} />
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <ConfirmModal
        open={!!confirm}
        title="确认启用"
        message={`启用后规则「${confirm?.ruleName ?? ''}」可被模型只读引用，是否启用？`}
        confirmText="确认启用"
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

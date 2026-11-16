import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CascaderSelect, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchIndustryTreeOptions } from '@/mock'
import type { TreeOption } from '@/types'
import {
  CALC_RULE_STATUS_OPTIONS,
  STANDARD_OPTIONS,
  fetchCalcRules,
  type CalcRule,
} from '@/mock/config'
import ConfirmModal from './ConfirmModal'
import './config.css'

const PAGE_SIZE = 10

const RULE_STATUS_META: Record<CalcRule['status'], { label: string; tone: 'default' | 'success' | 'warning' }> = {
  draft: { label: '草稿', tone: 'default' },
  enabled: { label: '已启用', tone: 'success' },
  disabled: { label: '已停用', tone: 'warning' },
}

type RuleAction = 'enable' | 'disable' | 'delete'
interface ConfirmState {
  rule: CalcRule
  action: RuleAction
}

const CONFIRM_TEXT: Record<RuleAction, { title: string; confirmText: string; message: (name: string) => string }> = {
  enable: {
    title: '确认启用',
    confirmText: '确认启用',
    message: (name) => `启用后规则「${name}」可被模型只读引用，是否启用？`,
  },
  disable: {
    title: '确认停用',
    confirmText: '确认停用',
    message: (name) => `停用规则「${name}」后将不再被模型引用，是否停用？`,
  },
  delete: {
    title: '确认删除',
    confirmText: '确认删除',
    message: (name) => `删除规则「${name}」后不可恢复，是否删除？`,
  },
}

interface Query {
  ruleName: string
  standardNo: string
  status: string
  industry: string
}

const EMPTY: Query = { ruleName: '', standardNo: '', status: '', industry: '' }

export default function CalcRuleListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<CalcRule[]>([])
  const [industryTree, setIndustryTree] = useState<TreeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<Query>(EMPTY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rules, industryTreeList] = await Promise.all([fetchCalcRules(), fetchIndustryTreeOptions()])
      setList(rules)
      setIndustryTree(industryTreeList)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    return list.filter((r) => {
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
    const { rule, action } = confirm
    if (action === 'delete') {
      setList((prev) => prev.filter((r) => r.id !== rule.id))
      toast(`已删除规则「${rule.ruleName}」`)
    } else {
      const status = action === 'enable' ? 'enabled' : 'disabled'
      setList((prev) => prev.map((r) => (r.id === rule.id ? { ...r, status } : r)))
      toast(action === 'enable' ? `已启用规则「${rule.ruleName}」` : `已停用规则「${rule.ruleName}」`)
    }
    setConfirm(null)
  }

  const columns: Column<CalcRule>[] = [
    {
      key: 'ruleName',
      title: '规则名称',
      width: 260,
      render: (r) => (
        <button className="link" onClick={() => navigate(`/config/calc-rule/${r.id}`)}>
          {r.ruleName}
        </button>
      ),
    },
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
      key: 'updatedAt',
      title: '更新时间',
      width: 150,
      align: 'center',
      render: (r) => <span className="nowrap">{r.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (r) => (
        <span className="row-actions">
          <button className="link" data-ann-target="config.calc.row.view" onClick={() => navigate(`/config/calc-rule/${r.id}`)}>查看详情</button>
          <button className="link" onClick={() => navigate(`/config/calc-rule/${r.id}/edit`)}>编辑</button>
          {r.status === 'enabled' ? (
            <button className="link" onClick={() => setConfirm({ rule: r, action: 'disable' })}>停用</button>
          ) : (
            <button className="link" onClick={() => setConfirm({ rule: r, action: 'enable' })}>启用</button>
          )}
          {r.status !== 'enabled' && (
            <button className="link link-danger" data-ann-target="config.calc.row.delete" onClick={() => setConfirm({ rule: r, action: 'delete' })}>删除</button>
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
        description="按标准号=一套规则，记录取舍准则 / 可忽略排放项 / 分配方法。本配置仅用于标准口径记录与展示，不参与核算求值。"
        actions={<Button variant="primary" data-ann-target="config.calc.add" onClick={() => navigate('/config/calc-rule/new')}>新建规则</Button>}
      />

      <div className="card" data-ann-target="config.calc.global">
        <div className="query-bar" data-ann-target="config.calc.query">
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
            <CascaderSelect
              value={query.industry}
              placeholder="全部"
              options={industryTree}
              searchPlaceholder="搜索行业名称 / 编码"
              onChange={(value) => setQuery((p) => ({ ...p, industry: value }))}
            />
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

        <div data-ann-target="config.calc.table"><Table columns={columns} data={paged} rowKey={(r) => r.id} loading={loading} /></div>
        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm ? CONFIRM_TEXT[confirm.action].title : ''}
        message={confirm ? CONFIRM_TEXT[confirm.action].message(confirm.rule.ruleName) : ''}
        confirmText={confirm ? CONFIRM_TEXT[confirm.action].confirmText : '确认'}
        danger={confirm?.action === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

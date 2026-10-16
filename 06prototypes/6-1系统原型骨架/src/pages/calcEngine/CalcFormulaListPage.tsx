import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { deleteCalcFormula, fetchCalcFormulas, updateCalcFormulaStatus } from '@/mock'
import type { CalcFormula, EnableStatus, FormulaType } from '@/types'
import FormulaConfirmModal from './FormulaConfirmModal'
import type { FormulaConfirmMode } from './FormulaConfirmModal'
import {
  canDeleteFormula,
  canDisableFormula,
  canEnableFormula,
  enableStatusText,
  enableStatusTone,
  formulaTypeOrder,
  formulaTypeText,
} from './calcEngineMeta'
import './CalcEngine.css'

const PAGE_SIZE = 20

interface QueryState {
  keyword: string
  formulaType: '' | FormulaType
  status: '' | EnableStatus
}

const EMPTY_QUERY: QueryState = { keyword: '', formulaType: '', status: '' }

/**
 * CE04 计算公式列表 = 公式配置。
 * 公式为**轻量配置对象**：不做审核与版本化，可直接编辑；启用 / 禁用与删除走行操作。
 */
export default function CalcFormulaListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<CalcFormula[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState<{ formula: CalcFormula; mode: FormulaConfirmMode } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchCalcFormulas())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const typeOptions: SelectOption[] = useMemo(
    () => formulaTypeOrder.map((item) => ({ label: formulaTypeText[item], value: item })),
    [],
  )

  const rows = useMemo(() => {
    let data = list
    const keyword = query.keyword.trim().toLowerCase()
    if (keyword) {
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.code.toLowerCase().includes(keyword) ||
          item.expression.toLowerCase().includes(keyword),
      )
    }
    if (query.formulaType) data = data.filter((item) => item.formulaType === query.formulaType)
    if (query.status) data = data.filter((item) => item.status === query.status)
    return [...data].sort((a, b) => (a.code < b.code ? -1 : 1))
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = async () => {
    if (!confirm) return
    const { formula, mode } = confirm
    try {
      if (mode === 'delete') {
        await deleteCalcFormula(formula.id)
        toast('删除成功')
      } else {
        await updateCalcFormulaStatus(formula.id, mode === 'enable' ? 'enabled' : 'disabled')
        toast(mode === 'enable' ? '启用成功' : '禁用成功')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<CalcFormula>[] = [
    {
      key: 'name',
      title: '公式名称',
      width: 180,
      render: (row) => (
        <button className="link" data-ann-target="formula.list.view" onClick={() => navigate(`/model/calc-engine/${row.id}`)}>
          {row.name}
        </button>
      ),
    },
    { key: 'code', title: '公式编码', width: 104, render: (row) => <span className="mono nowrap">{row.code}</span> },
    {
      key: 'formulaType',
      title: '公式类型',
      width: 124,
      render: (row) => <Tag tone="info">{formulaTypeText[row.formulaType]}</Tag>,
    },
    { key: 'factors', title: '数据因素', width: 90, render: (row) => `${row.factors.length} 项` },
    {
      key: 'status',
      title: '使用状态',
      width: 92,
      render: (row) => <Tag tone={enableStatusTone[row.status]}>{enableStatusText[row.status]}</Tag>,
    },
    { key: 'updatedAt', title: '更新时间', width: 150, render: (row) => <span className="nowrap">{row.updatedAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 190,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="formula.list.view" onClick={() => navigate(`/model/calc-engine/${row.id}`)}>
            查看
          </button>
          <button className="link" data-ann-target="formula.list.edit" onClick={() => navigate(`/model/calc-engine/${row.id}/edit`)}>
            编辑
          </button>
          {canDisableFormula(row) && (
            <button
              className="link link-danger"
              data-ann-target="formula.list.disable"
              onClick={() => setConfirm({ formula: row, mode: 'disable' })}
            >
              禁用
            </button>
          )}
          {canEnableFormula(row) && (
            <button className="link" data-ann-target="formula.list.enable" onClick={() => setConfirm({ formula: row, mode: 'enable' })}>
              启用
            </button>
          )}
          {canDeleteFormula(row) && (
            <button
              className="link link-danger"
              data-ann-target="formula.list.delete"
              onClick={() => setConfirm({ formula: row, mode: 'delete' })}
            >
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
        breadcrumb={['系统管理', '核算配置', '计算公式']}
        title="公式配置"
        description="维护计算公式与数据因素：公式类型按输入口径分类（因子公式、能耗公式、碳排公式、其他）；公式只解决“一类计算项怎么算”，与生命周期阶段无关、可跨阶段复用，阶段归属与排放源绑定在建模时配置"
        actions={
          <Button variant="primary" data-ann-target="formula.list.add" onClick={() => navigate('/model/calc-engine/new')}>
            新增公式
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">公式名称 / 编码 / 表达式</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">公式类型</span>
            <Select
              value={query.formulaType}
              placeholder="全部"
              options={typeOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, formulaType: e.target.value as '' | FormulaType }))}
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
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | EnableStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="formula.list.reset" onClick={() => setQuery(EMPTY_QUERY)}>
              重置
            </Button>
            <Button variant="primary" data-ann-target="formula.list.search" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">计算公式</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 公式不做审核与版本化，可直接编辑；仅「已禁用」可删除
            </span>
          </div>
          <Button data-ann-target="formula.list.export" onClick={() => toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)}>
            导出
          </Button>
        </div>

        <div className="ce-table-wrap ce-table-sticky">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <FormulaConfirmModal
        open={!!confirm}
        formula={confirm?.formula ?? null}
        mode={confirm?.mode ?? 'disable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

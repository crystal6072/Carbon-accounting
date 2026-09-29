import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { deleteCalcFormula, fetchCalcFormula, updateCalcFormulaStatus } from '@/mock'
import type { CalcFormula, FormulaFactor } from '@/types'
import FormulaConfirmModal from './FormulaConfirmModal'
import type { FormulaConfirmMode } from './FormulaConfirmModal'
import FormulaTestRunModal from './FormulaTestRunModal'
import {
  canDeleteFormula,
  canDisableFormula,
  canEnableFormula,
  dataOwnerTypeText,
  enableStatusText,
  enableStatusTone,
  factorSourceTypeText,
  formulaTypeText,
} from './calcEngineMeta'
import './CalcEngine.css'

/** 公式详情：公式信息 + 数据因素（只读）+ 制单信息 */
export default function CalcFormulaDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [formula, setFormula] = useState<CalcFormula | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<FormulaConfirmMode | null>(null)
  const [testOpen, setTestOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setFormula(await fetchCalcFormula(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '公式加载失败', 'error')
      setFormula(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleConfirm = async () => {
    if (!formula || !confirm) return
    try {
      if (confirm === 'delete') {
        await deleteCalcFormula(formula.id)
        toast('删除成功')
        navigate('/model/calc-engine')
        return
      }
      await updateCalcFormulaStatus(formula.id, confirm === 'enable' ? 'enabled' : 'disabled')
      toast(confirm === 'enable' ? '启用成功' : '禁用成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const factorColumns: Column<FormulaFactor>[] = [
    { key: 'name', title: '因素名称', width: 150, render: (row) => <span className="nowrap">{row.name}</span> },
    {
      key: 'sourceType',
      title: '因素来源',
      width: 110,
      render: (row) => <Tag tone="info">{factorSourceTypeText[row.sourceType]}</Tag>,
    },
    { key: 'sourceLib', title: '来源库', width: 110, render: (row) => row.sourceLib || '-' },
    {
      key: 'sourceName',
      title: '引用对象',
      width: 200,
      render: (row) =>
        row.sourceType === 'factor'
          ? `${row.sourceName || '-'}${row.sourceCode ? `（${row.sourceCode}）` : ''}`
          : '-',
    },
    { key: 'value', title: '因素数值', width: 120, render: (row) => <span className="mono">{row.value || '-'}</span> },
    { key: 'unit', title: '单位', width: 140, render: (row) => <span className="mono">{row.unit || '-'}</span> },
  ]

  if (!formula) {
    return (
      <>
        <PageHeader breadcrumb={['后台管理', '核算配置', '计算公式']} title="公式详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '公式不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '核算配置', '计算公式', formula.name]}
        title={formula.name}
        description={`${formula.code} · ${formulaTypeText[formula.formulaType]}`}
        actions={
          <>
            <Button data-ann-target="formula.detail.back" onClick={() => navigate('/model/calc-engine')}>
              返回列表
            </Button>
            <Button data-ann-target="formula.detail.test" onClick={() => setTestOpen(true)}>
              试算
            </Button>
            <Button
              variant="primary"
              data-ann-target="formula.detail.edit"
              onClick={() => navigate(`/model/calc-engine/${formula.id}/edit`)}
            >
              编辑
            </Button>
            {canDisableFormula(formula) && (
              <Button data-ann-target="formula.detail.disable" onClick={() => setConfirm('disable')}>
                禁用
              </Button>
            )}
            {canEnableFormula(formula) && (
              <Button data-ann-target="formula.detail.enable" onClick={() => setConfirm('enable')}>
                启用
              </Button>
            )}
            {canDeleteFormula(formula) && (
              <Button variant="danger" data-ann-target="formula.detail.delete" onClick={() => setConfirm('delete')}>
                删除
              </Button>
            )}
          </>
        }
      />

      <div className="ce-stack">
        <section className="card">
          <div className="ce-section-header">
            <span className="ce-section-title">基本信息</span>
            <span className="toolbar-tip">
              {dataOwnerTypeText[formula.dataOwnerType]} · 归属组织 {formula.ownerOrg}
            </span>
          </div>
          <div className="ce-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">公式编码</span>
                <span className="detail-value mono">{formula.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">公式类型</span>
                <span className="detail-value">{formulaTypeText[formula.formulaType]}</span>
              </div>
              <div className="detail-item ce-detail-item-full">
                <span className="detail-label">适用行业</span>
                <span className="detail-value">
                  {formula.industries.length > 0 ? formula.industries.join('、') : '全行业通用'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={enableStatusTone[formula.status]}>{enableStatusText[formula.status]}</Tag>
                </span>
              </div>
              <div className="detail-item ce-detail-item-full">
                <span className="detail-label">计算公式</span>
                <span className="detail-value ce-expression">{formula.expression}</span>
              </div>
              <div className="detail-item ce-detail-item-full">
                <span className="detail-label">描述</span>
                <span className="detail-value">{formula.description || '-'}</span>
              </div>
            </div>
          </div>
          <div className="ce-section-body ce-section-tip">
            计算公式由<strong>数据因素与运算符点选生成</strong>，不使用脚本；公式<strong>不做审核流程、不做版本化</strong>，
            变更不追溯已核算的历史结果。
          </div>
        </section>

        <section className="card">
          <div className="ce-section-header">
            <span className="ce-section-title">数据因素</span>
            <span className="toolbar-tip">共 {formula.factors.length} 项 · 因素名称即计算公式中的运算项</span>
          </div>
          <div className="ce-section-body ce-section-flush">
            {formula.factors.length > 0 ? (
              <div className="ce-table-wrap">
                <Table columns={factorColumns} data={formula.factors} rowKey={(row) => row.id} />
              </div>
            ) : (
              <div className="empty">暂无数据因素</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="ce-section-header">
            <span className="ce-section-title">制单信息</span>
          </div>
          <div className="ce-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{formula.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{formula.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新人</span>
                <span className="detail-value">{formula.updatedBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{formula.updatedAt}</span>
              </div>
            </div>
          </div>
          <div className="ce-section-body ce-section-tip">
            公式仅「已禁用」可删除；建模侧若仍绑定该公式，请先在建模中解除绑定后再删除。
          </div>
        </section>
      </div>

      <FormulaConfirmModal
        open={!!confirm}
        formula={formula}
        mode={confirm ?? 'disable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />

      <FormulaTestRunModal open={testOpen} formula={formula} onClose={() => setTestOpen(false)} />
    </>
  )
}

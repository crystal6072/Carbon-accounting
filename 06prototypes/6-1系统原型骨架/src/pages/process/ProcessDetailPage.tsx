import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, PageHeader, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { buildFormulaLines } from '@/shared/formulaMeta'
import {
  deleteProcess,
  fetchCategories,
  fetchOperations,
  fetchProcess,
  fetchProcessLogs,
  updateProcessUseStatus,
} from '@/mock'
import type {
  CategoryItem,
  OperationItem,
  OperationLogItem,
  ProcessDetail,
  ProcessOperationItem,
} from '@/types'
import ProcessConfirmModal from './ProcessConfirmModal'
import type { ProcessConfirmMode } from './ProcessConfirmModal'
import ProcessOperationViewModal from './ProcessOperationViewModal'
import {
  buildChainChecks,
  sortOperations,
  useStatusText,
  useStatusTone,
  visibilityText,
} from './processMeta'
import './ProcessPage.css'

const LOG_PAGE_SIZE = 5

export default function ProcessDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [detail, setDetail] = useState<ProcessDetail | null>(null)
  const [operations, setOperations] = useState<OperationItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [logs, setLogs] = useState<OperationLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [confirmMode, setConfirmMode] = useState<ProcessConfirmMode | null>(null)
  /** 待查看详情的工序明细行 */
  const [viewRowId, setViewRowId] = useState<string>('')
  /** 工序明细展示模式：流程画布 / 列表（与产品信息库一致） */
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detailData, operationList, categoryList, logList] = await Promise.all([
        fetchProcess(id),
        fetchOperations(),
        fetchCategories(),
        fetchProcessLogs(id),
      ])
      setDetail(detailData)
      setOperations(operationList)
      setCategories(categoryList)
      setLogs(logList)
    } catch (error) {
      toast(error instanceof Error ? error.message : '工艺流程加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const opMap = useMemo(() => new Map(operations.map((op) => [op.code, op])), [operations])

  /** 待查看详情的工序明细行所引用的工序 */
  const viewOperation = useMemo(() => {
    if (!detail || !viewRowId) return null
    const row = detail.operations.find((item) => item.id === viewRowId)
    return row ? opMap.get(row.opCode) ?? null : null
  }, [detail, opMap, viewRowId])

  const chainChecks = useMemo(
    () => (detail ? buildChainChecks(detail.operations, operations) : []),
    [detail, operations],
  )

  const disabledRefs = useMemo(() => chainChecks.filter((check) => check.opDisabled), [chainChecks])
  const breakCount = useMemo(() => chainChecks.filter((check) => check.linkStatus === 'break').length, [chainChecks])
  const firstCheck = chainChecks.find((check) => check.isFirst)
  const lastCheck = chainChecks.find((check) => check.isLast)

  const handleConfirm = async () => {
    if (!detail || !confirmMode) return
    try {
      if (confirmMode === 'delete') {
        await deleteProcess(detail.id)
        toast('删除成功')
        navigate('/basic/process')
        return
      }
      await updateProcessUseStatus(detail.id, confirmMode === 'enable' ? 'enabled' : 'disabled')
      toast(confirmMode === 'enable' ? '启用成功' : '禁用成功')
      setConfirmMode(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /** 列表视图（与产品信息库列表列一致）：工序 / 工序类型 / 投入项 / 产出项 / 计算公式 */
  const operationColumns: Column<ProcessOperationItem>[] = [
    {
      key: 'opCode',
      title: '工序',
      width: 220,
      render: (row) => (
        <span className="flex gap-xs">
          <button className="link" onClick={() => setViewRowId(row.id)}>
            {row.opName}
          </button>
          <span className="mono toolbar-tip">{row.opCode}</span>
        </span>
      ),
    },
    {
      key: 'opType',
      title: '工序类型',
      width: 100,
      render: (row) => {
        const op = opMap.get(row.opCode)
        if (!op) return '-'
        const text = op.type === 'main' ? '主工序' : op.type === 'auxiliary' ? '辅助工序' : '处置工序'
        const tone = op.type === 'main' ? 'info' : op.type === 'auxiliary' ? 'default' : 'warning'
        return <Tag tone={tone}>{text}</Tag>
      },
    },
    {
      key: 'inputs',
      title: '投入项',
      width: 220,
      render: (row) => {
        const list = opMap.get(row.opCode)?.inputs ?? []
        if (list.length === 0) return '-'
        return (
          <div className="flow-list">
            {list.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-in">
                {item.refName}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'outputs',
      title: '产出项',
      width: 220,
      render: (row) => {
        const list = opMap.get(row.opCode)?.outputs ?? []
        if (list.length === 0) return '-'
        return (
          <div className="flow-list">
            {list.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-out">
                {item.refName}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'formula',
      title: '计算公式',
      render: (row) => {
        const op = opMap.get(row.opCode)
        if (!op) return '-'
        const lines = buildFormulaLines([
          ...op.inputs.map((item) => ({
            name: item.refName,
            flowType: item.flowType,
            formulaName: item.formulaName,
            formulaCode: item.formulaCode,
            disposal: item.disposal,
          })),
          ...op.outputs.map((item) => ({
            name: item.refName,
            flowType: item.flowType,
            formulaName: item.formulaName,
            formulaCode: item.formulaCode,
            disposal: item.disposal,
          })),
        ])
        if (lines.length === 0) return '-'
        return (
          <div className="flow-detail">
            {lines.map((line) => (
              <span key={line} className="flow-detail-line">
                {line}
              </span>
            ))}
          </div>
        )
      },
    },
  ]

  const logColumns: Column<OperationLogItem>[] = [
    { key: 'time', title: '时间', width: 150 },
    { key: 'operator', title: '操作人', width: 120 },
    { key: 'action', title: '操作', width: 160 },
    { key: 'detail', title: '说明', render: (row) => row.detail || '-' },
  ]

  if (!detail) {
    return (
      <>
        <PageHeader breadcrumb={['后台管理', '工艺流程管理', '工艺流程']} title="工艺流程详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '工艺流程不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  const category = categories.find((item) => item.id === detail.categoryId)

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '工艺流程管理', '工艺流程', detail.name]}
        title={detail.name}
        description={`工艺流程编码 ${detail.code} · ${useStatusText[detail.useStatus]} · 共 ${detail.operations.length} 道工序 · 不做版本化`}
        actions={
          <>
            <Button onClick={() => navigate('/basic/process')}>返回列表</Button>
            {detail.useStatus === 'disabled' ? (
              <>
                <Button onClick={() => setConfirmMode('enable')}>启用</Button>
                <Button onClick={() => setConfirmMode('delete')}>删除</Button>
              </>
            ) : (
              <Button onClick={() => setConfirmMode('disable')}>禁用</Button>
            )}
            <Button variant="primary" onClick={() => navigate(`/basic/process/${detail.id}/edit`)}>
              编辑
            </Button>
          </>
        }
      />

      <div className="stack">
        {disabledRefs.length > 0 && (
          <div className="notice notice-warning">
            <Icon name="warning" size={16} />
            <span>
              本工艺流程引用了 {disabledRefs.length} 道「已禁用」工序：禁用工序不可被引用（含历史引用），
              编辑保存前需先将其替换为启用中的工序（A17 / D02）。
            </span>
          </div>
        )}
        {detail.useStatus === 'disabled' && (
          <div className="notice notice-info">
            <Icon name="warning" size={16} />
            <span>
              当前为「禁用」状态：不可被产品引用（不出现在产品侧候选列表）；已建副本不受影响；如需删除请直接使用页头「删除」（R-012 / R-013）。
            </span>
          </div>
        )}

        <section className="card">
          <div className="section-header">
            <span className="section-title">基本信息</span>
            <span className="toolbar-tip">工艺流程不做版本化（已确认 Q05）：模板可自由编辑，被引用或被复制后仍可编辑</span>
          </div>
          <div className="section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">工艺流程编码</span>
                <span className="detail-value mono">{detail.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">工艺流程名称</span>
                <span className="detail-value">{detail.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">适用产品分类</span>
                <span className="detail-value">
                  {category ? `${category.name}${category.status === 'disabled' ? '（已禁用）' : ''}` : '-'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">所属行业</span>
                <span className="detail-value">{detail.industry || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">所属生命周期阶段</span>
                <span className="detail-value">{detail.lifecycleStage || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">基准数量</span>
                <span className="detail-value">
                  {detail.baseQty ?? '-'}
                  {detail.baseUnit ? ` ${detail.baseUnit}` : ''}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={useStatusTone[detail.useStatus]}>{useStatusText[detail.useStatus]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">是否含处置工序</span>
                <span className="detail-value">{detail.hasDisposal ? '是' : '否'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">归属组织</span>
                <span className="detail-value">{detail.org}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">可见性</span>
                <span className="detail-value">{visibilityText[detail.visibility]}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{detail.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{detail.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">最后修改</span>
                <span className="detail-value">{detail.updatedAt}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">工艺流程描述</span>
                <span className="detail-value">{detail.description || '-'}</span>
              </div>
            </div>
          </div>
          <div className="form-block">
            <div className="form-tip">
              「基准数量 / 基准单位」按「单位产品」口径（已确认 Q04）；「是否主工艺」字段经业务确认取消（Q06）。
              复制情况：已复制本工艺流程的产品共 {detail.copiedProductCount} 个；副本内容固定、模板变更不回写，
              仅在副本上标记「模板已更新」（R-011 / 【待确认 Q09】）。
              {detail.copiedProductCount > 0
                ? ' 已被复制不影响编辑与删除：删除仅取决于使用状态是否为「禁用」（R-013）。'
                : ''}
              按业务确认，本页不展示「适用产品」只读反查（Q01，2026-09-21）。
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span className="section-title">工序明细</span>
            <span className="section-extra">
              <span className="toolbar-tip">
                共 {detail.operations.length} 道 · 点击 / 双击工序可查看详情（只读）；投入产出流维护归属「工序管理」（A4）
              </span>
              <div className="pcf-view-switch" role="tablist" aria-label="展示方式">
                <button
                  type="button"
                  className={viewMode === 'canvas' ? 'active' : ''}
                  onClick={() => setViewMode('canvas')}
                >
                  画布
                </button>
                <button
                  type="button"
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                >
                  列表
                </button>
              </div>
            </span>
          </div>
          {viewMode === 'canvas' ? (
            <div className="flow-canvas">
              <div className="flow-canvas-stage">
                <div className="flow-track">
                  {detail.operations.length === 0 && <div className="flow-empty">暂无工序明细</div>}
                  {sortOperations(detail.operations).map((row, index) => {
                    const op = opMap.get(row.opCode)
                    return (
                      <Fragment key={row.id}>
                        {index > 0 && <div className="flow-link" />}
                        <div
                          className="flow-node"
                          onClick={() => row.opCode && setViewRowId(row.id)}
                        >
                          <span className="flow-node-anchor flow-node-anchor-top" />
                          <div className="flow-node-head">
                            <span className="flow-node-seq">{index + 1}</span>
                            <span className="flow-node-name">{row.opName}</span>
                          </div>
                          <div className="flow-node-meta">
                            <span className="mono">{row.opCode}</span>
                            {op && (
                              <>
                                <span className="flow-node-sep">·</span>
                                <span>
                                  {op.type === 'main' ? '主工序' : op.type === 'auxiliary' ? '辅助工序' : '处置工序'}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flow-node-flow">
                            <span className="flow-node-flow-line">
                              投入：{op ? op.inputs.map((i) => i.refName).join('、') || '-' : '-'}
                            </span>
                            <span className="flow-node-flow-line">
                              产出：{op ? op.outputs.map((i) => i.refName).join('、') || '-' : '-'}
                            </span>
                          </div>
                          <span className="flow-node-anchor flow-node-anchor-bottom" />
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="section-body section-body-flush">
              <div className="process-table-wrap">
                <Table
                  columns={operationColumns}
                  data={sortOperations(detail.operations)}
                  rowKey={(row) => row.id}
                  emptyText="暂无工序明细"
                />
              </div>
            </div>
          )}
          <div className="form-block">
            <div className="form-tip">
              校验归属本模块（已确认 Q03）：首道投入（D05）、末道产出为成品（D06）、中间上下游衔接（D11）
              三条「均为提示级、不阻断保存」；衔接按物料对象（引用编码）逐对判定（A9 / A10）。
              {firstCheck && !firstCheck.firstInputOk && ' 当前首道工序投入全部为中间品（提示，不阻断）。'}
              {lastCheck && !lastCheck.lastOutputIsProduct && ' 当前末道工序产出未包含「成品」（提示，不阻断）。'}
              {breakCount > 0 && ` 当前存在 ${breakCount} 处衔接断点（提示，不阻断保存）。`}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <button className="collapse-trigger" onClick={() => setLogOpen((prev) => !prev)}>
              <span className={['collapse-caret', logOpen ? 'expanded' : ''].filter(Boolean).join(' ')}>
                <Icon name="chevronRight" size={16} />
              </span>
              操作日志
            </button>
            <span className="toolbar-tip">共 {logs.length} 条</span>
          </div>
          {logOpen && (
            <>
              <div className="section-body section-body-flush">
                <Table
                  columns={logColumns}
                  data={logs.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE)}
                  rowKey={(row) => row.id}
                />
              </div>
              <Pagination total={logs.length} page={logPage} pageSize={LOG_PAGE_SIZE} onChange={setLogPage} />
            </>
          )}
        </section>
      </div>

      <ProcessConfirmModal
        open={!!confirmMode}
        process={detail}
        mode={confirmMode ?? 'enable'}
        onClose={() => setConfirmMode(null)}
        onConfirm={handleConfirm}
      />

      <ProcessOperationViewModal
        open={viewRowId !== ''}
        operation={viewOperation}
        onClose={() => setViewRowId('')}
      />
    </>
  )
}

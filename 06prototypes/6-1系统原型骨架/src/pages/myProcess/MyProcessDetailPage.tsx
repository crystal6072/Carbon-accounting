import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, PageHeader, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  deleteMyProcess,
  fetchCategories,
  fetchMyProcess,
  fetchMyProcessLogs,
  fetchOperations,
} from '@/mock'
import type {
  CategoryItem,
  MyProcessItem,
  OperationItem,
  OperationLogItem,
  ProcessOperationItem,
} from '@/types'
import ProcessConfirmModal from '@/pages/process/ProcessConfirmModal'
import type { ProcessConfirmMode } from '@/pages/process/ProcessConfirmModal'
import ProcessOperationViewModal from '@/pages/process/ProcessOperationViewModal'
import { buildChainChecks, sortOperations } from '@/pages/process/processMeta'
import { MY_PROCESS_BREADCRUMB } from './myProcessMeta'
import '@/pages/process/ProcessPage.css'
import './MyProcessPage.css'

const LOG_PAGE_SIZE = 5

/**
 * 我的工艺库 · 工艺流程详情。
 * 组织自建工艺可编辑 / 删除；引用后台工艺为只读项，可用性随后台工艺流程库。
 */
export default function MyProcessDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [detail, setDetail] = useState<MyProcessItem | null>(null)
  const [operations, setOperations] = useState<OperationItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [logs, setLogs] = useState<OperationLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [confirmMode, setConfirmMode] = useState<ProcessConfirmMode | null>(null)
  /** 待查看详情的工序明细行 */
  const [viewRowId, setViewRowId] = useState<string>('')
  /** 工序明细展示模式：流程画布 / 列表 */
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detailData, operationList, categoryList, logList] = await Promise.all([
        fetchMyProcess(id),
        fetchOperations(),
        fetchCategories(),
        fetchMyProcessLogs(id),
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

  const viewOperation = useMemo(() => {
    if (!detail || !viewRowId) return null
    const row = detail.operations.find((item) => item.id === viewRowId)
    return row ? opMap.get(row.opCode) ?? null : null
  }, [detail, opMap, viewRowId])

  const isReferenced = detail?.source === 'referenced'

  const chainChecks = useMemo(
    () => (detail ? buildChainChecks(detail.operations, operations) : []),
    [detail, operations],
  )
  const breakCount = useMemo(() => chainChecks.filter((check) => check.linkStatus === 'break').length, [chainChecks])
  const firstCheck = chainChecks.find((check) => check.isFirst)
  const lastCheck = chainChecks.find((check) => check.isLast)

  const handleConfirm = async () => {
    if (!detail || !confirmMode) return
    try {
      await deleteMyProcess(detail.id)
      toast('删除成功')
      navigate('/pcf/my-process')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /** 列表视图：工序 / 工序类型 / 投入项 / 产出项 */
  const operationColumns: Column<ProcessOperationItem>[] = [
    {
      key: 'opCode',
      title: '工序',
      width: 220,
      render: (row) => (
        <span className="flex gap-xs">
          <button className="link" data-ann-target="my-process.viewop" onClick={() => setViewRowId(row.id)}>
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
        <PageHeader breadcrumb={MY_PROCESS_BREADCRUMB} title="工艺流程详情" />
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
        breadcrumb={[...MY_PROCESS_BREADCRUMB, detail.name]}
        title={detail.name}
        description={`工艺流程编码 ${detail.code} · 共 ${detail.operations.length} 道工序`}
        actions={
          <>
            <Button onClick={() => navigate('/pcf/my-process')}>返回列表</Button>
            {!isReferenced && (
              <>
                <Button variant="primary" data-ann-target="my-process.edit" onClick={() => navigate(`/pcf/my-process/${detail.id}/edit`)}>
                  编辑
                </Button>
                <Button variant="danger" data-ann-target="my-process.delete" onClick={() => setConfirmMode('delete')}>
                  删除
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="stack" data-ann-target="my-process.detail">
        <section className="card" data-ann-target="my-process.detail.basic">
          <div className="section-header">
            <span className="section-title">基本信息</span>
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
              <div className="detail-item" data-ann-target="my-process.detail.source">
                <span className="detail-label">工艺来源</span>
                <span className="detail-value">
                  {detail.source === 'referenced' ? '引用后台工艺' : '自己新增'}
                  {isReferenced && <span className="my-source-readonly-tip">只读指向平台级工艺</span>}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">是否含处置工序</span>
                <span className="detail-value">{detail.hasDisposal ? '是' : '否'}</span>
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
        </section>

        <section className="card" data-ann-target="my-process.detail.process">
          <div className="section-header">
            <span className="section-title" data-ann-target="my-process.detail.check">工序明细</span>
            <span className="section-extra">
              <span className="toolbar-tip">共 {detail.operations.length} 道</span>
              <div className="pcf-view-switch" role="tablist" aria-label="展示方式">
                <button
                  type="button"
                  className={viewMode === 'canvas' ? 'active' : ''}
                  onClick={() => setViewMode('canvas')}
                >
                  画布
                </button>
                <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
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
                        <div className="flow-node" onClick={() => row.opCode && setViewRowId(row.id)}>
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
        </section>

        <section className="card" data-ann-target="my-process.detail.log">
          <div className="section-header">
            <button className="collapse-trigger" onClick={() => setLogOpen((prev) => !prev)}>
              <span className={['collapse-caret', logOpen ? 'expanded' : ''].filter(Boolean).join(' ')}>
                <Icon name="chevronRight" size={16} />
              </span>
              操作日志
            </button>
            <span className="toolbar-tip">
              {isReferenced ? '引用后台工艺为只读项，无本组织操作日志' : `共 ${logs.length} 条`}
            </span>
          </div>
          {logOpen && !isReferenced && (
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

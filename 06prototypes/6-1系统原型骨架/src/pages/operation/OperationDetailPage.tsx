import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, PageHeader, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { deleteOperation, fetchOperation, fetchOperationLogs, updateOperationUseStatus } from '@/mock'
import type { OperationFlowItem, OperationItem, OperationLogItem } from '@/types'
import OperationConfirmModal from './OperationConfirmModal'
import type { OperationConfirmMode } from './OperationConfirmModal'
import {
  emissionCategoryText,
  flowTypeText,
  flowTypeTone,
  operationTypeText,
  operationTypeTone,
  useStatusText,
  useStatusTone,
} from './operationMeta'
import './OperationPage.css'

const LOG_PAGE_SIZE = 5

export default function OperationDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [operation, setOperation] = useState<OperationItem | null>(null)
  const [logs, setLogs] = useState<OperationLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [confirmMode, setConfirmMode] = useState<OperationConfirmMode | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, logList] = await Promise.all([fetchOperation(id), fetchOperationLogs(id)])
      setOperation(detail)
      setLogs(logList)
    } catch (error) {
      toast(error instanceof Error ? error.message : '工序加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleConfirm = async () => {
    if (!operation || !confirmMode) return
    try {
      if (confirmMode === 'delete') {
        await deleteOperation(operation.id)
        toast('删除成功')
        navigate('/basic/operation')
        return
      }
      await updateOperationUseStatus(operation.id, confirmMode === 'enable' ? 'enabled' : 'disabled')
      toast(confirmMode === 'enable' ? '启用成功' : '禁用成功')
      setConfirmMode(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /** 投入项数据项清单（不含数量，数量在核算模型 / 数据录入阶段填写） */
  const inputColumns: Column<OperationFlowItem>[] = [
    { key: 'seq', title: '序号', width: 60, align: 'center' },
    {
      key: 'flowType',
      title: '流类型',
      width: 120,
      render: (row) => <Tag tone={flowTypeTone[row.flowType]}>{flowTypeText[row.flowType]}</Tag>,
    },
    {
      key: 'refName',
      title: '物料',
      width: 220,
      render: (row) => (
        <span className="flex gap-xs">
          <span>{row.refName}</span>
          <span className="mono toolbar-tip">{row.refCode}</span>
        </span>
      ),
    },
    { key: 'unit', title: '单位', width: 90 },
    {
      key: 'formula',
      title: '计算公式',
      width: 220,
      render: (row) =>
        row.disposal === 'excluded' ? (
          <Tag tone="default">不参与计算</Tag>
        ) : (
          <span className="toolbar-tip" title={row.formulaExpression}>
            {row.formulaName ? `${row.formulaName}（${row.formulaCode}）` : '-'}
          </span>
        ),
    },
    { key: 'remark', title: '备注', render: (row) => row.remark || '-' },
  ]

  /** 产出项数据项清单 */
  const outputColumns: Column<OperationFlowItem>[] = [
    { key: 'seq', title: '序号', width: 60, align: 'center' },
    {
      key: 'flowType',
      title: '流类型',
      width: 120,
      render: (row) => <Tag tone={flowTypeTone[row.flowType]}>{flowTypeText[row.flowType]}</Tag>,
    },
    {
      key: 'refName',
      title: '物料',
      width: 200,
      render: (row) => (
        <span className="flex gap-xs">
          <span>{row.refName}</span>
          <span className="mono toolbar-tip">{row.refCode}</span>
        </span>
      ),
    },
    { key: 'unit', title: '单位', width: 90 },
    {
      key: 'emissionCategory',
      title: '排放物类别',
      width: 110,
      render: (row) =>
        row.flowType === 'emission' && row.emissionCategory ? (
          <Tag tone="error">{emissionCategoryText[row.emissionCategory]}</Tag>
        ) : (
          '-'
        ),
    },
    {
      key: 'formula',
      title: '计算公式',
      width: 220,
      render: (row) =>
        row.disposal === 'excluded' ? (
          <Tag tone="default">不参与计算</Tag>
        ) : (
          <span className="toolbar-tip" title={row.formulaExpression}>
            {row.formulaName ? `${row.formulaName}（${row.formulaCode}）` : '-'}
          </span>
        ),
    },
    { key: 'remark', title: '备注', render: (row) => row.remark || '-' },
  ]

  const logColumns: Column<OperationLogItem>[] = [
    { key: 'time', title: '时间', width: 150 },
    { key: 'operator', title: '操作人', width: 120 },
    { key: 'action', title: '操作', width: 160 },
    { key: 'detail', title: '说明', render: (row) => row.detail || '-' },
  ]

  if (!operation) {
    return (
      <>
        <PageHeader breadcrumb={['后台管理', '工艺流程管理', '工序']} title="工序详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '工序不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '工艺流程管理', '工序', operation.name]}
        title={operation.name}
        description={`工序编码 ${operation.code} · ${operationTypeText[operation.type]} · ${useStatusText[operation.useStatus]}`}
        actions={
          <>
            <Button onClick={() => navigate('/basic/operation')}>返回列表</Button>
            {operation.useStatus === 'disabled' ? (
              <>
                <Button onClick={() => setConfirmMode('enable')}>启用</Button>
                <Button onClick={() => setConfirmMode('delete')}>删除</Button>
              </>
            ) : (
              <Button onClick={() => setConfirmMode('disable')}>禁用</Button>
            )}
            <Button variant="primary" onClick={() => navigate(`/basic/operation/${operation.id}/edit`)}>
              编辑
            </Button>
          </>
        }
      />

      <div className="stack">
        <section className="card">
          <div className="section-header">
            <span className="section-title">基本信息</span>
            <span className="toolbar-tip">工序不做版本化，无版本号与版本状态（R-017）</span>
          </div>
          <div className="section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">工序编码</span>
                <span className="detail-value mono">{operation.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">工序名称</span>
                <span className="detail-value">{operation.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">工序类型</span>
                <span className="detail-value">
                  <Tag tone={operationTypeTone[operation.type]}>{operationTypeText[operation.type]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={useStatusTone[operation.useStatus]}>{useStatusText[operation.useStatus]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">工序图标</span>
                <span className="detail-value">
                  {operation.iconUrl ? (
                    <img className="image-thumb" src={operation.iconUrl} alt={operation.name} />
                  ) : (
                    '未上传'
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{operation.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{operation.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{operation.updatedAt}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">工序描述</span>
                <span className="detail-value">{operation.description || '-'}</span>
              </div>
            </div>
          </div>
          <div className="form-block">
            <div className="form-tip">
              工序只维护「有哪些数据项」与单位，不填数量：数量即「工序单耗」（本工序单位产品对应的物料消耗量 / 产出量），
              在项目核算数据填报阶段填写。因此主对象不设「基准数量 / 基准单位」（已确认 Q02 / Q03 / Q04）。
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span className="section-title">投入项</span>
            <span className="toolbar-tip">
              原辅料 / 自然资源输入引用物料库、能源引用能源库；共 {operation.inputs.length} 条
            </span>
          </div>
          <div className="section-body section-body-flush">
            <div className="operation-table-wrap">
              <Table
                columns={inputColumns}
                data={operation.inputs}
                rowKey={(row) => row.id}
                emptyText="暂无投入项"
              />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span className="section-title">产出项</span>
            <span className="toolbar-tip">
              中间品 / 产品 / 副产品 / 排放物均引用物料库；排放物须标类别（废气 / 废水 / 废渣）；至少 1 条；共{' '}
              {operation.outputs.length} 条
            </span>
          </div>
          <div className="section-body section-body-flush">
            <div className="operation-table-wrap">
              <Table
                columns={outputColumns}
                data={operation.outputs}
                rowKey={(row) => row.id}
                emptyText="暂无产出项"
              />
            </div>
          </div>
          <div className="form-block">
            <div className="form-tip">
              投入合计 / 产出合计 / 损耗不在工序主数据记录（R-018）；工序不记录数量，质量平衡校验的对象是某次核算
              实际填报的活动数据，由检测引擎按物料清单与单位换算计算（方案 §5.4 E09）。排放 / 负荷在产品与副产品之间的
              分配由「分配规则管理」承载（F21）。
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

      <OperationConfirmModal
        open={!!confirmMode}
        operation={operation}
        mode={confirmMode ?? 'enable'}
        onClose={() => setConfirmMode(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

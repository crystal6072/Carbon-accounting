import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Dialog,
  MessagePlugin,
  Popconfirm,
  Progress,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Textarea,
  Tooltip,
} from 'tdesign-react'
import {
  addScenario,
  deleteScenario,
  fetchSensitivityDetail,
  updateBaseline,
  updateScenarioDescription,
} from '@/mock/sensitivity'
import { PCF_CALIBERS } from '@/types'
import type { PcfCaliberKey } from '@/types'
import type { SensitivityAnalysis, SensitivityScenario } from '@/types/sensitivity'
import ScenarioDataDrawer from './ScenarioDataDrawer'
import {
  SA_CALC_STATUS_TEXT,
  caliberValueOf,
  deltaStrength,
  deltaRateTone,
  formatEmission,
} from './sensitivityMeta'
import './SensitivityPage.css'

const MAX_DESC = 500

/**
 * 敏感性分析详情页（`/report/sensitivity/:id`）。
 * 布局口径见《敏感性分析_Demo》V0.2：基准卡 + 情景表格（一行一情景）+ 情景对比表。
 */
export default function SensitivityDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [analysis, setAnalysis] = useState<SensitivityAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [caliber, setCaliber] = useState<PcfCaliberKey>('total')
  const [drawerScenarioId, setDrawerScenarioId] = useState<string | null>(null)
  const [deleteScenarioTarget, setDeleteScenarioTarget] = useState<SensitivityScenario | null>(null)
  const [updateBaselineOpen, setUpdateBaselineOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setAnalysis(await fetchSensitivityDetail(id))
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '加载失败')
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  /** 情景结果按当前口径取值 */
  const emissionOf = (scenario: SensitivityScenario): number | null =>
    scenario.result ? caliberValueOf(scenario.result.caliberEmission, caliber) : null

  const baselineEmission = analysis ? caliberValueOf(analysis.baselineCaliberEmission, caliber) : 0

  /** 对比区：按 |变化率| 降序 */
  const compareRows = useMemo(() => {
    if (!analysis) return []
    return analysis.scenarios
      .filter((item) => item.result)
      .slice()
      .sort((a, b) => Math.abs(b.result?.deltaRate ?? 0) - Math.abs(a.result?.deltaRate ?? 0))
  }, [analysis])

  const maxAbs = useMemo(
    () => compareRows.reduce((max, item) => Math.max(max, Math.abs(item.result?.deltaRate ?? 0)), 0),
    [compareRows],
  )

  /* ---------- 描述保存（乐观更新 + 失焦提交） ---------- */

  const patchBaselineDescription = (value: string) =>
    setAnalysis((prev) => (prev ? { ...prev, baselineDescription: value } : prev))

  const patchScenarioDescription = (scenarioId: string, value: string) =>
    setAnalysis((prev) =>
      prev
        ? {
            ...prev,
            scenarios: prev.scenarios.map((item) =>
              item.id === scenarioId ? { ...item, description: value } : item,
            ),
          }
        : prev,
    )

  const commitDescription = async (scenarioId: string | null, value: string) => {
    if (!analysis) return
    try {
      await updateScenarioDescription(analysis.id, scenarioId, value)
      await reload()
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  /* ---------- 动作 ---------- */

  const handleAddScenario = async () => {
    if (!analysis) return
    try {
      await addScenario(analysis.id)
      await reload()
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '新增失败')
    }
  }

  const handleDeleteScenario = async () => {
    if (!analysis || !deleteScenarioTarget) return
    try {
      await deleteScenario(analysis.id, deleteScenarioTarget.id)
      MessagePlugin.success('删除成功')
      setDeleteScenarioTarget(null)
      await reload()
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const handleUpdateBaseline = async () => {
    if (!analysis) return
    setUpdating(true)
    try {
      await updateBaseline(analysis.id)
      MessagePlugin.success('基准已更新，请重新核算各情景')
      setUpdateBaselineOpen(false)
      await reload()
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setUpdating(false)
    }
  }

  const handleExportCompare = () => {
    if (!analysis) return
    const caliberLabel = PCF_CALIBERS.find((item) => item.key === caliber)?.label ?? caliber
    const header = ['情景', '情景描述', '变更项数', `碳足迹结果(${caliberLabel})`, '变化率(%)', '关键敏感项']
    const rows = compareRows.map((item) => [
      `情景 ${item.seq}`,
      item.description,
      String(item.changedCount),
      String(emissionOf(item) ?? ''),
      item.result?.deltaRate == null ? '-' : String(item.result.deltaRate),
      item.keySensitive ? '是' : '否',
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${analysis.sourceProjectName}_敏感性分析对比_${caliber}.csv`
    link.click()
    URL.revokeObjectURL(url)
    MessagePlugin.success('导出成功')
  }

  if (!analysis) {
    return (
      <div className="sa-page">
        <Card bordered>
          <div className="sa-loading">{loading ? '加载中…' : '分析不存在或已被删除'}</div>
        </Card>
      </div>
    )
  }

  const stale = analysis.status === 'stale'
  const drawerScenario = analysis.scenarios.find((item) => item.id === drawerScenarioId) ?? null

  const scenarioColumns = [
    {
      colKey: 'name',
      title: '情景',
      width: 90,
      cell: ({ row }: { row: SensitivityScenario }) => <span className="sa-scenario-name">情景 {row.seq}</span>,
    },
    {
      colKey: 'description',
      title: '情景描述',
      width: 250,
      cell: ({ row }: { row: SensitivityScenario }) => (
        <Textarea
          value={row.description}
          placeholder="请输入"
          autosize
          maxlength={MAX_DESC}
          onChange={(value) => patchScenarioDescription(row.id, String(value ?? ''))}
          onBlur={() => void commitDescription(row.id, row.description)}
        />
      ),
    },
    {
      colKey: 'changedCount',
      title: '变更项数',
      width: 100,
      cell: ({ row }: { row: SensitivityScenario }) => <span className="sa-num">{row.changedCount}</span>,
    },
    {
      colKey: 'emission',
      title: '碳足迹结果',
      width: 130,
      cell: ({ row }: { row: SensitivityScenario }) => (
        <span className="sa-num">{row.result ? `${formatEmission(emissionOf(row))} kgCO₂e` : '-'}</span>
      ),
    },
    {
      colKey: 'deltaRate',
      title: '变化率',
      width: 160,
      cell: ({ row }: { row: SensitivityScenario }) => {
        if (!row.result) return <span className="sa-num">-</span>
        const tone = deltaRateTone(row.result.deltaRate)
        return (
          <div className="sa-delta-cell">
            <span className={`sa-delta sa-delta--${tone}`}>{row.result.deltaRateText}</span>
            <Progress theme="line" percentage={deltaStrength(row.result.deltaRate, maxAbs)} strokeWidth={4} />
          </div>
        )
      },
    },
    {
      colKey: 'calcStatus',
      title: '核算状态',
      width: 110,
      cell: ({ row }: { row: SensitivityScenario }) => (
        <Tag theme={row.calcStatus === 'calculated' ? 'success' : 'default'} variant="light">
          {SA_CALC_STATUS_TEXT[row.calcStatus]}
        </Tag>
      ),
    },
    {
      colKey: 'keySensitive',
      title: '关键敏感项',
      width: 130,
      cell: ({ row }: { row: SensitivityScenario }) =>
        row.keySensitive ? (
          <Tooltip content="该情景的 |变化率| 在当前分析中最大">
            <Tag theme="danger" variant="light">
              ★ 关键敏感项
            </Tag>
          </Tooltip>
        ) : (
          <span className="sa-empty-cell">-</span>
        ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 180,
      cell: ({ row }: { row: SensitivityScenario }) => (
        <Space size="small">
          <a className="sa-link" onClick={() => setDrawerScenarioId(row.id)}>
            编辑情景数据
          </a>
          <Popconfirm
            theme="danger"
            content="删除后不可恢复，该情景的结果将一并移除。确认删除？"
            onConfirm={() => setDeleteScenarioTarget(row)}
          >
            <a className="sa-link sa-link-danger">删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const compareColumns = [
    {
      colKey: 'name',
      title: '情景',
      width: 90,
      cell: ({ row }: { row: SensitivityScenario }) => `情景 ${row.seq}`,
    },
    {
      colKey: 'description',
      title: '描述摘要',
      cell: ({ row }: { row: SensitivityScenario }) => (
        <Tooltip content={row.description || '（未填写）'}>
          <span className="sa-ellipsis">{row.description || '（未填写）'}</span>
        </Tooltip>
      ),
    },
    {
      colKey: 'baseline',
      title: '基准碳足迹',
      width: 140,
      cell: () => <span className="sa-num">{formatEmission(baselineEmission)} kgCO₂e</span>,
    },
    {
      colKey: 'emission',
      title: '情景碳足迹',
      width: 150,
      cell: ({ row }: { row: SensitivityScenario }) => (
        <span className="sa-num">{row.result ? `${formatEmission(emissionOf(row))} kgCO₂e` : '-'}</span>
      ),
    },
    {
      colKey: 'deltaRate',
      title: '变化率',
      width: 180,
      cell: ({ row }: { row: SensitivityScenario }) => {
        if (!row.result) return <span className="sa-num">-</span>
        const tone = deltaRateTone(row.result.deltaRate)
        return (
          <div className="sa-delta-cell">
            <span className={`sa-delta sa-delta--${tone}`}>{row.result.deltaRateText}</span>
            <Progress theme="line" percentage={deltaStrength(row.result.deltaRate, maxAbs)} strokeWidth={4} />
          </div>
        )
      },
    },
    {
      colKey: 'keySensitive',
      title: '关键敏感项',
      width: 130,
      cell: ({ row }: { row: SensitivityScenario }) =>
        row.keySensitive ? (
          <Tag theme="danger" variant="light">
            ★ 关键敏感项
          </Tag>
        ) : (
          <span className="sa-empty-cell">-</span>
        ),
    },
  ]

  return (
    <div className="sa-page">
      <div className="sa-page-head">
        <div className="sa-breadcrumb">产品碳足迹 / 报告管理 / 敏感性分析 / {analysis.analysisNo}</div>
        <div className="sa-detail-head">
          <h2 className="sa-page-title">
            {analysis.sourceProjectName} 敏感性分析
            {stale ? (
              <Tag theme="warning" variant="light" className="sa-title-tag">
                待更新
              </Tag>
            ) : null}
          </h2>
          <Space size="small">
            <Button variant="outline" onClick={() => navigate('/report/sensitivity')}>
              返回
            </Button>
            <Button variant="outline" onClick={handleExportCompare} disabled={compareRows.length === 0}>
              导出对比
            </Button>
          </Space>
        </div>
        <p className="sa-page-desc">
          敏感性分析：用于估计与产品碳足迹研究结果相关假设、方法和数据的选择影响的系统方法
        </p>
      </div>

      {stale ? (
        <Alert
          theme="warning"
          className="sa-stale-alert"
          message={`来源核算数据已更新（基准版本 V${analysis.baselineVersion} → V${
            analysis.baselineVersion + 1
          }），当前结论可能失效。`}
          operation={
            <Button theme="primary" size="small" onClick={() => setUpdateBaselineOpen(true)}>
              更新基准
            </Button>
          }
        />
      ) : null}

      {/* 来源信息条 */}
      <Card bordered>
        <Descriptions column={4} size="small">
          <Descriptions.DescriptionsItem label="核算项目">
            <span className={analysis.sourceDeleted ? 'sa-deleted' : undefined}>
              {analysis.sourceProjectName}
              {analysis.sourceDeleted ? (
                <Tag theme="default" variant="light">
                  来源已删除
                </Tag>
              ) : null}
            </span>
          </Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="产品名称">{analysis.productName}</Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="影响评价方法">{analysis.lciaMethod}</Descriptions.DescriptionsItem>
          <Descriptions.DescriptionsItem label="评价指标（当前口径）">
            {analysis.hasGwpSplit ? (
              <Select
                value={caliber}
                options={PCF_CALIBERS.map((item) => ({ label: item.label, value: item.key }))}
                onChange={(value) => setCaliber((value ?? 'total') as PcfCaliberKey)}
                size="small"
              />
            ) : (
              PCF_CALIBERS.find((item) => item.key === caliber)?.label
            )}
          </Descriptions.DescriptionsItem>
        </Descriptions>
      </Card>

      {/* 基准情景 */}
      <Card bordered title="基准情景">
        <div className="sa-baseline">
          <div className="sa-baseline-form">
            <div className="sa-field-label sa-required">情景描述</div>
            <Textarea
              value={analysis.baselineDescription}
              placeholder="请输入"
              autosize={{ minRows: 2, maxRows: 4 }}
              maxlength={MAX_DESC}
              onChange={(value) => patchBaselineDescription(String(value ?? ''))}
              onBlur={() => void commitDescription(null, analysis.baselineDescription)}
            />
            <div className="sa-counter">
              {analysis.baselineDescription.length} / {MAX_DESC}
            </div>
          </div>
          <div className="sa-baseline-result">
            <Statistic title="碳足迹结果" value={baselineEmission} unit="kgCO₂e" />
            <div className="sa-baseline-meta">
              结果版本 V{analysis.baselineVersion} · 核算时间 {analysis.baselineCalculatedAt} · 结果单位{' '}
              {analysis.functionalUnit}
            </div>
          </div>
        </div>
      </Card>

      {/* 变更情景 */}
      <Card
        bordered
        title="变更情景"
        actions={
          stale ? (
            <span className="sa-card-tip">来源数据已更新，请先更新基准</span>
          ) : (
            <Button variant="dashed" onClick={() => void handleAddScenario()}>
              + 新增敏感性分析情景
            </Button>
          )
        }
      >
        <Table
          rowKey="id"
          data={analysis.scenarios}
          columns={scenarioColumns}
          loading={loading}
          size="small"
          empty="暂无变更情景，点击右上角「+ 新增敏感性分析情景」创建"
        />
      </Card>

      {/* 情景对比 */}
      {compareRows.length > 0 ? (
        <Card bordered title="情景对比" actions={<span className="sa-card-tip">按 |变化率| 降序</span>}>
          <Table rowKey="id" data={compareRows} columns={compareColumns} size="small" />
        </Card>
      ) : null}

      {/* 填写情景数据抽屉 */}
      {drawerScenario ? (
        <ScenarioDataDrawer
          analysis={analysis}
          scenario={drawerScenario}
          caliber={caliber}
          onClose={() => setDrawerScenarioId(null)}
          onCalculated={reload}
        />
      ) : null}

      {/* 删除情景确认 */}
      <Dialog
        visible={!!deleteScenarioTarget}
        header="确认删除情景"
        width="440px"
        theme="danger"
        onClose={() => setDeleteScenarioTarget(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteScenarioTarget(null)}>
              取消
            </Button>
            <Button theme="danger" onClick={() => void handleDeleteScenario()}>
              确认删除
            </Button>
          </>
        }
      >
        删除后不可恢复，该情景的结果将一并移除。
        {deleteScenarioTarget ? `确认删除「情景 ${deleteScenarioTarget.seq}」？` : ''}
      </Dialog>

      {/* 更新基准确认 */}
      <Dialog
        visible={updateBaselineOpen}
        header="更新基准"
        width="480px"
        onClose={() => setUpdateBaselineOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setUpdateBaselineOpen(false)}>
              取消
            </Button>
            <Button theme="primary" loading={updating} onClick={() => void handleUpdateBaseline()}>
              确认更新
            </Button>
          </>
        }
      >
        更新基准将同步最新核算结果并清空全部情景结果，需重新核算。确认更新？
      </Dialog>
    </div>
  )
}

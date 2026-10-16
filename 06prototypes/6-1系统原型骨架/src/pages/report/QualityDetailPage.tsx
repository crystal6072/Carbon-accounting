import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Dialog,
  Input,
  MessagePlugin,
  Popconfirm,
  RadioGroup,
  Radio,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Textarea,
  Tooltip,
} from 'tdesign-react'
import {
  batchAssess,
  confirmQualitative,
  deleteQualityAssessment,
  fetchQualityDetail,
  saveConclusion,
  saveQualitative,
  scoreItem,
  updateBaseline,
} from '@/mock/quality'
import type { PedigreeScoreKey, QualityAssessment, QualityAssessmentItem } from '@/types/quality'
import type { PcfCaliberKey } from '@/types'
import {
  DQR_LEVEL_TEXT,
  DQR_LEVEL_THEME,
  PEDIGREE_DIMS,
  PEDIGREE_KEYS,
  defaultDims,
  formatDqr,
  formatUncertainty,
  pickDims,
} from './qualityMeta'
import './QualityPage.css'

const CALIBER_OPTIONS: Array<{ value: PcfCaliberKey; label: string }> = [
  { value: 'total', label: '总量（不含生物源CO₂）' },
  { value: 'fossil', label: '化石' },
  { value: 'biogenic', label: '生物源（不含CO₂）' },
  { value: 'luluc', label: '直接土地利用变化' },
]

const STEP_TITLES = ['定性数据质量评价', '定量数据质量评价', '数据质量评价结果']

const DQR_DEFINITION =
  '数据质量评价是指：用来量化由于模型不确定性、输入不确定性和数据变动的累计而给生命周期清单分析结果带来的不确定性的系统化程序，并对可能引起偏差的原因进行定性描述。'

export default function QualityDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [assessment, setAssessment] = useState<QualityAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [caliber, setCaliber] = useState<PcfCaliberKey>('total')

  const [temporalCoverage, setTemporalCoverage] = useState('')
  const [geographicalCoverage, setGeographicalCoverage] = useState('')
  const [technologicalCoverage, setTechnologicalCoverage] = useState('')

  const [expandedId, setExpandedId] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [savingConclusion, setSavingConclusion] = useState(false)
  const [baseUpdateOpen, setBaseUpdateOpen] = useState(false)

  const reload = useCallback(async () => {
    try {
      const data = await fetchQualityDetail(id)
      setAssessment(data)
      setCaliber(data.caliber)
      setTemporalCoverage(data.qualitative.temporalCoverage)
      setGeographicalCoverage(data.qualitative.geographicalCoverage)
      setTechnologicalCoverage(data.qualitative.technologicalCoverage)
      setConclusion(data.result.conclusion)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  const editable = assessment?.status !== 'stale'
  const allScored = assessment ? assessment.items.every((item) => item.score) : false
  const itemDistribution = assessment?.result.itemDistribution ?? []

  /* 步骤① 定性确认 */
  const handleQualitativeNext = async () => {
    if (!assessment) return
    try {
      await saveQualitative(assessment.id, { temporalCoverage, geographicalCoverage, technologicalCoverage })
      await confirmQualitative(assessment.id)
      MessagePlugin.success('定性确认完成')
      await reload()
      setStep(1)
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '操作失败')
    }
  }

  /* 批量评估 */
  const runBatch = async () => {
    if (!assessment) return
    try {
      await batchAssess(assessment.id)
      MessagePlugin.success(`已批量评估 ${assessment.items.length} 项数据`)
      await reload()
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '批量评估失败')
    }
  }

  const hasScored = assessment ? assessment.items.some((item) => item.score) : false

  /* 单项评分 */
  const handleScore = async (dataItemId: string, dim: PedigreeScoreKey, value: number) => {
    if (!assessment) return
    const item = assessment.items.find((row) => row.dataItemId === dataItemId)
    if (!item) return
    const base = item.score ? pickDims(item.score) : defaultDims()
    const next = { ...base, [dim]: value }
    try {
      await scoreItem(assessment.id, dataItemId, next)
      await reload()
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '评分失败')
    }
  }

  /* 步骤② 前置：全部评分 */
  const handleQuantitativeNext = () => {
    if (!allScored) {
      MessagePlugin.warning(`还有 ${assessment?.items.filter((item) => !item.score).length} 项数据未评估`)
      return
    }
    setStep(2)
  }

  const handleSaveConclusion = async () => {
    if (!assessment) return
    setSavingConclusion(true)
    try {
      await saveConclusion(assessment.id, conclusion)
      MessagePlugin.success('结论已保存')
      await reload()
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSavingConclusion(false)
    }
  }

  const handleUpdateBaseline = async () => {
    if (!assessment) return
    try {
      await updateBaseline(assessment.id)
      MessagePlugin.success('基准已更新，请重新评估')
      setBaseUpdateOpen(false)
      setStep(0)
      await reload()
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '更新失败')
    }
  }

  const handleDelete = async () => {
    if (!assessment) return
    try {
      await deleteQualityAssessment(assessment.id)
      MessagePlugin.success('删除成功')
      navigate('/report/quality')
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleExport = () => {
    if (!assessment) return
    exportQualityResult(assessment)
    MessagePlugin.success('结果已导出')
  }

  if (loading) {
    return (
      <div className="q-page">
        <div className="q-page-head">
          <div className="q-breadcrumb">碳足迹 / 数据质量评价</div>
        </div>
        <Card bordered>加载中…</Card>
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="q-page">
        <div className="q-page-head">
          <div className="q-breadcrumb">碳足迹 / 数据质量评价</div>
        </div>
        <Card bordered>
          <Alert theme="error" message={error || '数据质量评价不存在'} />
          <div className="q-breadcrumb" style={{ marginTop: 16 }}>
            <a className="q-link" onClick={() => navigate('/report/quality')}>
              返回列表
            </a>
          </div>
        </Card>
      </div>
    )
  }

  const columns = [
    { colKey: 'stagePath', title: '生命周期二级阶段', width: 220, cell: ({ row }: { row: QualityAssessmentItem }) => row.stagePath },
    { colKey: 'name', title: '数据名称', width: 220, cell: ({ row }: { row: QualityAssessmentItem }) => row.name },
    {
      colKey: 'dqrCell',
      title: '数据质量评估',
      width: 240,
      cell: ({ row }: { row: QualityAssessmentItem }) =>
        row.score && row.dqr != null ? (
          <span className="q-num">
            DQR {formatDqr(row.dqr)} ·{' '}
            <Tag theme={DQR_LEVEL_THEME[row.level ?? 'fair']} variant="light">
              {DQR_LEVEL_TEXT[row.level ?? 'fair']}
            </Tag>
          </span>
        ) : (
          <a className="q-link" onClick={() => setExpandedId(row.dataItemId === expandedId ? '' : row.dataItemId)}>
            评估
          </a>
        ),
    },
    {
      colKey: 'op',
      title: '评估',
      width: 90,
      cell: ({ row }: { row: QualityAssessmentItem }) => (
        <a
          className={`q-link ${row.score ? '' : 'q-link-muted'}`}
          onClick={() => setExpandedId(row.dataItemId === expandedId ? '' : row.dataItemId)}
        >
          {row.dataItemId === expandedId ? '收起' : '展开'}
        </a>
      ),
    },
  ]

  return (
    <div className="q-page">
      <div className="q-page-head">
        <div className="q-breadcrumb">
          <a className="q-link" onClick={() => navigate('/report/quality')}>
            碳足迹 / 数据质量评价
          </a>{' '}
          / {assessment.assessmentNo}
        </div>
        <h2 className="q-page-title">
          {assessment.sourceProjectName} 数据质量评价
          {assessment.status === 'stale' ? (
            <Tag theme="warning" variant="light" style={{ marginLeft: 12 }}>
              待更新
            </Tag>
          ) : null}
        </h2>
        <p className="q-definition">{DQR_DEFINITION}</p>
      </div>

      <div className="q-steps-wrap">
        <Steps current={step} options={STEP_TITLES.map((title) => ({ title }))} onChange={(value) => {
          const target = Number(value)
          if (target <= step) setStep(target)
        }} />
      </div>

      <Card bordered className="q-caliber-bar">
        <Space size="large">
          <Space size="small">
            <span className="q-field-label">影响评价方法</span>
            <Input value={assessment.lciaMethod} readonly style={{ width: 160 }} />
          </Space>
          <Space size="small">
            <span className="q-field-label">评价指标</span>
            {assessment.hasGwpSplit ? (
              <Select
                value={caliber}
                options={CALIBER_OPTIONS}
                style={{ width: 220 }}
                onChange={(value) => setCaliber(value as PcfCaliberKey)}
              />
            ) : (
              <Input value={CALIBER_OPTIONS[0].label} readonly style={{ width: 220 }} />
            )}
          </Space>
        </Space>
      </Card>

      {assessment.status === 'stale' ? (
        <Alert
          theme="warning"
          className="q-stale-alert"
          message={`来源核算数据已更新（基准版本 V${assessment.baselineVersion} → V${assessment.baselineVersion + 1}），当前评价结论可能失效。`}
          operation={
            <Button size="small" theme="primary" onClick={() => setBaseUpdateOpen(true)}>
              更新基准
            </Button>
          }
        />
      ) : null}

      {/* ============ 步骤① 定性数据质量评价 ============ */}
      {step === 0 ? (
        <Card bordered title="定性数据质量评价" className="q-step-card">
          <FormLike label="时间覆盖范围">
            <Textarea
              value={temporalCoverage}
              onChange={(value) => setTemporalCoverage(String(value ?? ''))}
              autosize={{ minRows: 2 }}
              maxlength={500}
              disabled={!editable}
            />
          </FormLike>
          <FormLike label="地理覆盖范围">
            <Textarea
              value={geographicalCoverage}
              onChange={(value) => setGeographicalCoverage(String(value ?? ''))}
              autosize={{ minRows: 2 }}
              maxlength={500}
              disabled={!editable}
            />
          </FormLike>
          <FormLike label="技术覆盖范围">
            <Textarea
              value={technologicalCoverage}
              onChange={(value) => setTechnologicalCoverage(String(value ?? ''))}
              autosize={{ minRows: 2 }}
              maxlength={500}
              disabled={!editable}
            />
          </FormLike>
        </Card>
      ) : null}

      {/* ============ 步骤② 定量数据质量评价 ============ */}
      {step === 1 ? (
        <Card
          bordered
          title="定量数据质量评价"
          className="q-step-card"
          actions={
            editable ? (
              hasScored ? (
                <Popconfirm content="将覆盖全部已评分项，确认重新批量评估？" onConfirm={runBatch}>
                  <Button theme="primary">批量评估</Button>
                </Popconfirm>
              ) : (
                <Button theme="primary" onClick={runBatch}>
                  批量评估
                </Button>
              )
            ) : null
          }
        >
          <Table
            rowKey="dataItemId"
            data={assessment.items}
            columns={columns}
            size="small"
            expandedRowKeys={expandedId ? [expandedId] : []}
            onExpandChange={(keys) => setExpandedId(Array.isArray(keys) && keys.length ? String(keys[0]) : '')}
            expandedRow={({ row }) => <ScorePanel item={row} disabled={!editable} onScore={handleScore} />}
          />
        </Card>
      ) : null}

      {/* ============ 步骤③ 数据质量评价结果 ============ */}
      {step === 2 ? (
        <div className="q-result">
          <Card bordered className="q-result-overview">
            <div className="q-result-stat">
              <Statistic title="整体 DQR" value={assessment.overallDqr ?? 0} />
              {assessment.overallLevel ? (
                <Tag theme={DQR_LEVEL_THEME[assessment.overallLevel]} variant="light" style={{ marginLeft: 8 }}>
                  {DQR_LEVEL_TEXT[assessment.overallLevel]}
                </Tag>
              ) : null}
            </div>
            <Statistic title="整体不确定度" value={assessment.overallUncertainty ?? 0} prefix="±" suffix="%" />
            <Statistic title="参评数据项" value={assessment.itemCount} suffix=" 项" />
            <div className="q-result-levels">
              <Tag theme="success" variant="light">优 {assessment.result.levelDistribution.excellent}</Tag>
              <Tag theme="success" variant="light">良 {assessment.result.levelDistribution.good}</Tag>
              <Tag theme="warning" variant="light">中 {assessment.result.levelDistribution.fair}</Tag>
              <Tag theme="warning" variant="light">差 {assessment.result.levelDistribution.poor}</Tag>
              <Tag theme="danger" variant="light">极差 {assessment.result.levelDistribution.veryPoor}</Tag>
            </div>
          </Card>

          <div className="q-result-grid">
            <Card bordered title="按阶段分布">
              <Table
                rowKey="stage"
                data={assessment.result.stageDistribution}
                size="small"
                columns={[
                  { colKey: 'stage', title: '阶段', width: 140 },
                  {
                    colKey: 'dqr',
                    title: 'DQR',
                    width: 90,
                    cell: ({ row }: { row: (typeof assessment.result.stageDistribution)[number] }) => (
                      <span>
                        {formatDqr(row.dqr)} ·{' '}
                        <Tag theme={DQR_LEVEL_THEME[row.level]} variant="light">
                          {DQR_LEVEL_TEXT[row.level]}
                        </Tag>
                      </span>
                    ),
                  },
                  { colKey: 'contribution', title: '贡献率', width: 90, cell: ({ row }: any) => `${row.contribution}%` },
                  { colKey: 'itemCount', title: '项数', width: 80, cell: ({ row }: any) => row.itemCount },
                ]}
              />
            </Card>
            <Card bordered title="按数据项分布（DQR 降序）">
              <Table
                rowKey="dataItemId"
                data={itemDistribution}
                size="small"
                columns={[
                  { colKey: 'name', title: '数据项', width: 160 },
                  {
                    colKey: 'dqr',
                    title: 'DQR',
                    width: 110,
                    cell: ({ row }: { row: (typeof itemDistribution)[number] }) => (
                      <span>
                        {formatDqr(row.dqr)} ·{' '}
                        <Tag theme={DQR_LEVEL_THEME[row.level]} variant="light">
                          {DQR_LEVEL_TEXT[row.level]}
                        </Tag>
                      </span>
                    ),
                  },
                  { colKey: 'contribution', title: '贡献率', width: 90, cell: ({ row }: any) => `${row.contribution}%` },
                  { colKey: 'uncertainty', title: '不确定度', width: 100, cell: ({ row }: any) => formatUncertainty(row.uncertainty) },
                ]}
              />
            </Card>
          </div>

          <Card bordered title="按数据类别分布（活动数据 vs 因子）" className="q-step-card">
            <Descriptions column={2} bordered size="small">
              <Descriptions.DescriptionsItem label="活动数据">
                DQR {formatDqr(assessment.result.categoryDistribution.activity.dqr)}（{assessment.result.categoryDistribution.activity.count} 项）
              </Descriptions.DescriptionsItem>
              <Descriptions.DescriptionsItem label="因子（背景数据）">
                DQR {formatDqr(assessment.result.categoryDistribution.factor.dqr)}（{assessment.result.categoryDistribution.factor.count} 项）
              </Descriptions.DescriptionsItem>
            </Descriptions>
            {assessment.result.keySources.length ? (
              <div className="q-key-sources">
                关键不确定度来源：
                {assessment.result.keySources.map((source) => (
                  <Tag key={source.dataItemId} theme="danger" variant="light" style={{ marginLeft: 8 }}>
                    {source.name}（贡献 {source.contribution}% · ±{source.uncertainty}%）
                  </Tag>
                ))}
              </div>
            ) : null}
          </Card>

          <Card bordered title="结论（可编辑，选填）" className="q-step-card" actions={
            <Button variant="outline" loading={savingConclusion} onClick={handleSaveConclusion}>
              保存结论
            </Button>
          }>
            <Textarea value={conclusion} onChange={(value) => setConclusion(String(value ?? ''))} autosize={{ minRows: 2 }} maxlength={500} />
          </Card>
        </div>
      ) : null}

      {/* ============ 底部操作栏 ============ */}
      <div className="q-action-bar">
        <Space>
          <Button variant="outline" onClick={() => navigate('/report/quality')}>
            返回
          </Button>
        </Space>
        <Space>
          {step === 1 ? (
            <Button variant="outline" onClick={() => setStep(0)}>
              上一步
            </Button>
          ) : null}
          {step === 0 ? (
            <Button theme="primary" disabled={!editable} onClick={handleQualitativeNext}>
              下一步
            </Button>
          ) : null}
          {step === 1 ? (
            <Button theme="primary" onClick={handleQuantitativeNext}>
              下一步
            </Button>
          ) : null}
          {step === 2 ? (
            <Button theme="primary" onClick={handleExport}>
              导出结果
            </Button>
          ) : null}
        </Space>
      </div>

      {/* 更新基准二次确认 */}
      <Dialog
        visible={baseUpdateOpen}
        header="更新基准"
        width="480px"
        onClose={() => setBaseUpdateOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setBaseUpdateOpen(false)}>
              取消
            </Button>
            <Button theme="primary" onClick={handleUpdateBaseline}>
              确认更新
            </Button>
          </>
        }
      >
        更新基准将同步最新核算结果并清空全部评分，需重新评估。确认更新？
      </Dialog>
    </div>
  )
}

/* 单项评分面板（展开行） */
function ScorePanel({
  item,
  disabled,
  onScore,
}: {
  item: QualityAssessmentItem
  disabled: boolean
  onScore: (dataItemId: string, dim: PedigreeScoreKey, value: number) => void
}) {
  const score = item.score
  return (
    <div className="q-score-panel">
      <div className="q-score-dims">
        {PEDIGREE_DIMS.map((dim) => (
          <div className="q-score-dim" key={dim.key}>
            <Tooltip content={dim.tips}>
              <span className="q-score-dim-label">{dim.label}</span>
            </Tooltip>
            <RadioGroup
              value={score ? score[dim.key] : undefined}
              disabled={disabled}
              onChange={(value) => onScore(item.dataItemId, dim.key, Number(value))}
              variant="default-filled"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Radio key={n} value={n}>
                  {n}
                </Radio>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
      <Descriptions column={2} size="small" className="q-score-basis">
        <Descriptions.DescriptionsItem label="数据来源">{item.dataSource || '未登记'}</Descriptions.DescriptionsItem>
        <Descriptions.DescriptionsItem label="数据凭证">{item.hasVoucher ? '有' : '无'}</Descriptions.DescriptionsItem>
        <Descriptions.DescriptionsItem label="因子来源">{item.factorSource || '无背景因子'}</Descriptions.DescriptionsItem>
        <Descriptions.DescriptionsItem label="统计时间">{item.stage}</Descriptions.DescriptionsItem>
      </Descriptions>
      <div className="q-score-result">
        {item.dqr != null ? (
          <span className="q-num">
            本项 DQR = {formatDqr(item.dqr)}（{item.level ? DQR_LEVEL_TEXT[item.level] : '-'}） | 不确定度{' '}
            {formatUncertainty(item.uncertainty)}
          </span>
        ) : (
          <span className="q-empty-cell">未评分</span>
        )}
      </div>
    </div>
  )
}

/* 简单表单行容器（无 tdesign Form 布局依赖） */
function FormLike({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="q-form-like">
      <div className="q-form-like-label">{label}</div>
      <div className="q-form-like-control">{children}</div>
    </div>
  )
}

/* 导出 CSV（演示，P1） */
function exportQualityResult(assessment: QualityAssessment) {
  const header = [
    '数据项',
    '阶段',
    ...PEDIGREE_DIMS.map((dim) => dim.label),
    'DQR',
    '等级',
    '不确定度(%)',
    '贡献率(%)',
  ]
  const rows = assessment.items.map((item) => [
    item.name,
    item.stagePath,
    ...PEDIGREE_KEYS.map((key) => item.score?.[key] ?? ''),
    item.dqr ?? '',
    item.level ? DQR_LEVEL_TEXT[item.level] : '',
    item.uncertainty ?? '',
    item.contribution,
  ])
  const summary = [
    [],
    ['整体 DQR', formatDqr(assessment.overallDqr)],
    ['整体等级', assessment.overallLevel ? DQR_LEVEL_TEXT[assessment.overallLevel] : ''],
    ['整体不确定度(%)', formatUncertainty(assessment.overallUncertainty)],
    ['评价编号', assessment.assessmentNo],
    ['来源核算项目', assessment.sourceProjectName],
  ]
  const csv = [header, ...rows, ...summary]
    .map((line) => line.map((cell) => `"${String(cell)}"`).join(','))
    .join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${assessment.assessmentNo}-数据质量评价结果.csv`
  link.click()
  URL.revokeObjectURL(url)
}

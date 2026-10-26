import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Checkbox,
  Card,
  Dialog,
  Input,
  MessagePlugin,
  Pagination,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Textarea,
} from 'tdesign-react'
import { ChevronLeftIcon, ChevronRightIcon } from 'tdesign-icons-react'
import {
  confirmQualitative,
  deleteQualityAssessment,
  fetchQualityDetail,
  saveQualitative,
  scoreItem,
  switchCaliber,
  updateBaseline,
} from '@/mock/quality'
import type { PedigreeScore, PedigreeScoreKey, QualitativeTexts, QualityAssessment, QualityAssessmentItem } from '@/types/quality'
import type { PcfCaliberKey } from '@/types'
import {
  DQR_LEVEL_TEXT,
  DQR_LEVEL_THEME,
  PEDIGREE_DIMS,
  PEDIGREE_KEYS,
  defaultDims,
  dqrLevelOf,
  dqrOf,
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

/** 步骤① 定性数据质量评价维度（字段清单 §3，共 9 项） */
const QUALITATIVE_FIELDS: Array<{ key: keyof QualitativeTexts; label: string }> = [
  { key: 'temporalCoverage', label: '时间覆盖范围' },
  { key: 'geographicalCoverage', label: '地理覆盖范围' },
  { key: 'technologicalCoverage', label: '技术覆盖范围' },
  { key: 'completeness', label: '完整性' },
  { key: 'representativeness', label: '代表性' },
  { key: 'consistency', label: '一致性' },
  { key: 'reproducibility', label: '再现性' },
  { key: 'dataSource', label: '数据来源' },
  { key: 'informationUncertainty', label: '信息的不确定性' },
]

const EMPTY_QUALITATIVE_TEXTS: QualitativeTexts = {
  temporalCoverage: '',
  geographicalCoverage: '',
  technologicalCoverage: '',
  completeness: '',
  representativeness: '',
  consistency: '',
  reproducibility: '',
  dataSource: '',
  informationUncertainty: '',
}

/** 弹窗评分草稿（不含评分来源） */
type DraftScore = Omit<PedigreeScore, 'scoreSource'>

/** 结果数据项列表分页大小 */
const RESULT_PAGE_SIZE = 10

/** 排放量格式化（最多 4 位小数，去掉多余的 0） */
function formatEmission(value: number): string {
  if (!value) return '0'
  return value.toFixed(4).replace(/\.?0+$/, '')
}

export default function QualityDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  /** 查看模式（列表「查看」进入，仅浏览不可编辑）；默认为编辑模式 */
  const viewOnly = searchParams.get('mode') === 'view'

  const [assessment, setAssessment] = useState<QualityAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [caliber, setCaliber] = useState<PcfCaliberKey>('total')

  const [qualitativeForm, setQualitativeForm] = useState<QualitativeTexts>(EMPTY_QUALITATIVE_TEXTS)

  /** 评分弹窗：待评分数据项列表（单项评价 1 项 / 批量评估 N 项）+ 每项草稿 */
  const [scoreItems, setScoreItems] = useState<string[]>([])
  const [scoreIndex, setScoreIndex] = useState(0)
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, DraftScore>>({})
  /** 本次评分会话中已打分（或已有评分）的数据项，用于完成进度 */
  const [scoreTouched, setScoreTouched] = useState<string[]>([])
  const [savingScores, setSavingScores] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  /** 结果页数据项分页 */
  const [resultPage, setResultPage] = useState(1)
  const [skipQuantitative, setSkipQuantitative] = useState(false)
  const [baseUpdateOpen, setBaseUpdateOpen] = useState(false)

  const reload = useCallback(async () => {
    try {
      const data = await fetchQualityDetail(id)
      setAssessment(data)
      setCaliber(data.caliber)
      const { confirmed: _c, confirmedBy: _b, confirmedAt: _a, ...texts } = data.qualitative
      setQualitativeForm(texts)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  /* 切换指标口径时结果分页回到首页 */
  useEffect(() => {
    setResultPage(1)
  }, [caliber])

  const editable = !viewOnly && assessment?.status !== 'stale'
  const allScored = assessment ? assessment.items.every((item) => item.score) : false
  /** 当前指标口径下的排放量合计 */
  const currentEmission = assessment?.items.reduce((acc, item) => acc + item.emission, 0) ?? 0
  /** 结果页数据项分页 */
  const pagedResultItems = (assessment?.items ?? []).slice(
    (resultPage - 1) * RESULT_PAGE_SIZE,
    resultPage * RESULT_PAGE_SIZE,
  )
  /** 评分弹窗派生状态 */
  const currentScoreId = scoreItems[scoreIndex] ?? ''
  const currentScoreItem = assessment?.items.find((item) => item.dataItemId === currentScoreId) ?? null
  const currentDraft = scoreDrafts[currentScoreId] ?? defaultDims()
  const currentPreviewScore: PedigreeScore = { ...currentDraft, scoreSource: 'manual' }
  const currentPreviewDqr = dqrOf(currentPreviewScore)
  /** 待保存的评分：本次会话已打分，或原本已有评分 */
  const pendingScoreEntries = Object.entries(scoreDrafts).filter(
    ([id]) =>
      scoreTouched.includes(id) ||
      assessment?.items.find((item) => item.dataItemId === id)?.score,
  )

  /** 多选列（tdesign Table 勾选通过 columns 中 type='multiple' 的列实现） */
  const selectColumn = { colKey: 'row-select', type: 'multiple' as const, width: 56, title: '选择' }

  /** 结果页数据项列（序号按分页连续） */
  const resultColumns = [
    {
      colKey: 'seq',
      title: '序号',
      width: 64,
      cell: ({ rowIndex }: { rowIndex: number }) => (resultPage - 1) * RESULT_PAGE_SIZE + rowIndex + 1,
    },
    { colKey: 'stagePath', title: '生命周期二级阶段', width: 220, cell: ({ row }: { row: QualityAssessmentItem }) => row.stagePath },
    { colKey: 'name', title: '数据名称', width: 180, cell: ({ row }: { row: QualityAssessmentItem }) => row.name },
    {
      colKey: 'emission',
      title: '排放量(kgCO₂e)',
      width: 150,
      cell: ({ row }: { row: QualityAssessmentItem }) => formatEmission(row.emission),
    },
    {
      colKey: 'contribution',
      title: '贡献率',
      width: 100,
      cell: ({ row }: { row: QualityAssessmentItem }) => `${row.contribution}%`,
    },
    {
      colKey: 'dqr',
      title: '数据质量 DQR',
      cell: ({ row }: { row: QualityAssessmentItem }) =>
        row.score && row.dqr != null ? (
          <span>
            {formatDqr(row.dqr)} ·{' '}
            <Tag theme={DQR_LEVEL_THEME[row.level ?? 'fair']} variant="light">
              {DQR_LEVEL_TEXT[row.level ?? 'fair']}
            </Tag>
          </span>
        ) : (
          <span className="q-empty-cell">未评价</span>
        ),
    },
  ]

  /* 步骤① 定性确认 */
  const handleQualitativeNext = async () => {
    if (!assessment) return
    try {
      await saveQualitative(assessment.id, qualitativeForm)
      await confirmQualitative(assessment.id)
      MessagePlugin.success('定性确认完成')
      await reload()
      setStep(1)
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '操作失败')
    }
  }

  /* 批量评估：对勾选数据项逐项打分（弹窗评分会话） */
  const runBatch = () => {
    if (!assessment) return
    if (!selectedKeys.length) {
      MessagePlugin.warning('请先勾选需要批量评估的数据项')
      return
    }
    openScoreDialog(selectedKeys)
  }

  /** 打开评分弹窗（ids：单项评价 1 项，或批量评估 N 项） */
  const openScoreDialog = (ids: string[]) => {
    if (!assessment || !ids.length) return
    const drafts: Record<string, DraftScore> = {}
    ids.forEach((id) => {
      const item = assessment.items.find((row) => row.dataItemId === id)
      drafts[id] = item?.score ? pickDims(item.score) : defaultDims()
    })
    setScoreDrafts(drafts)
    setScoreTouched(ids.filter((id) => assessment.items.find((row) => row.dataItemId === id)?.score))
    setScoreItems(ids)
    setScoreIndex(0)
  }

  /* 草稿修改（弹窗内每次点击记录进度） */
  const handleDraftChange = (dim: PedigreeScoreKey, value: number) => {
    const id = currentScoreId
    if (!id) return
    setScoreDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [dim]: value } }))
    setScoreTouched((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  /* 保存评分会话：逐项提交 */
  const handleSaveScores = async () => {
    if (!assessment || !pendingScoreEntries.length) return
    setSavingScores(true)
    try {
      for (const [itemId, draft] of pendingScoreEntries) {
        await scoreItem(assessment.id, itemId, draft)
      }
      MessagePlugin.success(`已保存 ${pendingScoreEntries.length} 项数据质量评分`)
      setScoreItems([])
      setSelectedKeys([])
      await reload()
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '评分保存失败')
    } finally {
      setSavingScores(false)
    }
  }

  /* 步骤② 前置：全部评分（支持跳过定量评价直接进入结果） */
  const handleQuantitativeNext = () => {
    if (skipQuantitative) {
      setStep(2)
      return
    }
    if (!allScored) {
      MessagePlugin.warning(`还有 ${assessment?.items.filter((item) => !item.score).length} 项数据未评估`)
      return
    }
    setStep(2)
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

  /* 切换评价指标口径：加载该指标对应的数据并重算结果 */
  const handleCaliberChange = async (value: unknown) => {
    const next = value as PcfCaliberKey
    if (!assessment || next === assessment.caliber) return
    setCaliber(next)
    try {
      await switchCaliber(assessment.id, next)
      await reload()
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '切换指标失败')
    }
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
          <span className="q-empty-cell">未评价</span>
        ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 90,
      cell: ({ row }: { row: QualityAssessmentItem }) => (
        <a className="q-link" onClick={() => openScoreDialog([row.dataItemId])}>
          {row.score ? '重新评价' : '评价'}
        </a>
      ),
    },
  ]

  return (
    <div className="q-page">
      <div className="q-page-head">
        <div className="q-breadcrumb">
          数据质量评价 / {assessment.assessmentNo}
        </div>
        <h2 className="q-page-title">
          {assessment.sourceProjectName} 数据质量评价
          {viewOnly ? (
            <Tag theme="default" variant="light" style={{ marginLeft: 12 }}>
              仅查看
            </Tag>
          ) : null}
          {assessment.status === 'stale' ? (
            <Tag theme="warning" variant="light" style={{ marginLeft: 12 }}>
              待更新
            </Tag>
          ) : null}
        </h2>
      </div>

      <div className="q-steps-wrap" data-ann-target="dq.detail.steps">
        <Steps current={step} options={STEP_TITLES.map((title) => ({ title }))} onChange={(value) => {
          const target = Number(value)
          if (viewOnly || target <= step) setStep(target)
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
                onChange={handleCaliberChange}
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
          data-ann-target="dq.detail.alert"
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
      <Card bordered title="定性数据质量评价" className="q-step-card" data-ann-target="dq.detail.step1">
          {QUALITATIVE_FIELDS.map((field) => (
            <FormLike key={field.key} label={field.label}>
              <Textarea
                value={qualitativeForm[field.key]}
                onChange={(value) => setQualitativeForm((prev) => ({ ...prev, [field.key]: String(value ?? '') }))}
                autosize={{ minRows: 2 }}
                maxlength={500}
                disabled={!editable}
              />
            </FormLike>
          ))}
        </Card>
      ) : null}

      {/* ============ 步骤② 定量数据质量评价 ============ */}
      {step === 1 ? (
      <Card bordered title="定量数据质量评价" className="q-step-card" data-ann-target="dq.detail.step2">
          {editable ? (
            <Checkbox
              checked={skipQuantitative}
              onChange={(value) => setSkipQuantitative(Boolean(value))}
              className="q-skip-quantitative"
            >
              本次不做定量数据质量评价（直接生成结果，仅保留定性覆盖范围说明）
            </Checkbox>
          ) : null}
          {skipQuantitative ? (
            <Alert theme="info" className="q-skip-tip" message="已选择跳过定量评价：将直接进入结果页，不计算各数据项 DQR 与整体不确定度。" />
          ) : null}
          {editable ? (
            <div className="q-batch-bar">
              <span className="q-batch-count">
                已选 <b>{selectedKeys.length}</b> / {assessment.items.length} 项
              </span>
              <Space size="small">
                <Button variant="outline" size="small" disabled={!selectedKeys.length} onClick={() => setSelectedKeys([])}>
                  清除选择
                </Button>
                <Button theme="primary" size="small" disabled={!selectedKeys.length} onClick={runBatch}>
                  批量评估
                </Button>
              </Space>
            </div>
          ) : null}
          <Table
            rowKey="dataItemId"
            data={assessment.items}
            columns={editable ? [selectColumn, ...columns] : columns}
            size="small"
            selectedRowKeys={selectedKeys}
            onSelectChange={(keys) => setSelectedKeys((keys as Array<string | number>).map(String))}
          />
        </Card>
      ) : null}

      {/* ============ 步骤③ 数据质量评价结果（结果随评价指标切换） ============ */}
      {step === 2 ? (
        <div className="q-result" data-ann-target="dq.detail.step3">
          {/* ---- 定性数据质量评价 ---- */}
          <Card bordered title="定性数据质量评价" className="q-step-card">
            <div className="q-qual-result">
              {QUALITATIVE_FIELDS.map((field) => (
                <div className="q-qual-row" key={field.key}>
                  <span className="q-qual-label">{field.label}</span>
                  <span className="q-qual-text">{qualitativeForm[field.key] || '未填写'}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ---- 定量数据质量评价 ---- */}
          <Card bordered title="定量数据质量评价" className="q-step-card">
            {assessment.items.every((item) => !item.score) ? (
              <Alert
                theme="warning"
                className="q-result-empty"
                message="尚未进行任何定量数据质量评价，以下结果仅基于定性覆盖范围说明，未计算 DQR 与不确定度。"
              />
            ) : null}
            <div className="q-quant-banner">
              <div className="q-quant-banner-main">
                <span className="q-quant-banner-name">{assessment.sourceProjectName}</span>
                <span className="q-quant-banner-sub">
                  {assessment.assessmentNo} · {assessment.productName} · {assessment.functionalUnit} ·{' '}
                  {CALIBER_OPTIONS.find((opt) => opt.value === caliber)?.label}
                </span>
              </div>
              <div className="q-quant-banner-stats">
                <span className="q-quant-stat">
                  碳足迹结果 <b>{formatEmission(currentEmission)}</b> kgCO₂e
                </span>
              </div>
            </div>
            <Table rowKey="dataItemId" data={pagedResultItems} columns={resultColumns} size="small" />
            <div className="q-pagination">
              <Pagination
                current={resultPage}
                total={assessment.items.length}
                pageSize={RESULT_PAGE_SIZE}
                onChange={(info: { current: number }) => setResultPage(info.current)}
              />
            </div>
          </Card>
        </div>
      ) : null}

      {/* ============ 底部操作栏（返回与下一步放在一起） ============ */}
      <div className="q-action-bar">
        <Space>
          <Button variant="outline" onClick={() => navigate('/report/quality')}>
            返回列表
          </Button>
          {step === 1 && !viewOnly ? (
            <Button variant="outline" onClick={() => setStep(0)}>
              上一步
            </Button>
          ) : null}
          {step === 0 && !viewOnly ? (
            <Button theme="primary" disabled={!editable} onClick={handleQualitativeNext}>
              下一步
            </Button>
          ) : null}
          {step === 1 && !viewOnly ? (
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

      {/* 数据质量评估弹窗：支持单项评价与批量评估（多数据项切换打分） */}
      <Dialog
        visible={scoreItems.length > 0}
        width="960px"
        header={
          <div className="q-sd-head">
            <span className="q-sd-title">数据质量评估</span>
            <div className="q-sd-head-meta">
              <div className="q-sd-nav">
                <Button
                  variant="text"
                  shape="circle"
                  size="small"
                  disabled={scoreIndex <= 0}
                  onClick={() => setScoreIndex((prev) => Math.max(0, prev - 1))}
                  icon={<ChevronLeftIcon />}
                />
                <span className="q-sd-name">{currentScoreItem?.name ?? '-'}</span>
                <Button
                  variant="text"
                  shape="circle"
                  size="small"
                  disabled={scoreIndex >= scoreItems.length - 1}
                  onClick={() => setScoreIndex((prev) => Math.min(scoreItems.length - 1, prev + 1))}
                  icon={<ChevronRightIcon />}
                />
              </div>
              <span className="q-sd-meta-item">
                完成进度：{scoreTouched.length} / {scoreItems.length}
              </span>
            </div>
          </div>
        }
        footer={
          <div className="q-sd-footer">
            <div className="q-sd-footer-info">
              <span>
                生命周期：<b>{currentScoreItem?.stagePath ?? '-'}</b>
              </span>
              <span>
                来源：<b>{currentScoreItem?.dataSource || '未登记'}</b>
              </span>
              <span>
                凭证：<b>{currentScoreItem?.hasVoucher ? '有' : '无'}</b>
              </span>
            </div>
            <div className="q-sd-footer-main">
              <span className="q-sd-dqr">
                当前评分 DQR <b className="q-sd-dqr-num">{formatDqr(currentPreviewDqr)}</b>
                （{DQR_LEVEL_TEXT[dqrLevelOf(currentPreviewDqr)]}）
              </span>
              <Button theme="success" loading={savingScores} disabled={!pendingScoreEntries.length} onClick={handleSaveScores}>
                确定
              </Button>
            </div>
          </div>
        }
        onClose={() => setScoreItems([])} data-ann-target="dq.detail.score"
      >
        {currentScoreItem ? (
          <>
            <div className="q-score-section">数据质量评价指标（点击行选择）</div>
            <ScoreMatrix draft={currentDraft} disabled={!editable} onChange={handleDraftChange} />
          </>
        ) : null}
      </Dialog>

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

/* 弹窗评分列表（版式对齐竞品）：每个指标一组，组内逐行展示 1–5 分判定标准，点击整行选择分值 */
function ScoreMatrix({
  draft,
  disabled,
  onChange,
}: {
  draft: DraftScore
  disabled: boolean
  onChange: (dim: PedigreeScoreKey, value: number) => void
}) {
  return (
    <div className="q-score-list">
      {PEDIGREE_DIMS.map((dim) => (
        <div className="q-slg-group" key={dim.key}>
          <div className="q-slg-label">
            <span className="q-slg-name">{dim.label}</span>
            <span className="q-slg-chosen">已选：{draft[dim.key]}分</span>
          </div>
          <div className="q-slg-rows">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`q-slg-row${draft[dim.key] === n ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
                onClick={() => {
                  if (!disabled) onChange(dim.key, n)
                }}
              >
                <Radio checked={draft[dim.key] === n} disabled={disabled} />
                <span className={`q-slg-radio${draft[dim.key] === n ? ' is-checked' : ''}`} />
                <span className={`q-slg-badge q-sm-c${n}`}>{n}分</span>
                <span className="q-slg-text">{dim.rubric[n - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
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

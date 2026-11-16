import { useCallback, useEffect, useMemo, useState } from 'react'
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
  submitQualityAssessment,
  switchCaliber,
  updateBaseline,
} from '@/mock/quality'
import type { PedigreeScore, PedigreeScoreKey, QualitativeTexts, QualityAssessment, QualityAssessmentItem } from '@/types/quality'
import { PCF_CALIBERS } from '@/types'
import type { PcfCaliberKey } from '@/types'
import {
  PEDIGREE_DIMS,
  convertCaliberEmission,
  defaultDims,
  dqrOf,
  formatDqr,
  pickDims,
} from './qualityMeta'
import './QualityPage.css'

/** 「评价指标」下拉：取全局统一口径文案，首项（总量）为默认选中项 */
const CALIBER_OPTIONS: Array<{ value: PcfCaliberKey; label: string }> = PCF_CALIBERS.map((item) => ({
  value: item.key,
  label: item.label,
}))

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
  /** 新增场景（列表「新增数据质量评价」创建后进入），末步主按钮用「创建」 */
  const isCreate = searchParams.get('mode') === 'create'

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
  /** 步骤③ 提交中 */
  const [saving, setSaving] = useState(false)
  /** 「下一步」保存 / 校验中 */
  const [nextLoading, setNextLoading] = useState(false)
  /** 是否存在未保存内容（用于离开确认） */
  const [dirty, setDirty] = useState(false)
  /** 离开二次确认 */
  const [leaveOpen, setLeaveOpen] = useState(false)
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
      setDirty(false)
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
  /**
   * 结果页展示用的数据项：查看模式切换评价指标时按口径比例派生排放量与贡献率，
   * 仅用于展示，不写回评价单（编辑模式由 switchCaliber 写回后 reload）。
   */
  const displayItems = useMemo<QualityAssessmentItem[]>(() => {
    if (!assessment) return []
    if (caliber === assessment.caliber) return assessment.items
    const converted = assessment.items.map((item) => ({
      ...item,
      emission: convertCaliberEmission(item.emission, assessment.caliber, caliber),
    }))
    const total = converted.reduce((acc, item) => acc + item.emission, 0)
    return converted.map((item) => ({
      ...item,
      contribution: total > 0 ? Math.round((item.emission / total) * 1000) / 10 : 0,
    }))
  }, [assessment, caliber])
  /** 当前展示口径下的排放量合计 */
  const currentEmission = displayItems.reduce((acc, item) => acc + item.emission, 0)
  /** 结果页数据项分页 */
  const pagedResultItems = displayItems.slice(
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
      title: <span data-ann-target="dq.detail.col.emission">排放量</span>,
      width: 150,
      cell: ({ row }: { row: QualityAssessmentItem }) =>
        `${formatEmission(row.emission)} ${assessment?.emissionUnit ?? 'kgCO₂e'}`,
    },
    {
      colKey: 'contribution',
      title: <span data-ann-target="dq.detail.col.contribution">贡献率</span>,
      width: 100,
      cell: ({ row }: { row: QualityAssessmentItem }) => `${row.contribution}%`,
    },
    {
      colKey: 'dqr',
      title: <span data-ann-target="dq.detail.col.dqr">数据质量 DQR</span>,
      cell: ({ row }: { row: QualityAssessmentItem }) =>
        row.score && row.dqr != null ? (
          <span className="q-num">{formatDqr(row.dqr)}</span>
        ) : (
          <span className="q-empty-cell">未评价</span>
        ),
    },
  ]

  /* 步骤① 定性确认：由「下一步」触发保存与校验 */
  const handleQualitativeNext = async () => {
    if (!assessment || nextLoading) return
    setNextLoading(true)
    try {
      await saveQualitative(assessment.id, qualitativeForm)
      await confirmQualitative(assessment.id)
      MessagePlugin.success('定性确认完成')
      await reload()
      setStep(1)
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setNextLoading(false)
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
    setDirty(true)
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

  /** 提交前校验全部步骤，失败时定位到第一个未通过的步骤 */
  const validateAllSteps = (): boolean => {
    if (!assessment) return false
    if (!assessment.qualitative.confirmed) {
      MessagePlugin.warning('请先完成定性数据质量评价')
      setStep(0)
      return false
    }
    if (!allScored && !skipQuantitative) {
      MessagePlugin.warning(`还有 ${assessment.items.filter((item) => !item.score).length} 项数据未评估`)
      setStep(1)
      return false
    }
    return true
  }

  /** 步骤③ 提交：校验全部步骤后保存并返回列表 */
  const handleSave = async () => {
    if (!assessment || saving || !validateAllSteps()) return
    setSaving(true)
    try {
      await submitQualityAssessment(assessment.id)
      MessagePlugin.success(isCreate ? '创建成功' : '保存成功')
      navigate('/report/quality')
    } catch (err) {
      MessagePlugin.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  /** 进入下一步：编辑模式先执行当前步骤的保存与校验，查看模式仅切换步骤 */
  const goNext = () => {
    if (viewOnly) {
      setStep(step + 1)
      return
    }
    if (step === 0) void handleQualitativeNext()
    else if (step === 1) handleQuantitativeNext()
  }

  /** 左侧取消/返回：查看模式直接返回；编辑模式有未保存内容时二次确认 */
  const handleLeave = () => {
    if (viewOnly || !dirty) {
      navigate('/report/quality')
      return
    }
    setLeaveOpen(true)
  }

  const confirmLeave = () => {
    setLeaveOpen(false)
    navigate('/report/quality')
  }

  /* 切换评价指标口径：查看模式仅派生展示数据；编辑模式写回后 reload */
  const handleCaliberChange = async (value: unknown) => {
    const next = value as PcfCaliberKey
    if (!assessment || next === caliber) return
    if (viewOnly) {
      setCaliber(next)
      return
    }
    setCaliber(next)
    try {
      await switchCaliber(assessment.id, next)
      await reload()
    } catch (err) {
      setCaliber(assessment.caliber)
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
      title: <span data-ann-target="dq.detail.step2.dqr">数据质量评估</span>,
      width: 240,
      cell: ({ row }: { row: QualityAssessmentItem }) =>
        row.score && row.dqr != null ? (
          <span className="q-num">DQR {formatDqr(row.dqr)}</span>
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
        <div className="q-page-head-main">
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
        {viewOnly ? (
          <Button variant="outline" onClick={() => navigate(`/report/quality/${id}`)}>
            编辑
          </Button>
        ) : null}
      </div>

      <div className="q-steps-wrap" data-ann-target="dq.detail.steps">
        <Steps current={step} options={STEP_TITLES.map((title) => ({ title }))} onChange={(value) => {
          const target = Number(value)
          if (viewOnly || target <= step) {
            setStep(target)
            return
          }
          goNext()
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
                style={{ width: 380 }}
                disabled={!viewOnly && !editable}
                onChange={handleCaliberChange}
              />
            ) : (
              <Input
                value={CALIBER_OPTIONS.find((opt) => opt.value === caliber)?.label ?? ''}
                readonly
                style={{ width: 380 }}
              />
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
            editable ? (
              <Button size="small" theme="primary" onClick={() => setBaseUpdateOpen(true)}>
                更新基准
              </Button>
            ) : undefined
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
                onChange={(value) => {
                  setQualitativeForm((prev) => ({ ...prev, [field.key]: String(value ?? '') }))
                  setDirty(true)
                }}
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
              onChange={(value) => {
                setSkipQuantitative(Boolean(value))
                setDirty(true)
              }}
              className="q-skip-quantitative"
            >
              本次不做定量数据质量评价（直接生成结果，仅保留定性覆盖范围说明）
            </Checkbox>
          ) : null}
          {skipQuantitative ? (
            <Alert theme="info" className="q-skip-tip" message="已选择跳过定量评价：将直接进入结果页，不计算各数据项 DQR。" />
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
            columns={editable ? [selectColumn, ...columns] : columns.filter((col) => col.colKey !== 'op')}
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
                message="尚未进行任何定量数据质量评价，以下结果仅基于定性覆盖范围说明，未计算 DQR。"
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
                  碳足迹结果 <b>{formatEmission(currentEmission)}</b> {assessment.emissionUnit}
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

      {/* ============ 底部操作栏：左侧取消/返回，右侧上一步 + 单一主按钮 ============ */}
      <div className="q-action-bar">
        <Button variant="outline" onClick={handleLeave}>
          {viewOnly ? '返回' : '取消'}
        </Button>
        <Space size="small">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          ) : null}
          {step < 2 ? (
            <Button
              theme="primary"
              className="q-action-primary"
              loading={nextLoading}
              disabled={!viewOnly && !editable}
              onClick={goNext}
            >
              下一步
            </Button>
          ) : viewOnly ? (
            <Button theme="primary" className="q-action-primary" onClick={() => navigate('/report/quality')}>
              完成
            </Button>
          ) : (
            <Button
              theme="primary"
              className="q-action-primary"
              loading={saving}
              disabled={!editable}
              onClick={handleSave}
            >
              {isCreate ? '创建' : '保存修改'}
            </Button>
          )}
        </Space>
      </div>

      {/* 数据质量评估弹窗：支持单项评价与批量评估（多数据项切换打分） */}
      <Dialog
        visible={scoreItems.length > 0}
        width="min(1180px, calc(100vw - 48px))"
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
              <span className="q-sd-dqr" data-ann-target="dq.detail.score.dqr">
                当前评分 DQR <b className="q-sd-dqr-num">{formatDqr(currentPreviewDqr)}</b>
              </span>
              <Button theme="success" loading={savingScores} disabled={!editable || !pendingScoreEntries.length} onClick={handleSaveScores}>
                确定
              </Button>
            </div>
          </div>
        }
        onClose={() => setScoreItems([])} data-ann-target="dq.detail.score"
      >
        {currentScoreItem ? (
          <>
            <div className="q-sd-group">
              <span className="q-sd-group-title">次级数据质量评估</span>
              <span className="q-sd-group-tip">点击分值下方对应的判定文字，即为该指标打分</span>
            </div>
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

      {/* 离开确认：仅在存在未保存内容时弹出 */}
      <Dialog
        visible={leaveOpen}
        header="确认离开"
        width="420px"
        onClose={() => setLeaveOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              继续编辑
            </Button>
            <Button theme="danger" onClick={confirmLeave}>
              确认离开
            </Button>
          </>
        }
      >
        离开后未保存内容将丢失，确认离开？
      </Dialog>
    </div>
  )
}

/** 评分矩阵分值列（1 最优 → 5 最差） */
const SCORE_LEVELS = [1, 2, 3, 4, 5]

/**
 * 评分矩阵（版式对齐竞品）：行 = 三项指标，列 = 1–5 分，
 * 每格为对应分值的判定标准全文，点击整格文字即选中该分值。
 */
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
    <div className="q-mx-wrap" data-ann-target="dq.detail.matrix">
      <div className="q-mx-table" role="table" aria-label="数据质量评价指标得分">
        <div className="q-mx-row q-mx-head-row" role="row">
          <div className="q-mx-corner" role="columnheader">指标得分</div>
          {SCORE_LEVELS.map((n) => (
            <div key={n} className={`q-mx-head q-mx-c${n}`} role="columnheader" aria-label={`${n} 分`}>
              <span className="q-mx-score">{n}</span>
            </div>
          ))}
        </div>

        {PEDIGREE_DIMS.map((dim) => {
          const [name = dim.label, abbr = ''] = dim.label.split(/\s+/)
          return (
            <div className="q-mx-row" role="row" key={dim.key}>
              <div className="q-mx-dim" role="rowheader">
                <span className="q-mx-pill">
                  <span className="q-mx-dim-name">{name}</span>
                  {abbr ? <span className="q-mx-dim-abbr">（{abbr}）</span> : null}
                </span>
                <span className="q-mx-chosen">已选 {draft[dim.key]} 分</span>
              </div>
              {SCORE_LEVELS.map((n) => {
                const selected = draft[dim.key] === n
                return (
                  <div
                    key={n}
                    className={`q-mx-td q-mx-c${n}${selected ? ' is-selected' : ''}`}
                    role="cell"
                  >
                    <button
                      type="button"
                      className="q-mx-cell"
                      disabled={disabled}
                      aria-pressed={selected}
                      aria-label={`${name} ${n} 分：${dim.rubric[n - 1]}`}
                      onClick={() => onChange(dim.key, n)}
                    >
                      {dim.rubric[n - 1]}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
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


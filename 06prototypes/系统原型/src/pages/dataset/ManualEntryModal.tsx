import { useEffect, useMemo, useState } from 'react'
import { Button, CascaderSelect, FormField, Input, Modal, MultiSelect, Select, Textarea } from '@/shared/components'
import type { TreeOption } from '@/types'
import { GWP_OPTIONS } from '@/mock/baselines'
import { createManualRecord } from '@/mock/dataset'
import {
  fetchCategoryTreeOptions,
  fetchIndustryTreeOptions,
  fetchLifecycleOptions,
  fetchUnitOptions,
  systemBoundaryItems,
} from '@/mock'
import { REGION_OPTIONS, PROCESS_LIBRARY_OPTIONS, isLibraryProcess, numText } from './datasetMeta'
import type { Boundary } from '@/types/dataset'

/**
 * 手工补录弹窗（验收点① 支线）：历史 / 外部数据入账。
 * 五区块：产品 → 口径 → 维度 → 数值（阶段值选填，实时校验 Σ一级 vs 总值）→ 来源（D11）。
 * 数值入库即快照，不可再改（Q06）；填错只能作废后重录。
 */

export interface ManualDraftResult {
  productName: string
  regionName: string
}

interface ManualEntryModalProps {
  open: boolean
  onClose: () => void
  onSaved: (recordName: string) => void
  onError: (message: string) => void
}

const EMPTY_STAGE_VALUES: Record<string, number> = {}

export default function ManualEntryModal({ open, onClose, onSaved, onError }: ManualEntryModalProps) {
  const [saving, setSaving] = useState(false)

  // 选项（引用基础库，口径与全站一致）
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [industryTree, setIndustryTree] = useState<TreeOption[]>([])
  const [stageOptions, setStageOptions] = useState<string[]>([])
  const [unitOptions, setUnitOptions] = useState<string[]>([])
  const [boundaryOptions, setBoundaryOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    if (!open) return
    void (async () => {
      const [cats, inds, stages, units] = await Promise.all([
        fetchCategoryTreeOptions('name'),
        fetchIndustryTreeOptions(),
        fetchLifecycleOptions(),
        fetchUnitOptions(),
      ])
      setCategoryTree(cats)
      setIndustryTree(inds)
      setStageOptions(stages)
      setUnitOptions(units)
      setBoundaryOptions(systemBoundaryItems().map((it) => ({ value: it.code, label: it.label })))
    })()
  }, [open])

  // 表单状态
  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [categoryValue, setCategoryValue] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [categoryPath, setCategoryPath] = useState('')
  const [industryValue, setIndustryValue] = useState('')
  const [industryLabel, setIndustryLabel] = useState('')
  const [industryPath, setIndustryPath] = useState('')
  const [boundary, setBoundary] = useState<Boundary | ''>('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [unitValue, setUnitValue] = useState('1')
  const [unitCode, setUnitCode] = useState('')
  const [regionName, setRegionName] = useState('')
  const [processes, setProcesses] = useState<string[]>([])
  const [processTagInput, setProcessTagInput] = useState('')
  const [total, setTotal] = useState('')
  const [showStages, setShowStages] = useState(false)
  const [stageInputs, setStageInputs] = useState<Record<string, string>>({})
  const [sourceNote, setSourceNote] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const stageRows = useMemo(() => {
    if (!boundary) return []
    // 按边界带出阶段（与行业基线同源口径）：大门 = 采伐 + 加工；坟墓另含运输 / 使用 / 废弃
    const all = [
      { code: 'g1', name: '采伐阶段', grave: false },
      { code: 'g2', name: '加工阶段', grave: false },
      { code: 'g3', name: '运输阶段', grave: true },
      { code: 'g4', name: '使用阶段', grave: true },
      { code: 'g5', name: '废弃与循环', grave: true },
    ]
    return all.filter((s) => !s.grave || boundary === 'grave')
  }, [boundary])

  const stageSum = useMemo(
    () => Object.values(stageInputs).reduce<number>((sum, v) => sum + (Number(v) || 0), 0),
    [stageInputs],
  )
  const totalNum = Number(total) || 0
  const stageGap =
    stageSum > 0 && totalNum > 0 ? Math.abs(stageSum - totalNum) / totalNum : 0

  const reset = () => {
    setProductName('')
    setProductCode('')
    setCategoryValue('')
    setCategoryLabel('')
    setCategoryPath('')
    setIndustryValue('')
    setIndustryLabel('')
    setIndustryPath('')
    setBoundary('')
    setPeriodStart('')
    setPeriodEnd('')
    setUnitValue('1')
    setUnitCode('')
    setRegionName('')
    setProcesses([])
    setProcessTagInput('')
    setTotal('')
    setShowStages(false)
    setStageInputs({})
    setSourceNote('')
    setAttachmentName('')
    setErrors({})
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!productName.trim()) next.productName = '请填写产品名称'
    if (!categoryValue) next.category = '请选择产品类别'
    if (!industryValue) next.industry = '请选择所属行业'
    if (!boundary) next.boundary = '请选择系统边界'
    if (!periodStart || !periodEnd) next.period = '请填写统计期间'
    else if (periodStart > periodEnd) next.period = '统计期间起不能晚于止'
    if (!unitCode) next.unit = '请选择声明单位'
    if (!regionName) next.region = '请选择区域（缺失将无法按区域检索）'
    if (processes.length === 0) next.processes = '请至少选择 1 项工艺'
    if (!total.trim() || Number(total) <= 0) next.total = '请填写大于 0 的总碳足迹'
    if (!sourceNote.trim()) next.sourceNote = '手工补录必须填写来源说明（D11）'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const attachments = attachmentName.trim() ? [{ name: attachmentName.trim() }] : []
      await createManualRecord({
        productName: productName.trim(),
        productCode: productCode.trim() || undefined,
        categoryCode: categoryLabel || categoryValue,
        categoryName: categoryLabel || categoryValue,
        categoryPath: categoryPath || (categoryLabel || categoryValue),
        industryCode: industryValue,
        industryName: industryLabel || industryValue,
        industryPath: industryPath || (industryLabel || industryValue),
        regionName,
        boundary: boundary as Boundary,
        periodStart,
        periodEnd,
        unitValue: Number(unitValue) || 1,
        unitCode,
        totalEmission: Number(total),
        sourceNote: sourceNote.trim(),
        stageValues: Object.fromEntries(
          Object.entries(stageInputs)
            .map(([code, v]): [string, number] => [code, Number(v) || 0])
            .filter(([, v]) => v > 0),
        ),
        attachments,
        processes: processes.map((name) => ({ name, custom: !isLibraryProcess(name) })),
      })
      onSaved(productName.trim())
      reset()
    } catch (error) {
      onError(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      size="lg"
      title="补录记录"
      onClose={handleClose}
      footer={
        <>
          <Button onClick={handleClose}>取消</Button>
          <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
            保存并进入台账
          </Button>
        </>
      }
    >
      <div className="ds-form">
        <div className="ds-form-block">
          <div className="ds-form-block-title">① 产品</div>
          <div className="form-grid">
            <FormField label="产品名称" required error={errors.productName}>
              <Input value={productName} placeholder="如 整竹砧板 330mm" onChange={(e) => setProductName(e.target.value)} />
            </FormField>
            <FormField label="产品编码">
              <Input value={productCode} placeholder="选填" onChange={(e) => setProductCode(e.target.value)} />
            </FormField>
            <FormField label="产品类别" required error={errors.category}>
              <CascaderSelect
                value={categoryValue}
                options={categoryTree}
                placeholder="请选择（末级）"
                onChange={(value, option) => {
                  setCategoryValue(value)
                  setCategoryLabel(option?.label ?? '')
                }}
              />
            </FormField>
            <FormField label="所属行业" required error={errors.industry}>
              <CascaderSelect
                value={industryValue}
                options={industryTree}
                placeholder="请选择（末级优先）"
                onChange={(value, option) => {
                  setIndustryValue(value)
                  setIndustryLabel(option?.label ?? '')
                }}
              />
            </FormField>
          </div>
        </div>

        <div className="ds-form-block">
          <div className="ds-form-block-title">② 口径</div>
          <div className="form-grid">
            <FormField label="系统边界" required error={errors.boundary}>
              <Select
                value={boundary}
                options={boundaryOptions}
                placeholder="请选择"
                onChange={(e) => setBoundary(e.target.value as Boundary | '')}
              />
            </FormField>
            <FormField label="统计期间" required error={errors.period}>
              <div className="ds-range">
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                <span className="ds-range-sep">~</span>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </FormField>
            <FormField label="声明单位数值" required>
              <Input value={unitValue} onChange={(e) => setUnitValue(e.target.value)} />
            </FormField>
            <FormField label="声明单位" required error={errors.unit}>
              <Select
                value={unitCode}
                options={unitOptions.map((u) => ({ value: u, label: u }))}
                placeholder="请选择"
                onChange={(e) => setUnitCode(e.target.value)}
              />
            </FormField>
            <FormField label="排放口径">
              <Select value="total" options={[{ value: 'total', label: '总量（不含生物源 CO₂）' }]} disabled />
            </FormField>
            <FormField label="GWP 版本">
              <Input value={GWP_OPTIONS[0]} disabled />
            </FormField>
          </div>
        </div>

        <div className="ds-form-block">
          <div className="ds-form-block-title">③ 检索维度</div>
          <div className="form-grid">
            <FormField label="区域" required error={errors.region}>
              <Select
                value={regionName}
                options={REGION_OPTIONS}
                placeholder="请选择（Q01：数据字典「区域」）"
                onChange={(e) => setRegionName(e.target.value)}
              />
            </FormField>
            <FormField label="工艺" required error={errors.processes}>
              <MultiSelect
                value={processes.filter((p) => isLibraryProcess(p))}
                options={PROCESS_LIBRARY_OPTIONS}
                placeholder="请选择工艺流程"
                onChange={(values) => {
                  const tags = processes.filter((p) => !isLibraryProcess(p))
                  setProcesses([...values, ...tags])
                }}
              />
            </FormField>
            <FormField label="自定义工艺标签" full>
              <div className="ds-tag-input">
                <Input
                  value={processTagInput}
                  placeholder="外部数据无工艺库编码时可添加标签（Q04）"
                  onChange={(e) => setProcessTagInput(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const tag = processTagInput.trim()
                    if (tag && !processes.includes(tag)) setProcesses([...processes, tag])
                    setProcessTagInput('')
                  }}
                >
                  添加
                </Button>
              </div>
              {processes.length > 0 && (
                <div className="ds-tag-list">
                  {processes.map((p) => (
                    <span key={p} className={['ds-tag', isLibraryProcess(p) ? '' : 'ds-tag-custom'].filter(Boolean).join(' ')}>
                      {p}
                      <button
                        type="button"
                        aria-label={`移除 ${p}`}
                        onClick={() => setProcesses(processes.filter((item) => item !== p))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </FormField>
          </div>
        </div>

        <div className="ds-form-block">
          <div className="ds-form-block-title">④ 数值</div>
          <div className="form-grid">
            <FormField label="总碳足迹（kgCO₂e/声明单位）" required error={errors.total}>
              <Input value={total} placeholder="如 12.4821" onChange={(e) => setTotal(e.target.value)} />
            </FormField>
            <FormField label="阶段值" full>
              <button type="button" className="link" onClick={() => setShowStages((prev) => !prev)}>
                {showStages ? '收起阶段值' : '展开填写阶段值（选填；缺失仅参与总值统计）'}
              </button>
            </FormField>
            {showStages && (
              <div className="ds-stage-grid">
                {stageRows.map((stage) => (
                  <FormField key={stage.code} label={stage.name}>
                    <Input
                      value={stageInputs[stage.code] ?? ''}
                      placeholder="0"
                      onChange={(e) => setStageInputs((prev) => ({ ...prev, [stage.code]: e.target.value }))}
                    />
                  </FormField>
                ))}
                {stageSum > 0 && (
                  <div className="ds-stage-sum">
                    阶段合计 {numText(stageSum)} ／ 总值 {numText(totalNum)}
                    {stageGap > 0.005 && (
                      <span className="ds-stage-warn">
                        相差 {(stageGap * 100).toFixed(1)}%（可保存，将标记「阶段不闭合」）
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ds-form-block">
          <div className="ds-form-block-title">⑤ 来源（D11）</div>
          <div className="form-grid">
            <FormField label="来源说明" required error={errors.sourceNote} full>
              <Textarea
                value={sourceNote}
                rows={2}
                placeholder="如：引自《2024 中国林产工业年鉴》表 3-2"
                onChange={(e) => setSourceNote(e.target.value)}
              />
            </FormField>
            <FormField label="依据文件" full>
              <Input
                value={attachmentName}
                placeholder="文件名（建议上传，便于对外披露举证）"
                onChange={(e) => setAttachmentName(e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** 工艺流程库名称判断来自 datasetMeta（Q04：库外名称即自定义标签） */

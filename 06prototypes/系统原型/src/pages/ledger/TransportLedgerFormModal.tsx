import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Select, VoucherUpload, useToast } from '@/shared/components'
import { createTransportLedger, updateTransportLedger } from '@/mock'
import type {
  PcfVoucher,
  TransportLedgerItem,
  TransportLedgerPayload,
  TransportMode,
  TransportSegment,
  TransportType,
} from '@/types'
import {
  TRANSPORT_MODE_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
  calcLoadingRate,
  summarizeTransportSegments,
  transportModeText,
  transportSegments,
} from './transportLedgerMeta'

/** 表单态的一段运输（数值用字符串承接输入框；rateTouched 仅前端使用） */
interface SegmentFormState {
  /** 前端稳定 key，用于分段渲染、校验定位与删除 */
  key: string
  transportMode: '' | TransportMode
  startPoint: string
  endPoint: string
  distance: string
  loadWeight: string
  ratedWeight: string
  loadingRate: string
  fuelConsumption: string
  carrier: string
  licensePlate: string
  relatedOrder: string
  /** 装载率是否被手动覆盖（覆盖后不再随载重自动重算） */
  rateTouched: boolean
}

interface FormState {
  transportType: '' | TransportType
  transportDateStart: string
  transportDateEnd: string
  segments: SegmentFormState[]
  vouchers: PcfVoucher[]
}

let segmentKeySeed = 0
const nextSegmentKey = () => `SEG-${Date.now().toString(36)}-${segmentKeySeed++}`

const emptySegment = (): SegmentFormState => ({
  key: nextSegmentKey(),
  transportMode: '',
  startPoint: '',
  endPoint: '',
  distance: '',
  loadWeight: '',
  ratedWeight: '',
  loadingRate: '',
  fuelConsumption: '',
  carrier: '',
  licensePlate: '',
  relatedOrder: '',
  rateTouched: false,
})

const emptyForm = (): FormState => ({
  transportType: '',
  transportDateStart: '',
  transportDateEnd: '',
  segments: [emptySegment()],
  vouchers: [],
})

/** 记录分段 → 表单分段（编辑态已有装载率视为人工确认值，不再自动覆盖） */
const toSegmentForm = (segment: TransportSegment): SegmentFormState => ({
  key: segment.id || nextSegmentKey(),
  transportMode: segment.transportMode,
  startPoint: segment.startPoint ?? '',
  endPoint: segment.endPoint ?? '',
  distance: String(segment.distance),
  loadWeight: String(segment.loadWeight),
  ratedWeight: segment.ratedWeight != null ? String(segment.ratedWeight) : '',
  loadingRate: segment.loadingRate != null ? String(segment.loadingRate) : '',
  fuelConsumption: String(segment.fuelConsumption),
  carrier: segment.carrier ?? '',
  licensePlate: segment.licensePlate ?? '',
  relatedOrder: segment.relatedOrder ?? '',
  rateTouched: segment.loadingRate != null,
})

/** 分段字段的错误键：绑定分段 key，增删分段时不会串位 */
const segError = (key: string, field: string) => `seg_${key}_${field}`

/** 必填项是否齐全：收起态用于提示「待完善」，避免用户漏填却不自知 */
function isSegmentComplete(seg: SegmentFormState): boolean {
  const nonNegative = (value: string) => value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0
  return (
    !!seg.transportMode &&
    nonNegative(seg.distance) &&
    nonNegative(seg.loadWeight) &&
    nonNegative(seg.fuelConsumption) &&
    (seg.loadingRate.trim() === '' || (Number(seg.loadingRate) >= 0 && Number(seg.loadingRate) <= 100))
  )
}

/** 收起态摘要：运输方式 · 起点 → 终点 · 距离，不展开也能看懂这一趟 */
function segmentBrief(seg: SegmentFormState): string {
  const parts = [seg.transportMode ? transportModeText[seg.transportMode as TransportMode] : '运输方式未选']
  if (seg.startPoint.trim() || seg.endPoint.trim())
    parts.push(`${seg.startPoint.trim() || '—'} → ${seg.endPoint.trim() || '—'}`)
  if (seg.distance.trim()) parts.push(`${seg.distance.trim()} km`)
  return parts.join(' · ')
}

interface TransportLedgerFormModalProps {
  open: boolean
  /** 传入记录为编辑，null 为新增 */
  initial: TransportLedgerItem | null
  onClose: () => void
  onSaved: (item: TransportLedgerItem) => void
}

/**
 * 运输台账新增 / 编辑弹窗
 * 一条记录 = 一趟运输；通过「添加一段运输」自行增删分段，支持公路 / 铁路 / 水路 / 航空 / 其他的多式联运。
 * 分段可展开 / 收起：默认只展开首段，新增段自动聚焦，校验失败自动展开出错段，收起态显示摘要与「待完善」。
 */
export default function TransportLedgerFormModal({ open, initial, onClose, onSaved }: TransportLedgerFormModalProps) {
  const isEdit = !!initial
  const toast = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(emptyForm)
  /** 当前展开的分段 key 集合；默认只展开首段，避免多段时表单过长 */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) return
    setErrors({})
    const nextForm: FormState = initial
      ? {
          transportType: initial.transportType,
          transportDateStart: initial.transportDateStart ?? '',
          transportDateEnd: initial.transportDateEnd ?? '',
          segments: transportSegments(initial).map(toSegmentForm),
          vouchers: initial.vouchers ?? [],
        }
      : emptyForm()
    setForm(nextForm)
    setExpandedKeys(nextForm.segments.length > 0 ? new Set([nextForm.segments[0].key]) : new Set<string>())
  }, [open, initial])

  const allExpanded = form.segments.length > 0 && form.segments.every((seg) => expandedKeys.has(seg.key))

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 更新某一段；载重变化且未手动覆盖装载率时自动重算 */
  const updateSegment = (key: string, patch: Partial<SegmentFormState>) => {
    setForm((prev) => ({
      ...prev,
      segments: prev.segments.map((seg) => {
        if (seg.key !== key) return seg
        const next = { ...seg, ...patch }
        if (!next.rateTouched && ('loadWeight' in patch || 'ratedWeight' in patch)) {
          const rate = calcLoadingRate(next.loadWeight, next.ratedWeight)
          next.loadingRate = rate == null ? '' : String(rate)
        }
        return next
      }),
    }))
  }

  /** 点击段标题展开 / 收起 */
  const toggleSegment = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** 一键全部展开 / 全部收起 */
  const toggleAllSegments = () => {
    setExpandedKeys(allExpanded ? new Set<string>() : new Set(form.segments.map((seg) => seg.key)))
  }

  /** 添加一段：起点自动衔接上一段终点；只展开新段并滚动到该段，避免表单越叠越长 */
  const addSegment = () => {
    const next = emptySegment()
    setForm((prev) => {
      const last = prev.segments[prev.segments.length - 1]
      next.startPoint = last?.endPoint.trim() ?? ''
      return { ...prev, segments: [...prev.segments, next] }
    })
    setExpandedKeys(new Set([next.key]))
    setErrors({})
    window.setTimeout(() => {
      document.getElementById(`segment-card-${next.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 0)
  }

  /** 删除一段：至少保留 1 段 */
  const removeSegment = (key: string) => {
    setForm((prev) =>
      prev.segments.length <= 1 ? prev : { ...prev, segments: prev.segments.filter((seg) => seg.key !== key) },
    )
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setErrors({})
  }

  /** 放弃手动值，恢复自动计算 */
  const resetSegmentRate = (key: string, seg: SegmentFormState) => {
    const rate = calcLoadingRate(seg.loadWeight, seg.ratedWeight)
    updateSegment(key, { rateTouched: false, loadingRate: rate == null ? '' : String(rate) })
  }

  const validate = (): string => {
    const next: Record<string, string> = {}
    if (!form.transportType) next.transportType = '请选择运输类型'

    if (!form.transportDateStart.trim()) next.transportDateStart = '请选择开始日期'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.transportDateStart.trim())) next.transportDateStart = '开始日期格式应为 YYYY-MM-DD'
    if (!form.transportDateEnd.trim()) next.transportDateEnd = '请选择结束日期'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.transportDateEnd.trim())) next.transportDateEnd = '结束日期格式应为 YYYY-MM-DD'
    else if (form.transportDateStart && form.transportDateStart > form.transportDateEnd)
      next.transportDateEnd = '结束日期不能早于开始日期'

    form.segments.forEach((seg, index) => {
      const key = (field: string) => segError(seg.key, field)
      const prefix = `第 ${index + 1} 段：`
      if (!seg.transportMode) next[key('transportMode')] = `${prefix}请选择运输方式`

      if (!seg.distance.trim()) next[key('distance')] = `${prefix}请输入运输距离`
      else if (Number.isNaN(Number(seg.distance)) || Number(seg.distance) < 0) next[key('distance')] = `${prefix}运输距离应为非负数值`

      if (!seg.loadWeight.trim()) next[key('loadWeight')] = `${prefix}请输入实际载重`
      else if (Number.isNaN(Number(seg.loadWeight)) || Number(seg.loadWeight) < 0)
        next[key('loadWeight')] = `${prefix}实际载重应为非负数值`

      if (seg.ratedWeight.trim()) {
        if (Number.isNaN(Number(seg.ratedWeight)) || Number(seg.ratedWeight) <= 0)
          next[key('ratedWeight')] = `${prefix}核定载重应为大于 0 的数值`
      }

      if (seg.loadingRate.trim()) {
        const rate = Number(seg.loadingRate)
        if (Number.isNaN(rate) || rate < 0 || rate > 100) next[key('loadingRate')] = `${prefix}装载率应为 0~100 的数值`
      }

      if (!seg.fuelConsumption.trim()) next[key('fuelConsumption')] = `${prefix}请输入能耗`
      else if (Number.isNaN(Number(seg.fuelConsumption)) || Number(seg.fuelConsumption) < 0)
        next[key('fuelConsumption')] = `${prefix}能耗应为非负数值`
    })

    setErrors(next)
    // 校验失败时自动展开出错的分段，避免错误藏在收起的卡片里
    const errorKeys = form.segments
      .filter((seg) => Object.keys(next).some((errorKey) => errorKey.startsWith(`seg_${seg.key}_`)))
      .map((seg) => seg.key)
    if (errorKeys.length > 0) setExpandedKeys((prev) => new Set([...prev, ...errorKeys]))
    return Object.keys(next).length > 0 ? '请先完善必填项（含各运输分段）' : ''
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }
    const segments: TransportSegment[] = form.segments.map((seg) => ({
      id: seg.key,
      transportMode: seg.transportMode as TransportMode,
      startPoint: seg.startPoint.trim(),
      endPoint: seg.endPoint.trim(),
      distance: Number(seg.distance),
      loadWeight: Number(seg.loadWeight),
      ratedWeight: seg.ratedWeight.trim() ? Number(seg.ratedWeight) : undefined,
      loadingRate: seg.loadingRate.trim() ? Number(seg.loadingRate) : undefined,
      fuelConsumption: Number(seg.fuelConsumption),
      carrier: seg.carrier.trim(),
      licensePlate: seg.licensePlate.trim(),
      relatedOrder: seg.relatedOrder.trim(),
    }))
    const payload: TransportLedgerPayload = {
      transportType: form.transportType as TransportType,
      ...summarizeTransportSegments(segments),
      transportDateStart: form.transportDateStart.trim(),
      transportDateEnd: form.transportDateEnd.trim(),
      segments,
      vouchers: form.vouchers,
    }
    setSubmitting(true)
    try {
      const saved = initial ? await updateTransportLedger(initial.id, payload) : await createTransportLedger(payload)
      toast('保存成功')
      onSaved(saved)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalDistance = Math.round(form.segments.reduce((sum, seg) => sum + (Number(seg.distance) || 0), 0) * 1000) / 1000
  const totalFuel = Math.round(form.segments.reduce((sum, seg) => sum + (Number(seg.fuelConsumption) || 0), 0) * 1000) / 1000
  const firstSegment = form.segments[0]
  const lastSegment = form.segments[form.segments.length - 1]

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑运输台账' : '新增运输台账'}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="运输类型" required error={errors.transportType}>
          <Select
            value={form.transportType}
            placeholder="请选择"
            options={TRANSPORT_TYPE_OPTIONS}
            invalid={!!errors.transportType}
            onChange={(e) => updateForm({ transportType: e.target.value as '' | TransportType })}
          />
        </FormField>
        <FormField label="运输日期" required error={errors.transportDateStart || errors.transportDateEnd}>
          <div className="date-range">
            <Input
              type="date"
              value={form.transportDateStart}
              invalid={!!errors.transportDateStart || !!errors.transportDateEnd}
              onChange={(e) => updateForm({ transportDateStart: e.target.value })}
            />
            <span className="date-range-sep">~</span>
            <Input
              type="date"
              value={form.transportDateEnd}
              invalid={!!errors.transportDateStart || !!errors.transportDateEnd}
              onChange={(e) => updateForm({ transportDateEnd: e.target.value })}
            />
          </div>
        </FormField>
      </div>

      <div className="segment-section">
        <div className="segment-section-head">
          <div>
            <span className="view-block-title">运输分段（共 {form.segments.length} 段）</span>
            <span className="segment-head-tip">
              一趟运输可拆成多段：如 北京 → 天津（公路）、天津 → 海口（水路/海运）、海口 → 海南（航空）；点击段标题可展开或收起。
            </span>
          </div>
          <div className="segment-toolbar">
            {form.segments.length > 1 && (
              <Button size="small" onClick={toggleAllSegments}>
                {allExpanded ? '全部收起' : '全部展开'}
              </Button>
            )}
            <Button size="small" onClick={addSegment}>
              + 添加一段运输
            </Button>
          </div>
        </div>

        {form.segments.map((seg, index) => {
          const key = (field: string) => segError(seg.key, field)
          const expanded = expandedKeys.has(seg.key)
          const segHasError = Object.keys(errors).some((errorKey) => errorKey.startsWith(`seg_${seg.key}_`))
          const needAttention = segHasError || !isSegmentComplete(seg)
          const bodyId = `segment-body-${seg.key}`
          return (
            <div
              className={`segment-card${expanded ? ' is-expanded' : ''}${segHasError ? ' has-error' : ''}`}
              id={`segment-card-${seg.key}`}
              key={seg.key}
            >
              <div className="segment-card-head">
                <button
                  type="button"
                  className="segment-toggle"
                  aria-expanded={expanded}
                  aria-controls={bodyId}
                  onClick={() => toggleSegment(seg.key)}
                >
                  <span className={`segment-chevron${expanded ? ' is-open' : ''}`} aria-hidden="true" />
                  <span className="segment-card-title">第 {index + 1} 段</span>
                  {!expanded && <span className="segment-brief">{segmentBrief(seg)}</span>}
                  {!expanded && needAttention && <span className="segment-pending">待完善</span>}
                </button>
                {form.segments.length > 1 && (
                  <div className="segment-actions">
                    <button type="button" className="link link-danger" onClick={() => removeSegment(seg.key)}>
                      删除本段
                    </button>
                  </div>
                )}
              </div>

              {expanded && (
                <div className="segment-card-body" id={bodyId}>
                  <div className="form-grid">
                    <FormField label="运输方式" required error={errors[key('transportMode')]}>
                      <Select
                        value={seg.transportMode}
                        placeholder="请选择"
                        options={TRANSPORT_MODE_OPTIONS}
                        invalid={!!errors[key('transportMode')]}
                        onChange={(e) => updateSegment(seg.key, { transportMode: e.target.value as '' | TransportMode })}
                      />
                    </FormField>
                    <FormField label="起点">
                      <Input
                        value={seg.startPoint}
                        placeholder="如 北京"
                        onChange={(e) => updateSegment(seg.key, { startPoint: e.target.value })}
                      />
                    </FormField>
                    <FormField label="终点">
                      <Input
                        value={seg.endPoint}
                        placeholder="如 天津"
                        onChange={(e) => updateSegment(seg.key, { endPoint: e.target.value })}
                      />
                    </FormField>
                    <FormField label="运输距离(km)" required error={errors[key('distance')]}>
                      <Input
                        value={seg.distance}
                        placeholder="数值"
                        invalid={!!errors[key('distance')]}
                        onChange={(e) => updateSegment(seg.key, { distance: e.target.value })}
                      />
                    </FormField>
                    <FormField label="实际载重(t)" required error={errors[key('loadWeight')]}>
                      <Input
                        value={seg.loadWeight}
                        placeholder="数值"
                        invalid={!!errors[key('loadWeight')]}
                        onChange={(e) => updateSegment(seg.key, { loadWeight: e.target.value })}
                      />
                    </FormField>
                    <FormField label="核定载重(t)" error={errors[key('ratedWeight')]}>
                      <Input
                        value={seg.ratedWeight}
                        placeholder="选填，数值"
                        invalid={!!errors[key('ratedWeight')]}
                        onChange={(e) => updateSegment(seg.key, { ratedWeight: e.target.value })}
                      />
                    </FormField>
                    <FormField label="装载率(%)" error={errors[key('loadingRate')]}>
                      <div className="rate-field">
                        <Input
                          value={seg.loadingRate}
                          placeholder="0~100"
                          invalid={!!errors[key('loadingRate')]}
                          onChange={(e) => updateSegment(seg.key, { loadingRate: e.target.value, rateTouched: true })}
                        />
                        <button type="button" className="link" onClick={() => resetSegmentRate(seg.key, seg)}>
                          自动重算
                        </button>
                      </div>
                      <span className="ledger-form-tip">默认按 实际载重 ÷ 核定载重 自动计算，可直接修改覆盖</span>
                    </FormField>
                    <FormField label="能耗(L)" required error={errors[key('fuelConsumption')]}>
                      <Input
                        value={seg.fuelConsumption}
                        placeholder="数值"
                        invalid={!!errors[key('fuelConsumption')]}
                        onChange={(e) => updateSegment(seg.key, { fuelConsumption: e.target.value })}
                      />
                    </FormField>
                    <FormField label="承运商">
                      <Input
                        value={seg.carrier}
                        placeholder="选填"
                        onChange={(e) => updateSegment(seg.key, { carrier: e.target.value })}
                      />
                    </FormField>
                    <FormField label="车牌号/船名/航班号">
                      <Input
                        value={seg.licensePlate}
                        placeholder="选填，如 闽H·A1234"
                        onChange={(e) => updateSegment(seg.key, { licensePlate: e.target.value })}
                      />
                    </FormField>
                    <FormField label="关联单据号">
                      <Input
                        value={seg.relatedOrder}
                        placeholder="选填，如 RK20260708-001"
                        onChange={(e) => updateSegment(seg.key, { relatedOrder: e.target.value })}
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div className="segment-summary">
          整趟路线：{firstSegment?.startPoint || '-'} → {lastSegment?.endPoint || '-'} · 共 {form.segments.length} 段 ·
          合计运输距离 {totalDistance} km · 合计能耗 {totalFuel} L
        </div>
      </div>

      <div className="form-grid voucher-form-section">
        <FormField label="数据凭证" full>
          <VoucherUpload value={form.vouchers} onChange={(vouchers) => updateForm({ vouchers })} />
        </FormField>
      </div>
    </Modal>
  )
}

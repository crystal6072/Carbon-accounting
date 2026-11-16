import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Select, Textarea, VoucherUpload, useToast } from '@/shared/components'
import { createEnergyLedger, updateEnergyLedger } from '@/mock'
import type {
  EnergyLedgerItem,
  EnergyLedgerPayload,
  LedgerElectricitySource,
  LedgerEnergyType,
  LedgerWaterSource,
  PcfVoucher,
} from '@/types'
import {
  ELECTRICITY_SOURCE_OPTIONS,
  ENERGY_TYPE_OPTIONS,
  WATER_SOURCE_OPTIONS,
  energyUnitOptions,
} from './energyLedgerMeta'

interface FormState {
  processName: string
  recordStartDate: string
  recordEndDate: string
  energyType: '' | LedgerEnergyType
  consumptionAmount: string
  unit: string
  /** 用电类型：选填，仅 energyType = electricity 时展示 */
  electricitySource: '' | LedgerElectricitySource
  /** 水源类型：选填，仅 energyType = water 时展示 */
  waterSource: '' | LedgerWaterSource
  /** 备注：选填 */
  remark: string
  vouchers: PcfVoucher[]
}

const EMPTY_FORM: FormState = {
  processName: '',
  recordStartDate: '',
  recordEndDate: '',
  energyType: '',
  consumptionAmount: '',
  unit: '',
  electricitySource: '',
  waterSource: '',
  remark: '',
  vouchers: [],
}

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

interface EnergyLedgerFormModalProps {
  open: boolean
  /** 传入记录为编辑，null 为新增 */
  initial: EnergyLedgerItem | null
  onClose: () => void
  onSaved: (item: EnergyLedgerItem) => void
}

/**
 * 加工能耗台账新增 / 编辑弹窗（轻量基础数据走弹窗维护，与列表同屏）
 * 表单结构：公共字段（工序 / 周期 / 能源类型 / 消耗数量 / 单位 / 备注 / 数据凭证）+ 能源类型联动字段
 * 用电类型、水源类型、备注均为选填；数据凭证支持上传多个附件
 */
export default function EnergyLedgerFormModal({ open, initial, onClose, onSaved }: EnergyLedgerFormModalProps) {
  const isEdit = !!initial
  const toast = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (initial) {
      setForm({
        processName: initial.processName,
        recordStartDate: initial.recordStartDate,
        recordEndDate: initial.recordEndDate,
        energyType: initial.energyType,
        consumptionAmount: String(initial.consumptionAmount),
        unit: initial.unit,
        electricitySource: initial.electricitySource ?? '',
        waterSource: initial.waterSource ?? '',
        remark: initial.remark ?? '',
        vouchers: initial.vouchers ?? [],
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, initial])

  const unitOptions = energyUnitOptions(form.energyType)
  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 切换能源类型：重建联动字段区，并清掉不再适用的联动值与单位 */
  const handleEnergyTypeChange = (value: '' | LedgerEnergyType) => {
    const nextUnits = energyUnitOptions(value)
    setForm((prev) => ({
      ...prev,
      energyType: value,
      electricitySource: '',
      waterSource: '',
      unit: nextUnits.some((opt) => opt.value === prev.unit) ? prev.unit : '',
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next.energyType
      delete next.electricitySource
      delete next.waterSource
      delete next.unit
      return next
    })
  }

  const validate = (): string => {
    const next: Record<string, string> = {}
    if (!form.processName) next.processName = '请选择所属工序/车间'

    if (!form.recordStartDate.trim()) next.recordStartDate = '请选择所属周期开始日期'
    else if (!DATE_PATTERN.test(form.recordStartDate.trim())) next.recordStartDate = '日期格式应为 YYYY-MM-DD'
    if (!form.recordEndDate.trim()) next.recordEndDate = '请选择所属周期结束日期'
    else if (!DATE_PATTERN.test(form.recordEndDate.trim())) next.recordEndDate = '日期格式应为 YYYY-MM-DD'
    if (
      form.recordStartDate.trim() &&
      form.recordEndDate.trim() &&
      DATE_PATTERN.test(form.recordStartDate.trim()) &&
      DATE_PATTERN.test(form.recordEndDate.trim()) &&
      form.recordEndDate.trim() < form.recordStartDate.trim()
    )
      next.recordEndDate = '所属周期结束日期不得早于开始日期'

    if (!form.energyType) next.energyType = '请选择能源类型'

    if (!form.consumptionAmount.trim()) next.consumptionAmount = '请输入消耗数量'
    else if (Number.isNaN(Number(form.consumptionAmount)) || Number(form.consumptionAmount) <= 0)
      next.consumptionAmount = '消耗数量应为正数'

    if (!form.unit) next.unit = '请选择计量单位'

    // 用电类型 / 水源类型 / 备注均为选填，不做必填阻断
    setErrors(next)
    return Object.keys(next).length > 0 ? '请先完善必填项' : ''
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }
    const payload: EnergyLedgerPayload = {
      processName: form.processName,
      recordStartDate: form.recordStartDate.trim(),
      recordEndDate: form.recordEndDate.trim(),
      energyType: form.energyType as LedgerEnergyType,
      consumptionAmount: Number(form.consumptionAmount),
      unit: form.unit,
      electricitySource:
        form.energyType === 'electricity' && form.electricitySource
          ? (form.electricitySource as LedgerElectricitySource)
          : undefined,
      waterSource:
        form.energyType === 'water' && form.waterSource ? (form.waterSource as LedgerWaterSource) : undefined,
      remark: form.remark.trim() || undefined,
      vouchers: form.vouchers,
    }
    setSubmitting(true)
    try {
      const saved = initial ? await updateEnergyLedger(initial.id, payload) : await createEnergyLedger(payload)
      toast('保存成功')
      onSaved(saved)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const periodError = errors.recordStartDate || errors.recordEndDate

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑加工能耗台账' : '新增加工能耗台账'}
      size="lg"
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
        <FormField label="所属工序/车间" required error={errors.processName}>
          <Input
            value={form.processName}
            placeholder="如：干燥、裁切、砂光、热压、涂装、组装"
            invalid={!!errors.processName}
            onChange={(e) => updateForm({ processName: e.target.value })}
          />
        </FormField>

        <FormField label="能源类型" required error={errors.energyType}>
          <Select
            value={form.energyType}
            placeholder="请选择"
            options={ENERGY_TYPE_OPTIONS}
            invalid={!!errors.energyType}
            onChange={(e) => handleEnergyTypeChange(e.target.value as '' | LedgerEnergyType)}
          />
        </FormField>

        <FormField label="所属周期" required error={periodError} full>
          <div className="date-range">
            <Input
              type="date"
              aria-label="所属周期开始日期"
              value={form.recordStartDate}
              invalid={!!errors.recordStartDate}
              onChange={(e) => updateForm({ recordStartDate: e.target.value })}
            />
            <span className="date-range-sep">至</span>
            <Input
              type="date"
              aria-label="所属周期结束日期"
              value={form.recordEndDate}
              invalid={!!errors.recordEndDate}
              onChange={(e) => updateForm({ recordEndDate: e.target.value })}
            />
          </div>
        </FormField>

        <FormField label="消耗数量" required error={errors.consumptionAmount}>
          <Input
            type="number"
            min="0"
            step="0.0001"
            placeholder="请输入数值，保留 4 位小数"
            value={form.consumptionAmount}
            invalid={!!errors.consumptionAmount}
            onChange={(e) => updateForm({ consumptionAmount: e.target.value })}
          />
        </FormField>

        <FormField label="计量单位" required error={errors.unit}>
          <Select
            value={form.unit}
            placeholder={form.energyType ? '请选择' : '请先选择能源类型'}
            options={unitOptions}
            invalid={!!errors.unit}
            onChange={(e) => updateForm({ unit: e.target.value })}
          />
        </FormField>

        {form.energyType === 'electricity' && (
          <FormField label="用电类型（选填）">
            <Select
              value={form.electricitySource}
              options={ELECTRICITY_SOURCE_OPTIONS}
              emptyOption
              onChange={(e) => updateForm({ electricitySource: e.target.value as '' | LedgerElectricitySource })}
            />
          </FormField>
        )}

        {form.energyType === 'water' && (
          <FormField label="水源类型（选填）">
            <Select
              value={form.waterSource}
              options={WATER_SOURCE_OPTIONS}
              emptyOption
              onChange={(e) => updateForm({ waterSource: e.target.value as '' | LedgerWaterSource })}
            />
          </FormField>
        )}

        <FormField label="备注（选填）" full>
          <Textarea
            rows={3}
            maxLength={500}
            value={form.remark}
            placeholder="可补充说明异常工况、停线、抄表口径等，不超过 500 字符"
            onChange={(e) => updateForm({ remark: e.target.value })}
          />
        </FormField>

        <FormField label="数据源凭证（选填）" full>
          <VoucherUpload value={form.vouchers} onChange={(vouchers) => updateForm({ vouchers })} showHint={false} />
        </FormField>
      </div>
    </Modal>
  )
}

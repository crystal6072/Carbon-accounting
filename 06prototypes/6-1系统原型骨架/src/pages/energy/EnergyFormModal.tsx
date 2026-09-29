import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, MultiSelect, Select, Textarea, useToast } from '@/shared/components'
import type { MultiSelectOption, SelectOption } from '@/shared/components'
import {
  ENERGY_DESCRIPTION_MAX,
  createEnergy,
  fetchEnergy,
  fetchIndustryOptions,
  updateEnergy,
} from '@/mock'
import type { EnergyPayload } from '@/mock'
import type { EnergyItem, EnergyType } from '@/types'
import { energyTypeOrder, energyTypeText, energyTypeTip } from './energyMeta'

interface EnergyFormModalProps {
  open: boolean
  /** 传入能源 id 为编辑，null 为新增 */
  energyId: string | null
  onClose: () => void
  /** 保存成功回调：由调用页刷新列表 */
  onSaved: (energy: EnergyItem) => void
}

interface FormState {
  code: string
  name: string
  energyType: '' | EnergyType
  industries: string[]
  description: string
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  energyType: '',
  industries: [],
  description: '',
}

/** 能源新增 / 编辑弹窗（轻量基础数据走弹窗维护，与列表页同屏） */
export default function EnergyFormModal({ open, energyId, onClose, onSaved }: EnergyFormModalProps) {
  const isEdit = !!energyId
  const toast = useToast()

  const [industryList, setIndustryList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setErrors({})
    try {
      const industries = await fetchIndustryOptions()
      setIndustryList(industries)

      if (energyId) {
        const detail = await fetchEnergy(energyId)
        setForm({
          code: detail.code,
          name: detail.name,
          energyType: detail.energyType,
          industries: [...detail.industries],
          description: detail.description,
        })
      } else {
        setForm(EMPTY_FORM)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [open, energyId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const energyTypeOptions = useMemo<SelectOption[]>(
    () => energyTypeOrder.map((energyType) => ({ label: energyTypeText[energyType], value: energyType })),
    [],
  )

  const industryOptions = useMemo<MultiSelectOption[]>(
    () => industryList.map((industry) => ({ label: industry, value: industry })),
    [industryList],
  )

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 校验：编码 / 名称 / 能源类型必填；描述最长 500 字符 */
  const validate = (): string => {
    const nextErrors: Record<string, string> = {}
    if (!form.code.trim()) nextErrors.code = '请输入能源编码'
    if (!form.name.trim()) nextErrors.name = '请输入能源名称'
    if (!form.energyType) nextErrors.energyType = '请选择能源类型'
    if (form.description.length > ENERGY_DESCRIPTION_MAX) {
      nextErrors.description = `描述最长 ${ENERGY_DESCRIPTION_MAX} 字符`
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length > 0 ? '请先完善必填项' : ''
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }

    const payload: EnergyPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      energyType: form.energyType as EnergyType,
      industries: form.industries,
      description: form.description.trim(),
    }

    setSubmitting(true)
    try {
      const saved = energyId ? await updateEnergy(energyId, payload) : await createEnergy(payload)
      toast('保存成功')
      onSaved(saved)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? '编辑能源' : '新增能源'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting || loading} onClick={handleSubmit}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="empty">加载中…</div>
      ) : (
        <div className="form-grid">
          <FormField label="能源编码" required error={errors.code}>
            <Input
              value={form.code}
              placeholder="如 E-011"
              readOnly={isEdit}
              invalid={!!errors.code}
              onChange={(e) => updateForm({ code: e.target.value })}
            />
          </FormField>
          <FormField label="能源名称" required error={errors.name}>
            <Input
              value={form.name}
              placeholder="请输入具体品名，如「柴油」「外购电力」"
              invalid={!!errors.name}
              onChange={(e) => updateForm({ name: e.target.value })}
            />
          </FormField>
          <FormField label="能源类型" required error={errors.energyType} full>
            <Select
              value={form.energyType}
              placeholder="请选择能源类型"
              options={energyTypeOptions}
              invalid={!!errors.energyType}
              onChange={(e) => updateForm({ energyType: e.target.value as '' | EnergyType })}
            />
            {/* 能源类型口径说明：类型只表达粗粒度类别，具体品名填「能源名称」 */}
            <div className="energy-form-hint">
              {form.energyType ? energyTypeTip[form.energyType] : '类型只取「燃料 / 电力 / 热力」，具体品名填在「能源名称」'}
            </div>
          </FormField>
          <FormField label="适用行业" full>
            <MultiSelect
              value={form.industries}
              options={industryOptions}
              placeholder="请选择适用行业"
              onChange={(industries) => updateForm({ industries })}
            />
          </FormField>
          <FormField label="能源描述" full error={errors.description}>
            <Textarea
              value={form.description}
              rows={3}
              maxLength={ENERGY_DESCRIPTION_MAX}
              placeholder="选填"
              invalid={!!errors.description}
              onChange={(e) => updateForm({ description: e.target.value })}
            />
            <div
              className={[
                'char-count',
                form.description.length > ENERGY_DESCRIPTION_MAX ? 'char-count-over' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {form.description.length}/{ENERGY_DESCRIPTION_MAX}
            </div>
          </FormField>
        </div>
      )}
    </Modal>
  )
}

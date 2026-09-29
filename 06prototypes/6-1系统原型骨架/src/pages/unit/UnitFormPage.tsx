import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Icon, Input, Modal, PageHeader, Select, Textarea, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { UNIT_REMARK_MAX, createUnit, fetchUnit, fetchUnits, updateUnit } from '@/mock'
import type { UnitPayload } from '@/mock'
import type { UnitItem, UnitType } from '@/types'
import { unitTypeOrder, unitTypeText } from './unitMeta'
import './UnitPage.css'

interface FormState {
  name: string
  symbol: string
  unitType: '' | UnitType
  /** 是否基准单位：新增可选，编辑不可改（【待确认 Q04】） */
  isBase: 'yes' | 'no'
  baseUnitId: string
  factor: string
  remark: string
}

const EMPTY_FORM: FormState = {
  name: '',
  symbol: '',
  unitType: '',
  isBase: 'no',
  baseUnitId: '',
  factor: '',
  remark: '',
}

export default function UnitFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [allUnits, setAllUnits] = useState<UnitItem[]>([])
  const [origin, setOrigin] = useState<UnitItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  /** 待确认保存（R-010：修改已被引用单位的换算系数需二次确认） */
  const [pendingPayload, setPendingPayload] = useState<UnitPayload | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const units = await fetchUnits()
      setAllUnits(units)
      if (isEdit && id) {
        const detail = await fetchUnit(id)
        setOrigin(detail)
        setForm({
          name: detail.name,
          symbol: detail.symbol,
          unitType: detail.unitType,
          isBase: detail.isBase ? 'yes' : 'no',
          baseUnitId: detail.baseUnitId ?? '',
          factor: detail.isBase ? '1' : String(detail.factor),
          remark: detail.remark,
        })
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit, toast])

  useEffect(() => {
    void load()
  }, [load])

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const typeOptions: SelectOption[] = useMemo(
    () => unitTypeOrder.map((type) => ({ label: `${unitTypeText[type]}`, value: type })),
    [],
  )

  /** 该类型下是否已存在基准单位（决定「是基准单位」是否可选，B1 / R-002） */
  const typeHasBase = useMemo(
    () => allUnits.some((item) => item.unitType === form.unitType && item.isBase),
    [allUnits, form.unitType],
  )

  const isQuantity = form.unitType === 'quantity'
  const isBaseYes = form.isBase === 'yes'
  /** 换算关系不适用：基准单位（恒为 1）或数量类（无基准单位） */
  const factorDisabled = isBaseYes || isQuantity

  /** 关联基准单位选项：仅同类型、启用中的基准单位（D03 / B5） */
  const baseOptions: SelectOption[] = useMemo(
    () =>
      allUnits
        .filter((item) => item.unitType === form.unitType && item.isBase && item.status === 'enabled')
        .map((item) => ({ label: `${item.name}（${item.symbol}）`, value: item.id })),
    [allUnits, form.unitType],
  )

  /** 单位类型切换：重置关联基准单位（基准选项随类型变化）；「数量」类强制非基准（B4） */
  const handleTypeChange = (unitType: '' | UnitType) => {
    setForm((prev) => ({
      ...prev,
      unitType,
      baseUnitId: '',
      isBase: unitType === 'quantity' ? 'no' : prev.isBase,
      factor: unitType === 'quantity' ? '' : prev.isBase === 'yes' ? '1' : prev.factor,
    }))
  }

  /** 基准标记切换：基准单位系数恒为 1 且不关联基准单位（B2 / B3） */
  const handleIsBaseChange = (isBase: 'yes' | 'no') => {
    setForm((prev) => ({
      ...prev,
      isBase,
      baseUnitId: isBase === 'yes' ? '' : prev.baseUnitId,
      factor: isBase === 'yes' ? '1' : prev.factor === '1' ? '' : prev.factor,
    }))
  }

  const isBaseSelectOptions: SelectOption[] = [
    { label: '否（非基准单位）', value: 'no' },
    { label: typeHasBase ? '是（该类型已存在基准单位）' : '是（基准单位）', value: 'yes', disabled: typeHasBase },
  ]

  const validate = (): string => {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = '请输入单位名称'
    if (!form.symbol.trim()) nextErrors.symbol = '请输入单位符号'
    else if (/\s/.test(form.symbol)) nextErrors.symbol = '单位符号不得包含空格'
    if (!form.unitType) nextErrors.unitType = '请选择单位类型'
    if (form.isBase === 'no' && !isQuantity) {
      if (!form.baseUnitId) nextErrors.baseUnitId = '非基准单位必须选择关联基准单位'
      const factor = Number(form.factor)
      if (!form.factor.trim() || Number.isNaN(factor) || factor <= 0) {
        nextErrors.factor = '换算系数必须为正数'
      }
    }
    if (form.remark.length > UNIT_REMARK_MAX) nextErrors.remark = `备注最长 ${UNIT_REMARK_MAX} 字符`
    setErrors(nextErrors)
    return Object.keys(nextErrors).length > 0 ? '请先完善必填项' : ''
  }

  const buildPayload = (): UnitPayload => ({
    name: form.name.trim(),
    symbol: form.symbol.trim(),
    unitType: form.unitType as UnitType,
    isBase: form.isBase === 'yes',
    baseUnitId: isBaseYes || isQuantity ? null : form.baseUnitId,
    factor: isBaseYes ? 1 : Number(form.factor),
    remark: form.remark.trim(),
  })

  const submit = async (payload: UnitPayload) => {
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateUnit(id, payload)
        toast('保存成功')
        navigate(`/basic/unit/${id}`)
      } else {
        const created = await createUnit(payload)
        toast('保存成功')
        navigate(`/basic/unit/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }
    const payload = buildPayload()
    // R-010：修改非基准单位的换算系数需二次确认并提示影响范围（变更不追溯）
    const factorChanged = isEdit && origin ? !origin.isBase && origin.factor !== payload.factor : false
    if (factorChanged) {
      setPendingPayload(payload)
      return
    }
    await submit(payload)
  }

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumb={['后台管理', '基础库', '计量单位库']}
          title={isEdit ? '编辑单位' : '新增单位'}
        />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  if (isEdit && !origin) {
    return (
      <>
        <PageHeader
          breadcrumb={['后台管理', '基础库', '计量单位库']}
          title="编辑单位"
        />
        <div className="card">
          <div className="empty">单位不存在或已被删除</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '基础库', '计量单位库', isEdit ? '编辑单位' : '新增单位']}
        title={isEdit ? '编辑单位' : '新增单位'}
        description={
          isEdit
            ? '单位类型与基准标记保存后不可修改；变更不追溯已核算结果（R-010）'
            : '「单位符号 + 单位类型」唯一；每个单位类型下有且仅有 1 个基准单位'
        }
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="unit-stack">
        <section className="card">
          <div className="unit-section-header">
            <span className="unit-section-title">基本信息</span>
          </div>
          <div className="unit-section-body">
            <div className="form-grid">
              <FormField label="单位名称" required error={errors.name}>
                <Input
                  value={form.name}
                  placeholder="如 千克"
                  invalid={!!errors.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                />
              </FormField>
              <FormField label="单位符号" required error={errors.symbol}>
                <Input
                  value={form.symbol}
                  placeholder="如 kg（不得包含空格）"
                  invalid={!!errors.symbol}
                  onChange={(e) => updateForm({ symbol: e.target.value })}
                />
              </FormField>
              <FormField label="单位类型" required error={errors.unitType}>
                <Select
                  value={form.unitType}
                  placeholder="请选择单位类型"
                  options={typeOptions}
                  disabled={isEdit}
                  invalid={!!errors.unitType}
                  onChange={(e) => handleTypeChange(e.target.value as '' | UnitType)}
                />
              </FormField>
              <FormField label="是否基准单位" required>
                <Select
                  value={form.isBase}
                  options={isBaseSelectOptions}
                  disabled={isEdit || isQuantity}
                  onChange={(e) => handleIsBaseChange(e.target.value as 'yes' | 'no')}
                />
              </FormField>
              <FormField label="关联基准单位" required={!isBaseYes && !isQuantity} error={errors.baseUnitId}>
                <Select
                  value={form.baseUnitId}
                  placeholder={isQuantity ? '数量类无基准单位' : '仅可选同类型基准单位'}
                  options={baseOptions}
                  disabled={isBaseYes || isQuantity}
                  invalid={!!errors.baseUnitId}
                  onChange={(e) => updateForm({ baseUnitId: e.target.value })}
                />
              </FormField>
              <FormField label="换算系数" required={!isBaseYes && !isQuantity} error={errors.factor}>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.factor}
                  placeholder={isBaseYes ? '基准单位恒为 1' : '本单位 → 基准单位的乘数（正数）'}
                  disabled={factorDisabled}
                  invalid={!!errors.factor}
                  onChange={(e) => updateForm({ factor: e.target.value })}
                />
              </FormField>
              <FormField label="备注" full error={errors.remark}>
                <Textarea
                  value={form.remark}
                  rows={3}
                  maxLength={UNIT_REMARK_MAX}
                  placeholder="选填"
                  invalid={!!errors.remark}
                  onChange={(e) => updateForm({ remark: e.target.value })}
                />
                <div
                  className={['char-count', form.remark.length > UNIT_REMARK_MAX ? 'char-count-over' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {form.remark.length}/{UNIT_REMARK_MAX}
                </div>
              </FormField>
            </div>
          </div>
          <div className="unit-section-body unit-section-tip">
            单位类型为系统内置枚举，不开放维护；「是否基准单位」新增时可选、编辑时不可改（【待确认 Q04】）。每个单位类型下有且仅有
            1 个基准单位，基准单位不可禁用 / 删除 / 改类型，换算系数恒为 1（B1～B3 / R-002 / R-003）；非基准单位必须关联同类型
            基准单位（R-004）；「数量」类无基准单位、相互独立不可换算（B4 / U4）；换算系数必须为正数（R-005）。
          </div>
        </section>

        <section className="card">
          <div className="unit-form-footer">
            <Button onClick={() => navigate(-1)}>取消</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </div>
        </section>
      </div>

      <Modal
        open={!!pendingPayload}
        title="确认保存"
        size="sm"
        onClose={() => setPendingPayload(null)}
        footer={
          <>
            <Button onClick={() => setPendingPayload(null)}>取消</Button>
            <Button
              variant="primary"
              onClick={() => {
                const payload = pendingPayload
                setPendingPayload(null)
                if (payload) void submit(payload)
              }}
            >
              确认保存
            </Button>
          </>
        }
      >
        <div className="modal-confirm-text">
          <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
            <Icon name="warning" size={16} />
          </span>
          <div>
            <div>单位「{origin?.name}」的换算系数已变更，将影响该单位后续参与核算的口径。</div>
            <div className="modal-confirm-tip">
              已核算项目的既有结果不变，不自动重算；需按新口径重算时走 E13（R-010）。
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

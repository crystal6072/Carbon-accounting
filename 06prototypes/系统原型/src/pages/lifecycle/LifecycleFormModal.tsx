import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, MultiSelect, Select, Textarea, useToast } from '@/shared/components'
import type { MultiSelectOption, SelectOption } from '@/shared/components'
import {
  LIFECYCLE_DESCRIPTION_MAX,
  LIFECYCLE_ORDER_MAX,
  LIFECYCLE_ORDER_MIN,
  createLifecycleStage,
  fetchDictOptionsByTypeCode,
  fetchLifecycleStages,
  updateLifecycleStage,
} from '@/mock'
import type { LifecycleStagePayload } from '@/mock'
import type { LifecycleLevel, LifecycleStageItem } from '@/types'
import { DICT_TYPE_SYSTEM_BOUNDARY } from '@/types'
import { levelText, suggestOrder } from './lifecycleMeta'

interface LifecycleFormModalProps {
  open: boolean
  /** 传入阶段 id 为编辑，null 为新增 */
  stageId: string | null
  onClose: () => void
  /** 保存成功回调：由调用页刷新列表 */
  onSaved: (stage: LifecycleStageItem) => void
}

interface FormState {
  code: string
  name: string
  level: LifecycleLevel
  parentId: string
  order: string
  boundaries: string[]
  description: string
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  level: 1,
  parentId: '',
  order: '',
  boundaries: [],
  description: '',
}

/** 生命周期阶段新增 / 编辑弹窗（轻量基础数据走弹窗维护，与列表页同屏） */
export default function LifecycleFormModal({ open, stageId, onClose, onSaved }: LifecycleFormModalProps) {
  const isEdit = !!stageId
  const toast = useToast()

  const [list, setList] = useState<LifecycleStageItem[]>([])
  const [boundaryOptions, setBoundaryOptions] = useState<MultiSelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setErrors({})
    try {
      const [stages, boundaryList] = await Promise.all([
        fetchLifecycleStages(),
        fetchDictOptionsByTypeCode(DICT_TYPE_SYSTEM_BOUNDARY),
      ])
      setList(stages)
      setBoundaryOptions(boundaryList.map((item) => ({ label: item.label, value: item.code })))

      const target = stageId ? stages.find((item) => item.id === stageId) ?? null : null
      if (target) {
        setForm({
          code: target.code,
          name: target.name,
          level: target.level,
          parentId: target.parentId ?? '',
          order: String(target.order),
          boundaries: [...target.boundaries],
          description: target.description,
        })
      } else {
        setForm({
          ...EMPTY_FORM,
          code: `LS-${String(stages.length + 1).padStart(2, '0')}`,
          order: String(suggestOrder(stages, 1, null)),
        })
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [open, stageId, toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 存在下级阶段时不允许改层级（避免二级阶段失去上级，D02 / D03） */
  const hasChildren = useMemo(
    () => (stageId ? list.some((item) => item.parentId === stageId) : false),
    [list, stageId],
  )

  const primaryOptions = useMemo<SelectOption[]>(
    () =>
      list
        .filter((item) => item.level === 1 && item.id !== stageId)
        .sort((a, b) => a.order - b.order)
        .map((item) => ({ label: `${item.name}（${item.code}）`, value: item.id })),
    [list, stageId],
  )

  const levelOptions = useMemo<SelectOption[]>(
    () => [
      { label: `一级（${levelText[1]}阶段，无上级）`, value: '1' },
      { label: `二级（${levelText[2]}阶段，必选上级）`, value: '2' },
    ],
    [],
  )

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 层级变更：顺序按新层级「同级最大值 + 10」重算（【待确认 Q04】） */
  const handleLevelChange = (level: LifecycleLevel) => {
    const parentId = level === 1 ? '' : form.parentId
    updateForm({ level, parentId, order: String(suggestOrder(list, level, parentId || null)) })
  }

  /** 上级阶段变更：二级阶段顺序按该一级阶段范围内「最大值 + 10」重算（D11） */
  const handleParentChange = (parentId: string) => {
    updateForm({ parentId, order: String(suggestOrder(list, 2, parentId || null)) })
  }

  const validate = (): string => {
    const next: Record<string, string> = {}
    const code = form.code.trim()
    const name = form.name.trim()
    const order = Number(form.order)
    const parentId = form.level === 2 ? form.parentId || null : null

    if (!code) next.code = '请输入阶段编码'
    else if (list.some((item) => item.id !== stageId && item.code === code)) next.code = '阶段编码已存在（D01）'

    if (!name) next.name = '请输入阶段名称'
    else if (list.some((item) => item.id !== stageId && item.level === form.level && item.parentId === parentId && item.name === name)) {
      next.name = '同一上级下的阶段名称不得重复（D04）'
    }

    if (form.level === 2 && !form.parentId) next.parentId = '二级阶段必须选择上级阶段（D02）'

    if (form.order.trim() === '' || !Number.isInteger(order)) {
      next.order = `请输入 ${LIFECYCLE_ORDER_MIN}～${LIFECYCLE_ORDER_MAX} 的整数`
    } else if (order < LIFECYCLE_ORDER_MIN || order > LIFECYCLE_ORDER_MAX) {
      next.order = `阶段顺序取值为 ${LIFECYCLE_ORDER_MIN}～${LIFECYCLE_ORDER_MAX}`
    } else if (list.some((item) => item.id !== stageId && item.level === form.level && item.parentId === parentId && item.order === order)) {
      next.order = '同级内阶段顺序不重复（D05）'
    }

    setErrors(next)
    return Object.keys(next).length > 0 ? '请先完善必填项' : ''
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }

    const payload: LifecycleStagePayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      level: form.level,
      parentId: form.level === 2 ? form.parentId : null,
      order: Number(form.order),
      description: form.description.trim(),
      boundaries: form.boundaries,
    }

    setSubmitting(true)
    try {
      const saved = stageId ? await updateLifecycleStage(stageId, payload) : await createLifecycleStage(payload)
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
      title={isEdit ? '编辑阶段' : '新增阶段'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="lifecycle.form.cancel" onClick={onClose}>取消</Button>
          <Button variant="primary" data-ann-target="lifecycle.form.save" disabled={submitting || loading} onClick={handleSubmit}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="empty">加载中…</div>
      ) : (
        <div className="form-grid">
          <FormField label="阶段编码" required error={errors.code} annTarget="lifecycle.form.code">
            <Input
              value={form.code}
              placeholder="如 LS-07"
              readOnly={isEdit}
              invalid={!!errors.code}
              onChange={(e) => updateForm({ code: e.target.value })}
            />
          </FormField>
          <FormField label="阶段名称" required error={errors.name} annTarget="lifecycle.form.name">
            <Input
              value={form.name}
              placeholder="请输入阶段名称"
              invalid={!!errors.name}
              onChange={(e) => updateForm({ name: e.target.value })}
            />
          </FormField>
          <FormField label="阶段层级" required annTarget="lifecycle.form.level">
            <Select
              value={String(form.level)}
              options={levelOptions}
              disabled={hasChildren}
              onChange={(e) => handleLevelChange(Number(e.target.value) as LifecycleLevel)}
            />
          </FormField>
          <FormField label="上级阶段" required={form.level === 2} error={errors.parentId} annTarget="lifecycle.form.parent">
            <Select
              value={form.parentId}
              placeholder={form.level === 2 ? '请选择一级阶段（必填）' : '一级阶段无上级'}
              options={primaryOptions}
              disabled={form.level === 1}
              invalid={!!errors.parentId}
              onChange={(e) => handleParentChange(e.target.value)}
            />
          </FormField>
          <FormField label="阶段顺序" required error={errors.order} annTarget="lifecycle.form.order">
            <Input
              type="number"
              min={LIFECYCLE_ORDER_MIN}
              max={LIFECYCLE_ORDER_MAX}
              value={form.order}
              placeholder={`${LIFECYCLE_ORDER_MIN}～${LIFECYCLE_ORDER_MAX} 的整数`}
              invalid={!!errors.order}
              onChange={(e) => updateForm({ order: e.target.value })}
            />
          </FormField>
          <FormField
            label="适用系统边界"
            full
            annTarget="lifecycle.form.boundaries"
            hint="引用「组织与权限 · 数据字典 · 系统边界」；可多选，为空 = 全边界通用"
          >
            <MultiSelect
              value={form.boundaries}
              options={boundaryOptions}
              placeholder="为空 = 全边界通用"
              onChange={(value) => updateForm({ boundaries: value })}
            />
          </FormField>
          <FormField label="阶段描述" full annTarget="lifecycle.form.description">
            <Textarea
              value={form.description}
              rows={3}
              maxLength={LIFECYCLE_DESCRIPTION_MAX}
              placeholder="选填"
              onChange={(e) => updateForm({ description: e.target.value })}
            />
            <div className="char-count">
              {form.description.length}/{LIFECYCLE_DESCRIPTION_MAX}
            </div>
          </FormField>
        </div>
      )}
    </Modal>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, MultiCascaderSelect, Select, Textarea, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import {
  MATERIAL_DESCRIPTION_MAX,
  createMaterial,
  fetchIndustryTreeOptions,
  fetchMaterial,
  updateMaterial,
} from '@/mock'
import type { MaterialPayload } from '@/mock'
import type { MaterialItem, MaterialType, TreeOption } from '@/types'
import { materialTypeOrder, materialTypeText } from './materialMeta'

interface MaterialFormModalProps {
  open: boolean
  /** 传入物料 id 为编辑，null 为新增 */
  materialId: string | null
  onClose: () => void
  /** 保存成功回调：由调用页刷新列表 / 详情 */
  onSaved: (material: MaterialItem) => void
}

interface FormState {
  code: string
  name: string
  type: '' | MaterialType
  industries: string[]
  description: string
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  type: '',
  industries: [],
  description: '',
}

/** 物料新增 / 编辑弹窗（轻量基础数据走弹窗维护，与列表页同屏） */
export default function MaterialFormModal({ open, materialId, onClose, onSaved }: MaterialFormModalProps) {
  const isEdit = !!materialId
  const toast = useToast()

  /** 适用行业多级选项（行业库四级） */
  const [industryTree, setIndustryTree] = useState<TreeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setErrors({})
    try {
      const industries = await fetchIndustryTreeOptions()
      setIndustryTree(industries)

      if (materialId) {
        const detail = await fetchMaterial(materialId)
        setForm({
          code: detail.code,
          name: detail.name,
          type: detail.type,
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
  }, [open, materialId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const typeOptions = useMemo<SelectOption[]>(
    () => materialTypeOrder.map((type) => ({ label: materialTypeText[type], value: type })),
    [],
  )

  const industryOptions = useMemo<TreeOption[]>(() => industryTree, [industryTree])

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 校验：编码 / 名称 / 物料类型必填；描述最长 500 字符 */
  const validate = (): string => {
    const nextErrors: Record<string, string> = {}
    if (!form.code.trim()) nextErrors.code = '请输入物料编码'
    if (!form.name.trim()) nextErrors.name = '请输入物料名称'
    if (!form.type) nextErrors.type = '请选择物料类型'
    if (form.description.length > MATERIAL_DESCRIPTION_MAX) {
      nextErrors.description = `描述最长 ${MATERIAL_DESCRIPTION_MAX} 字符`
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

    const payload: MaterialPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type as MaterialType,
      industries: form.industries,
      description: form.description.trim(),
    }

    setSubmitting(true)
    try {
      const saved = materialId ? await updateMaterial(materialId, payload) : await createMaterial(payload)
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
      title={isEdit ? '编辑物料' : '新增物料'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="material.form.cancel" onClick={onClose}>取消</Button>
          <Button variant="primary" data-ann-target="material.form.save" disabled={submitting || loading} onClick={handleSubmit}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="empty">加载中…</div>
      ) : (
        <div className="form-grid">
          <FormField label="物料编码" required error={errors.code} annTarget="material.form.code">
            <Input
              value={form.code}
              placeholder="如 M-801"
              readOnly={isEdit}
              invalid={!!errors.code}
              onChange={(e) => updateForm({ code: e.target.value })}
            />
          </FormField>
          <FormField label="物料名称" required error={errors.name} annTarget="material.form.name">
            <Input
              value={form.name}
              placeholder="请输入物料名称"
              invalid={!!errors.name}
              onChange={(e) => updateForm({ name: e.target.value })}
            />
          </FormField>
          <FormField label="物料类型" required error={errors.type} annTarget="material.form.type">
            <Select
              value={form.type}
              placeholder="请选择物料类型"
              options={typeOptions}
              invalid={!!errors.type}
              onChange={(e) => updateForm({ type: e.target.value as '' | MaterialType })}
            />
          </FormField>
          <FormField label="适用行业" full annTarget="material.form.industries">
            <MultiCascaderSelect
              value={form.industries}
              options={industryOptions}
              placeholder="请选择适用行业"
              searchPlaceholder="搜索行业名称 / 编码"
              onChange={(industries) => updateForm({ industries })}
            />
          </FormField>
          <FormField label="物料描述" full error={errors.description} annTarget="material.form.description">
            <Textarea
              value={form.description}
              rows={3}
              maxLength={MATERIAL_DESCRIPTION_MAX}
              placeholder="选填"
              invalid={!!errors.description}
              onChange={(e) => updateForm({ description: e.target.value })}
            />
            <div
              className={[
                'char-count',
                form.description.length > MATERIAL_DESCRIPTION_MAX ? 'char-count-over' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {form.description.length}/{MATERIAL_DESCRIPTION_MAX}
            </div>
          </FormField>
        </div>
      )}
    </Modal>
  )
}

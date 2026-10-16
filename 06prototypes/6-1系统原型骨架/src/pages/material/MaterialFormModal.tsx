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
import type { MaterialFlowType, MaterialItem, MaterialSubCategory, TreeOption } from '@/types'
import {
  materialFlowTypeOrder,
  materialFlowTypeText,
  materialSubCategoryOrder,
  materialSubCategoryText,
} from './materialMeta'

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
  flowType: '' | MaterialFlowType
  subCategory: '' | MaterialSubCategory
  industries: string[]
  description: string
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  flowType: '',
  subCategory: '',
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
          flowType: detail.flowType,
          subCategory: detail.subCategory ?? '',
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

  const flowTypeOptions = useMemo<SelectOption[]>(
    () => materialFlowTypeOrder.map((flowType) => ({ label: materialFlowTypeText[flowType], value: flowType })),
    [],
  )

  const subCategoryOptions = useMemo<SelectOption[]>(
    () =>
      materialSubCategoryOrder.map((subCategory) => ({
        label: materialSubCategoryText[subCategory],
        value: subCategory,
      })),
    [],
  )

  const industryOptions = useMemo<TreeOption[]>(() => industryTree, [industryTree])

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 一级类型切换：非「原辅料」时清空二级子类（二级仅原辅料需要维护） */
  const handleFlowTypeChange = (flowType: '' | MaterialFlowType) => {
    setForm((prev) => ({ ...prev, flowType, subCategory: flowType === 'material' ? prev.subCategory : '' }))
  }

  /** 校验：编码 / 名称 / 物料类型必填；原辅料必选二级子类；描述最长 500 字符 */
  const validate = (): string => {
    const nextErrors: Record<string, string> = {}
    if (!form.code.trim()) nextErrors.code = '请输入物料编码'
    if (!form.name.trim()) nextErrors.name = '请输入物料名称'
    if (!form.flowType) nextErrors.flowType = '请选择物料类型'
    if (form.flowType === 'material' && !form.subCategory) nextErrors.subCategory = '请选择物料子类'
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
      flowType: form.flowType as MaterialFlowType,
      subCategory: form.flowType === 'material' ? (form.subCategory as MaterialSubCategory) : null,
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
          <FormField label="物料类型（一级）" required error={errors.flowType} annTarget="material.form.flowType">
            <Select
              value={form.flowType}
              placeholder="请选择投入产出流"
              options={flowTypeOptions}
              invalid={!!errors.flowType}
              onChange={(e) => handleFlowTypeChange(e.target.value as '' | MaterialFlowType)}
            />
          </FormField>
          {/* 二级仅「原辅料」需要维护，其余类型不展示 */}
          {form.flowType === 'material' && (
            <FormField label="物料子类（二级）" required error={errors.subCategory} annTarget="material.form.subCategory">
              <Select
                value={form.subCategory}
                placeholder="请选择子类"
                options={subCategoryOptions}
                invalid={!!errors.subCategory}
                onChange={(e) => updateForm({ subCategory: e.target.value as '' | MaterialSubCategory })}
              />
            </FormField>
          )}
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

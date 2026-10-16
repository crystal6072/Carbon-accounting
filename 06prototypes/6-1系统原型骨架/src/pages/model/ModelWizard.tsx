import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Button, useToast } from '@/shared/components'
import { createModel, createMyModel, publishModel, updateModel, updateMyModel } from '@/mock'
import type { CarbonModel, MyModel } from '@/types'
import ModelStepOne from './ModelStepOne'
import ModelStepTwo from './ModelStepTwo'
import ModelSteps from './ModelSteps'
import { emptyModelDraft, draftToPayload, modelToDraft } from './modelDraft'
import type { ModelDraft } from './modelDraft'
import '@/pages/pcf/PcfPage.css'

interface ModelWizardProps {
  /** `platform` = 后台平台模型；`org` = 前台「我的模型」 */
  mode: 'platform' | 'org'
  /** 编辑 / 查看时的初始模型（新建时传空） */
  initial?: CarbonModel | MyModel | null
  /** 保存成功回调（回传模型 id 与是否为「保存并发布」） */
  onSaved?: (id: string, published?: boolean) => void
  onCancel?: () => void
  /** 只读态（查看页）：同一套两步交互，字段转为纯文本 */
  readOnly?: boolean
  /** 只读态：名称右侧状态标签（模型状态 / 来源） */
  metaTag?: ReactNode
  /** 只读态：追加到「基本信息」的模型元信息 */
  metaFields?: Array<{ label: string; value: string; mono?: boolean }>
  /** 只读态顶部提示条 */
  notice?: ReactNode
}

/**
 * 模型两步向导容器（后台模型管理 / 我的模型新建编辑 / 模型查看 共用）：
 * 持有草稿态与步骤切换，保存适配器按 `mode` 分流（写入 `modelStore` / `myModelStore`）；
 * `mode = platform` 时额外提供「保存并发布」；`readOnly` 时仅保留同样的步骤导航（查看页与编辑页交互一致）。
 */
export default function ModelWizard({
  mode,
  initial,
  onSaved,
  onCancel,
  readOnly = false,
  metaTag,
  metaFields,
  notice,
}: ModelWizardProps) {
  const toast = useToast()
  const [draft, setDraft] = useState<ModelDraft>(() => (initial ? modelToDraft(initial) : emptyModelDraft()))
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const patch = (next: Partial<ModelDraft>) => {
    if (readOnly) return
    setDraft((prev) => ({ ...prev, ...next }))
  }

  /** 步骤① 必填校验（与产品核算步骤①同口径） */
  const validateStepOne = () => {
    const next: Record<string, string> = {}
    if (!draft.name.trim()) next.name = '请输入模型名称'
    if (!draft.productName.trim()) next.productName = '请输入产品名称'
    if (!draft.productImageUrl) next.productImageUrl = '请上传产品图片'
    if (!draft.categoryId) next.categoryId = '请选择产品分类'
    if (!draft.standardId) next.standardId = '请选择核算标准'
    if (!draft.functionalUnit) next.functionalUnit = '请选择单位'
    if (!draft.boundary) next.boundary = '请选择系统边界'
    if (draft.lifecycleStages.filter((stage) => stage.included).length === 0) next.boundary = '请至少纳入一个生命周期阶段'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** 步骤② 校验：已填名称的数据项必须有数量 */
  const validateStepTwo = () => {
    const missing = draft.items.filter((item) => item.quantity == null).length
    if (missing > 0) {
      toast(`还有 ${missing} 条数据项未填写数量`, 'error')
      return false
    }
    return true
  }

  const includedStageCount = useMemo(
    () => draft.lifecycleStages.filter((stage) => stage.included).length,
    [draft.lifecycleStages],
  )

  const handleSave = async (alsoPublish = false) => {
    if (saving || readOnly) return
    if (!validateStepOne()) {
      setStep(1)
      toast('请先完善「目标与范围」必填项', 'error')
      return
    }
    if (!validateStepTwo()) return

    setSaving(true)
    try {
      const payload = draftToPayload(draft)
      const saved = mode === 'platform'
        ? initial
          ? await updateModel(initial.id, payload)
          : await createModel(payload)
        : initial
          ? await updateMyModel(initial.id, payload)
          : await createMyModel(payload)
      if (alsoPublish && mode === 'platform') {
        await publishModel(saved.id)
        toast('模型已保存并发布，前台模型库可见')
        onSaved?.(saved.id, true)
        return
      }
      toast(initial ? '保存成功' : '模型已创建（草稿）')
      onSaved?.(saved.id, false)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="model-wizard">
      <ModelSteps activeStep={step} onSelect={setStep} />

      <section className="pcf-content">
        {notice && <div className="model-detail-notice">{notice}</div>}
        {step === 1 ? (
          <ModelStepOne
            mode={mode}
            draft={draft}
            onChange={patch}
            errors={errors}
            readOnly={readOnly}
            metaTag={metaTag}
            metaFields={metaFields}
          />
        ) : (
          <ModelStepTwo draft={draft} onChange={patch} readOnly={readOnly} />
        )}
      </section>

      <div className="model-wizard-actions">
        <span className="model-wizard-tip">
          第 {step} / 2 步 · {step === 1 ? '目标与范围' : `产品建模（${includedStageCount} 个阶段）`}
          {readOnly ? ' · 只读预览' : ''}
        </span>
        <span className="model-wizard-btns">
          {!readOnly && <Button onClick={onCancel}>取消</Button>}
          {!readOnly && step === 2 && <Button onClick={() => setStep(1)}>上一步</Button>}
          {!readOnly && step === 1 && (
            <Button
              variant="primary"
              onClick={() => {
                if (validateStepOne()) setStep(2)
                else toast('请先完善「目标与范围」必填项', 'error')
              }}
            >
              下一步
            </Button>
          )}
          {!readOnly && step === 2 && (
            <Button variant="primary" disabled={saving} onClick={() => void handleSave(false)}>
              保存
            </Button>
          )}
          {!readOnly && mode === 'platform' && step === 2 && (
            <Button variant="primary" disabled={saving} onClick={() => void handleSave(true)}>
              保存并发布
            </Button>
          )}
        </span>
      </div>
    </div>
  )
}

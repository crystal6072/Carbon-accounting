import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { Button, Input, Select, useToast } from '@/shared/components'
import {
  getStageParamConfig,
  type StageParamAction,
  type StageParamField,
} from './stageParamMeta'
import './PcfPage.css'

/** 弹窗统一保存 / 清空时调用面板暴露的命令式句柄 */
export interface StageParamPanelHandle {
  /** 保存当前阶段参数 */
  save: () => Promise<void>
  /** 清空当前阶段表单 */
  reset: () => void
}

interface StageParamPanelProps {
  /** 当前生命周期阶段 id（用于落库定位） */
  stageId: string
  /** 当前生命周期阶段名称（用于标题联动 + 字段配置） */
  stageName: string
  /** 已保存的阶段基础参数（JSON 扩展字段） */
  metadata?: Record<string, string | number> | null
  /** 是否可编辑（查看模式下只读） */
  editable: boolean
  /** 保存参数：将表单键值对打包为 JSON 写入阶段节点 `stageMetadata` */
  onSave: (stageId: string, metadata: Record<string, string | number> | null) => Promise<void>
}

/** 由已保存 metadata 初始化本地表单（全部以字符串承载，便于输入） */
function initForm(fields: StageParamField[], metadata?: Record<string, string | number> | null): Record<string, string> {
  const form: Record<string, string> = {}
  fields.forEach((field) => {
    const value = metadata?.[field.key]
    form[field.key] = value === undefined || value === null ? '' : String(value)
  })
  return form
}

/**
 * 「阶段基础参数」表单卡片（在「过程参数维护」弹窗中按所选阶段逐个渲染）。
 * - 标题跟随阶段动态变化（如「采伐阶段场景参数」）；
 * - 内部表单字段按阶段配置，【保存参数】将键值对打包为 JSON 写入阶段节点 `stageMetadata`；
 * - 一键生成按钮：由参数推导活动数据并在面板内直接显示结果（不回填下方活动数据列表）。
 */
const StageParamPanel = forwardRef<StageParamPanelHandle, StageParamPanelProps>(
  function StageParamPanel({ stageId, stageName, metadata, editable, onSave }, ref) {
  const toast = useToast()
  const config = useMemo(() => getStageParamConfig(stageName), [stageName])

  const [form, setForm] = useState<Record<string, string>>(() => initForm(config.fields, metadata))
  const [saving, setSaving] = useState(false)
  /** 各推算按钮的即时结果（点击推算后直接显示值，如「采伐残余物（损耗） 12.5 t」） */
  const [results, setResults] = useState<Record<string, string>>({})

  const updateField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleReset = () => {
    setForm(initForm(config.fields, metadata))
    setResults({})
  }

  const handleSave = async () => {
    if (!editable || saving) return
    setSaving(true)
    try {
      const payload: Record<string, string | number> = {}
      config.fields.forEach((field) => {
        const raw = (form[field.key] ?? '').trim()
        if (raw === '') return
        payload[field.key] = field.control === 'number' ? Number(raw) : raw
      })
      await onSave(stageId, Object.keys(payload).length > 0 ? payload : null)
      toast('参数已保存')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  useImperativeHandle(ref, () => ({ save: handleSave, reset: handleReset }))

  const handleGenerate = (action: StageParamAction) => {
    if (!editable) return
    if (action.validate) {
      const message = action.validate(form)
      if (message) {
        toast(message, 'error')
        return
      }
    }
    const generated = action.build(form)
    if (generated.length === 0) {
      toast('未生成活动数据，请检查参数是否填写')
      return
    }
    setResults((prev) => ({
      ...prev,
      [action.label]: generated.map((g) => `${g.name} ${g.quantity}${g.unit}`).join('；'),
    }))
    toast('已生成活动数据，请在下方查看结果')
  }

  return (
    <div className="pcf-stage-param" data-ann-target="pcf.step2.stageParam">
      <div className="pcf-stage-param-head">
        <span className="pcf-stage-param-title">{config.title}</span>
      </div>

      <div className="pcf-stage-param-body">
        <div className="pcf-grid">
          {config.fields.map((field) => (
            <div key={field.key} className="pcf-stage-param-field">
              <label className="pcf-stage-param-label">{field.label}</label>
              {field.control === 'select' ? (
                <Select
                  value={form[field.key] ?? ''}
                  placeholder="请选择"
                  disabled={!editable}
                  options={(field.options ?? []).map((option) => ({ label: option, value: option }))}
                  onChange={(e) => updateField(field.key, e.target.value)}
                />
              ) : field.control === 'number' ? (
                <div className="pcf-inline">
                  <Input
                    value={form[field.key] ?? ''}
                    inputMode="decimal"
                    placeholder="请输入"
                    readOnly={!editable}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  />
                  {field.unit && <span className="pcf-stage-param-unit">{field.unit}</span>}
                </div>
              ) : (
                <Input
                  value={form[field.key] ?? ''}
                  placeholder="请输入"
                  readOnly={!editable}
                  onChange={(e) => updateField(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {editable && (
          <div className="pcf-stage-param-actions">
            <span className="pcf-stage-param-generate">
              {config.actions.map((action) => (
                <Button
                  key={action.label}
                  variant="default"
                  data-ann-target="pcf.step2.stageParam.generate"
                  onClick={() => handleGenerate(action)}
                >
                  {action.label}
                </Button>
              ))}
            </span>
          </div>
        )}

        {editable && (
          <div className="pcf-stage-param-notes">
            {config.actions
              .filter((action) => action.formula)
              .map((action) => (
                <div key={action.label} className="pcf-stage-param-formula">
                  计算公式：{action.formula}
                </div>
              ))}
            {config.actions
              .filter((action) => results[action.label])
              .map((action) => (
                <div key={action.label} className="pcf-stage-param-result">
                  推算结果：{results[action.label]}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
})

export default StageParamPanel

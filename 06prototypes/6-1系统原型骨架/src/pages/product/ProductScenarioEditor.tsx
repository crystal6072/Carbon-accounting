import { Button, FormField, MultiImageUpload, Textarea } from '@/shared/components'
import type { ProductScenario } from '@/types'
import './ProductPage.css'

let uid = 0
const nextScenarioId = () => `SC-${Date.now().toString().slice(-6)}-${++uid}`

interface ProductScenarioEditorProps {
  value: ProductScenario[]
  onChange: (value: ProductScenario[]) => void
}

/**
 * 产品场景应用编辑器（产品信息库 / 我的产品库共用）：
 * 每个场景 = 「场景说明（文本）+ 场景图片（多张）」，可增删多个场景。
 * 场景应用为选填字段，原型图片仅本地预览（data URL），不做真实上传与存储。
 */
export default function ProductScenarioEditor({ value, onChange }: ProductScenarioEditorProps) {
  const addScenario = () =>
    onChange([...value, { id: nextScenarioId(), description: '', images: [] }])

  const updateScenario = (id: string, patch: Partial<ProductScenario>) =>
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const removeScenario = (id: string) => onChange(value.filter((item) => item.id !== id))

  return (
    <div className="scenario-editor">
      <div className="scenario-toolbar">
        <span className="toolbar-tip">选填；每个场景支持「场景说明 + 多张图片」，供核算与报告引用</span>
        <Button size="small" onClick={addScenario}>
          + 新增场景应用
        </Button>
      </div>

      {value.length === 0 && (
        <div className="compose-empty">暂无场景应用，如需补充产品实际使用场景请点击「+ 新增场景应用」</div>
      )}

      {value.map((scenario, index) => (
        <div className="sub-block" key={scenario.id}>
          <div className="sub-block-header">
            <span className="sub-block-title">
              <span className="compose-seq">场景 {index + 1}</span>
            </span>
            <span className="sub-block-actions">
              <button className="link link-danger" onClick={() => removeScenario(scenario.id)}>
                删除场景
              </button>
            </span>
          </div>
          <div className="scenario-body">
            <FormField label="场景说明">
              <Textarea
                value={scenario.description}
                rows={2}
                placeholder="如：家庭日常用餐 / 连锁餐饮门店一次性餐具"
                onChange={(e) => updateScenario(scenario.id, { description: e.target.value })}
              />
            </FormField>
            <FormField label="场景图片" hint="支持多张">
              <MultiImageUpload
                value={scenario.images}
                onChange={(images) => updateScenario(scenario.id, { images })}
              />
            </FormField>
          </div>
        </div>
      ))}
    </div>
  )
}

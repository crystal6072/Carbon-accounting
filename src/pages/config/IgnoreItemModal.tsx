import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Textarea, useToast } from '@/shared/components'
import type { IgnoreItem } from '@/mock/config'

const OBJECT_OPTIONS: Record<IgnoreItem['objectType'], { label: string; value: string }[]> = {
  生命周期阶段: [
    { label: '生命初期阶段', value: '生命初期阶段' },
    { label: '生产阶段', value: '生产阶段' },
    { label: '生命末期阶段', value: '生命末期阶段' },
  ],
  排放项类别: [
    { label: '原材料', value: '原材料' },
    { label: '能源', value: '能源' },
    { label: '运输', value: '运输' },
    { label: '包装', value: '包装' },
    { label: '废弃物处理', value: '废弃物处理' },
    { label: '其他', value: '其他' },
  ],
  温室气体: [
    { label: 'CO₂', value: 'CO₂' },
    { label: 'CH₄', value: 'CH₄' },
    { label: 'N₂O', value: 'N₂O' },
  ],
  单元过程: [
    { label: '厂内叉车转运', value: '厂内叉车转运' },
    { label: '干燥工序', value: '干燥工序' },
  ],
}

interface Props {
  open: boolean
  item: IgnoreItem | null
  onClose: () => void
  onSave: (item: IgnoreItem) => void
}

export default function IgnoreItemModal({ open, item, onClose, onSave }: Props) {
  const toast = useToast()
  const [form, setForm] = useState<IgnoreItem>(blank())

  useEffect(() => {
    if (open) setForm(item ?? blank())
  }, [open, item])

  const setField = <K extends keyof IgnoreItem>(k: K, v: IgnoreItem[K]) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = () => {
    if (!form.reason.trim()) return toast('请填写忽略理由', 'error')
    if (!form.clause.trim()) return toast('请填写依据条款', 'error')
    const label = OBJECT_OPTIONS[form.objectType].find((o) => o.value === form.objectCode)?.label ?? form.objectCode
    onSave({ ...form, objectName: label })
  }

  return (
    <Modal
      open={open}
      title={item ? '编辑可忽略排放项' : '新增可忽略排放项'}
      size="default"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSave}>保存</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-item">
          <label className="form-label required">对象类型</label>
          <Select
            options={(Object.keys(OBJECT_OPTIONS) as IgnoreItem['objectType'][]).map((t) => ({ label: t, value: t }))}
            value={form.objectType}
            onChange={(e) => { setField('objectType', e.target.value as IgnoreItem['objectType']); setField('objectCode', '') }}
          />
        </div>
        <div className="form-item">
          <label className="form-label required">对象</label>
          <Select options={OBJECT_OPTIONS[form.objectType]} value={form.objectCode} onChange={(e) => setField('objectCode', e.target.value)} />
        </div>
        <div className="form-item">
          <label className="form-label required">忽略方式</label>
          <div className="radio-row">
            {(['完全忽略', '仅提示', '需填原因'] as const).map((m) => (
              <label key={m}>
                <input type="radio" name="method" checked={form.method === m} onChange={() => setField('method', m)} />
                {m}
              </label>
            ))}
          </div>
        </div>
        <div className="form-item">
          <label className="form-label required">依据条款</label>
          <Input value={form.clause} maxLength={200} placeholder="如 GB/T 24067-2024 §6.3.5.3" onChange={(e) => setField('clause', e.target.value)} />
        </div>
        <div className="form-item form-item-full">
          <label className="form-label required">忽略理由</label>
          <Textarea value={form.reason} maxLength={200} placeholder="说明为何忽略该排放项（≤200 字）" onChange={(e) => setField('reason', e.target.value)} />
          <span className="char-count">{form.reason.length}/200</span>
        </div>
      </div>
      <div className="toolbar-tip" style={{ marginTop: 12 }}>
        摘要呈现：完全忽略 →「不纳入」；仅提示 →「提示」；需填原因 →「忽略需说明」。
      </div>
    </Modal>
  )
}

function blank(): IgnoreItem {
  return {
    id: `i${Date.now()}`,
    objectType: '生命周期阶段',
    objectCode: '生命初期阶段',
    objectName: '生命初期阶段',
    method: '完全忽略',
    reason: '',
    clause: '',
    sort: 0,
  }
}

import { useEffect, useMemo, useState } from 'react'
import { Button, CascaderSelect, Input, Modal, Select, Textarea, useToast } from '@/shared/components'
import type { TreeOption } from '@/types'
import {
  FACTOR_LIB_OPTIONS,
  FACTOR_OPTIONS,
  INDUSTRY_OPTIONS,
  LIFECYCLE_OPTIONS,
  OBJECT_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  REGION_OPTIONS,
  YEAR_OPTIONS,
  type DefaultFactor,
} from '@/mock/config'

interface Props {
  open: boolean
  factor: DefaultFactor | null
  onClose: () => void
  onSave: (f: DefaultFactor) => void
}

export default function DefaultFactorFormModal({ open, factor, onClose, onSave }: Props) {
  const toast = useToast()
  const [form, setForm] = useState<DefaultFactor>(blank())
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setForm(factor ?? blank())
      setNote(factor?.remark ?? '')
    }
  }, [open, factor])

  const set = <K extends keyof DefaultFactor>(k: K, v: DefaultFactor[K]) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = () => {
    if (!form.objectType) return toast('请选择类型', 'error')
    if (!form.objectCode) return toast('请选择排放数据', 'error')
    if (!form.factorName) return toast('请选择目标因子', 'error')
    const f: DefaultFactor = {
      ...form,
      objectName: OBJECT_OPTIONS[form.objectType]?.find((o) => o.value === form.objectCode)?.label ?? form.objectCode,
      remark: note,
    }
    onSave(f)
  }

  /** 目标因子下拉选项：按所选因子库过滤，单位作为右侧补充信息，下拉内可直接搜索名称 / 单位 */
  const factorTreeOptions: TreeOption[] = useMemo(
    () =>
      FACTOR_OPTIONS.filter((o) => !form.factorLib || o.lib === form.factorLib).map((o) => ({
        label: o.label,
        value: o.value,
        extra: o.unit,
      })),
    [form.factorLib],
  )

  return (
    <Modal
      open={open}
      title={factor ? '编辑默认因子' : '新增默认因子'}
      size="lg"
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
          <label className="form-label">适用行业</label>
          <Select options={INDUSTRY_OPTIONS} value={form.industry} onChange={(e) => set('industry', e.target.value)} />
        </div>
        <div className="form-item">
          <label className="form-label">生命周期阶段</label>
          <Select placeholder="不限" options={LIFECYCLE_OPTIONS} value={form.lifecycle} onChange={(e) => set('lifecycle', e.target.value)} />
        </div>
        <div className="form-item">
          <label className="form-label required">类型</label>
          <Select options={OBJECT_TYPE_OPTIONS} value={form.objectType} onChange={(e) => { set('objectType', e.target.value); set('objectCode', '') }} />
        </div>
        <div className="form-item">
          <label className="form-label required">排放数据</label>
          <Select
            options={form.objectType ? OBJECT_OPTIONS[form.objectType] ?? [] : []}
            value={form.objectCode}
            disabled={!form.objectType}
            placeholder={form.objectType ? '请选择排放数据' : '请先选择类型'}
            onChange={(e) => set('objectCode', e.target.value)}
          />
        </div>
        <div className="form-item">
          <label className="form-label">区域</label>
          <Select placeholder="全国" options={REGION_OPTIONS} value={form.region} onChange={(e) => set('region', e.target.value)} />
        </div>
        <div className="form-item">
          <label className="form-label">适用年度</label>
          <Select placeholder="不限" options={YEAR_OPTIONS} value={form.year} onChange={(e) => set('year', e.target.value)} />
        </div>

        <div className="form-item">
          <label className="form-label">因子库</label>
          <Select
            options={FACTOR_LIB_OPTIONS}
            value={form.factorLib}
            placeholder="选择因子库"
            onChange={(e) => { set('factorLib', e.target.value); set('factorName', '') }}
          />
        </div>
        <div className="form-item">
          <label className="form-label required">目标因子</label>
          <CascaderSelect
            value={form.factorName}
            options={factorTreeOptions}
            disabled={!form.factorLib}
            placeholder={form.factorLib ? '选择因子（下拉内可搜索名称 / 单位）' : '请先选择因子库'}
            searchPlaceholder="搜索因子名称 / 单位"
            onChange={(value) => {
              const opt = FACTOR_OPTIONS.find((o) => o.value === value)
              set('factorName', value)
              if (opt) {
                set('factorLib', opt.lib)
                set('factorVersion', 'V1')
                set('factorValue', opt.factorValue)
                set('factorUnit', opt.unit)
              }
            }}
          />
        </div>
        <div className="form-item">
          <label className="form-label">因子单位</label>
          <div className="form-static mono">{form.factorUnit || '-'}</div>
        </div>
        <div className="form-item">
          <label className="form-label required">优先级</label>
          <Input
            type="number"
            value={String(form.priority)}
            min={1}
            onChange={(e) => set('priority', Number(e.target.value) || 1)}
          />
        </div>
        <div className="form-item form-item-full">
          <label className="form-label">备注</label>
          <Textarea value={note} maxLength={200} placeholder="备注（≤200 字）" onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

function blank(): DefaultFactor {
  return {
    id: `DF${Date.now()}`,
    industry: '',
    lifecycle: '',
    objectType: '物料',
    objectCode: '',
    objectName: '',
    region: '',
    year: '',
    factorName: '',
    factorLib: '',
    factorVersion: '',
    factorValue: '',
    factorUnit: '',
    priority: 10,
    status: 'enabled',
    updatedAt: new Date().toLocaleString('zh-CN').slice(0, 16).replace('/', '-'),
  }
}

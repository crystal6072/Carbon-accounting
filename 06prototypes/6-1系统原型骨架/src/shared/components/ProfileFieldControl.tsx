import { FormField, Input, Select, Textarea } from '@/shared/components'
import { REGION_TREE, regionTextOfValue } from '@/mock/tenant'
import type { TenantProfileFieldDef } from '@/types'

/** region 字段值（省,市,区）拆成三段 */
function splitRegion(value: string): [string, string, string] {
  const [province = '', city = '', district = ''] = (value || '').split(',')
  return [province, city, district]
}

/** 字段值 → 展示文案（region / 布尔 / 选项本地化；只读态与详情页共用） */
export function profileValueText(field: TenantProfileFieldDef, value: string): string {
  if (!value) return ''
  if (field.type === 'region') return regionTextOfValue(value) || value
  if (field.type === 'boolean') return value === '1' ? '是' : '否'
  if (field.type === 'select') return field.options?.find((item) => item.value === value)?.label ?? value
  if (field.type === 'multi_select') {
    return value
      .split(',')
      .map((item) => field.options?.find((option) => option.value === item)?.label ?? item)
      .join('、')
  }
  return value
}

/**
 * 单个扩展档案字段控件：按 field.type 渲染；region 走省市区三级联动。
 * disabled 时渲染为只读文本（租户端「租户信息」的法定资质类字段、开户表单的租户档预览）。
 */
export default function ProfileFieldControl({
  field,
  value,
  error,
  disabled = false,
  onChange,
}: {
  field: TenantProfileFieldDef
  value: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  if (disabled) {
    return (
      <FormField label={field.name} full={field.type === 'region' || field.type === 'textarea' || field.type === 'multi_select'}>
        <span className={`profile-readonly${value ? '' : ' is-empty'}`}>{profileValueText(field, value) || '未填'}</span>
      </FormField>
    )
  }

  if (field.type === 'region') {
    const [province, city, district] = splitRegion(value)
    const provinceNode = REGION_TREE.find((item) => item.value === province)
    const cityNodes = provinceNode?.children ?? []
    const cityNode = cityNodes.find((item) => item.value === city)
    const districtNodes = cityNode?.children ?? []
    return (
      <FormField label={field.name} required={field.required} error={error} full>
        <div className="tenant-region-row">
          <Select
            value={province}
            placeholder="省"
            options={REGION_TREE.map((item) => ({ label: item.label, value: item.value }))}
            onChange={(e) => onChange([e.target.value, '', ''].join(','))}
          />
          <Select
            value={city}
            placeholder="市"
            disabled={!province}
            options={cityNodes.map((item) => ({ label: item.label, value: item.value }))}
            onChange={(e) => onChange([province, e.target.value, ''].join(','))}
          />
          <Select
            value={district}
            placeholder="区 / 县"
            disabled={!city}
            options={districtNodes.map((item) => ({ label: item.label, value: item.value }))}
            onChange={(e) => onChange([province, city, e.target.value].join(','))}
          />
        </div>
      </FormField>
    )
  }

  if (field.type === 'select') {
    return (
      <FormField label={field.name} required={field.required} error={error}>
        <Select
          value={value}
          placeholder="请选择"
          options={(field.options ?? []).map((item) => ({ label: item.label, value: item.value }))}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormField>
    )
  }

  if (field.type === 'multi_select') {
    const picked = value ? value.split(',') : []
    return (
      <FormField label={field.name} required={field.required} error={error} full hint="可多选">
        <div className="tenant-checkbox-row">
          {(field.options ?? []).map((item) => (
            <label key={item.value} className={`tenant-checkbox${picked.includes(item.value) ? ' is-checked' : ''}`}>
              <input
                type="checkbox"
                checked={picked.includes(item.value)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...picked, item.value].join(',')
                      : picked.filter((v) => v !== item.value).join(','),
                  )
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </FormField>
    )
  }

  if (field.type === 'boolean') {
    return (
      <FormField label={field.name} required={field.required} error={error}>
        <Select
          value={value}
          placeholder="请选择"
          options={[
            { label: '是', value: '1' },
            { label: '否', value: '0' },
          ]}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormField>
    )
  }

  if (field.type === 'textarea') {
    return (
      <FormField label={field.name} required={field.required} error={error} full>
        <Textarea
          value={value}
          placeholder={field.placeholder ?? '请输入'}
          invalid={!!error}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormField>
    )
  }

  return (
    <FormField
      label={field.name}
      required={field.required}
      error={error}
      hint={field.maxLength ? `最长 ${field.maxLength} 字符` : undefined}
    >
      <Input
        type={field.type === 'date' ? 'date' : 'text'}
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        value={value}
        placeholder={field.placeholder ?? '请输入'}
        invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}

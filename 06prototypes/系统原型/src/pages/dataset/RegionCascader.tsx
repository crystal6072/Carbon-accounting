import { CascaderSelect } from '@/shared/components'
import { REGION_TREE } from './regionTree'

interface RegionCascaderProps {
  /** 「省 / 市 / 区」完整路径 */
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  /** 收起态展示完整「省 / 市 / 区」路径，默认开启（用户需一眼看到完整区划） */
  showFullPath?: boolean
}

/** 行政区划三级选择（省 / 市 / 区县）：企业上报表单使用 */
export default function RegionCascader({
  value,
  onChange,
  invalid,
  disabled,
  placeholder = '请选择省 / 市 / 区',
  showFullPath = true,
}: RegionCascaderProps) {
  return (
    <CascaderSelect
      value={value}
      options={REGION_TREE}
      invalid={invalid}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="搜索省 / 市 / 区县"
      showFullPath={showFullPath}
      onChange={(next) => onChange(next)}
    />
  )
}

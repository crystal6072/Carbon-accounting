import { useCallback, useEffect, useState } from 'react'
import { Button, Select } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { fetchFactors } from '@/mock'
import type { FactorSourceType, FormulaFactor } from '@/types'
import { factorUnitOptions } from './calcEngineMeta'
import './CalcEngine.css'

interface LibOption {
  code: string
  name: string
  value: string
  unit: string
}

interface FormulaFactorEditorProps {
  /** 字段清单（受控） */
  value: FormulaFactor[]
  onChange: (factors: FormulaFactor[]) => void
}

/** 「添加字段」可选字段类型：常量 / 变量 / 因子 */
const fieldTypeOptions: SelectOption[] = [
  { label: '常量', value: 'constant' },
  { label: '变量', value: 'variable' },
  { label: '因子', value: 'factor' },
]

/** 字段类型对应的默认命名与来源库标识 */
const fieldTypeDefaults: Record<'constant' | 'variable' | 'factor', { label: string; sourceLib: string }> = {
  constant: { label: '常量', sourceLib: '自定义常量' },
  variable: { label: '变量', sourceLib: '' },
  factor: { label: '因子', sourceLib: '排放因子库' },
}

const unitOptions: SelectOption[] = [
  { label: '无', value: '' },
  ...factorUnitOptions.map((item) => ({ label: item, value: item })),
]

/** 单位候选：当前单位不在候选内时补入首项（因子库带出的复合单位，如 kgCO₂e/kWh） */
const unitOptionsFor = (unit: string): SelectOption[] =>
  unit && !unitOptions.some((option) => option.value === unit)
    ? [{ label: unit, value: unit }, ...unitOptions]
    : unitOptions

/** 名称唯一化：重名时追加序号 */
function uniqueName(base: string, used: string[]): string {
  if (!used.includes(base)) return base
  let index = 2
  while (used.includes(`${base}${index}`)) index += 1
  return `${base}${index}`
}

/** 需在运行 / 填报侧取值的字段类型（活动数据、变量、参数占位） */
export const isRuntimeFactor = (type: FactorSourceType) =>
  type === 'activity' || type === 'variable' || type === 'parameter'

/** 判断名称是否仍为类型默认名（未被用户改过），用于因子带出时是否覆盖命名 */
const isDefaultFieldName = (name: string) => /^因子\d*$/.test(name)

/**
 * 字段编辑区：
 * 一行活动数据 + N 行字段（常量 / 变量 / 因子），字段名称可自定义；
 * 因子类字段在因子库中选择对应因子后自动带出数值与单位。
 */
export default function FormulaFactorEditor({ value, onChange }: FormulaFactorEditorProps) {
  const [factorsLib, setFactorsLib] = useState<LibOption[]>([])

  const load = useCallback(async () => {
    const factors = await fetchFactors()
    setFactorsLib(
      factors.map((item) => ({
        code: item.code,
        name: item.name,
        value: String(item.value),
        unit: `${item.numeratorUnit}/${item.denominatorUnit}`,
      })),
    )
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = (index: number, patch: Partial<FormulaFactor>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  const nextId = (suffix: string) => `FF-${Date.now().toString().slice(-6)}-${suffix}-${value.length + 1}`

  /** 添加字段：默认「变量」，可在行内切换为常量 / 因子 */
  const addField = () => {
    const used = value.map((item) => item.name)
    const count = value.filter((item) => item.sourceType === 'variable').length
    onChange([
      ...value,
      {
        id: nextId('v'),
        name: uniqueName(`变量${count + 1}`, used),
        sourceType: 'variable',
        sourceLib: '',
        sourceCode: '',
        sourceName: '',
        value: '',
        unit: '',
      },
    ])
  }

  /** 切换字段类型：重置取值相关字段并按类型重命名 */
  const changeType = (index: number, type: string) => {
    const target = fieldTypeDefaults[type as 'constant' | 'variable' | 'factor']
    if (!target) return
    const used = value.filter((_, i) => i !== index).map((item) => item.name)
    update(index, {
      sourceType: type as FactorSourceType,
      sourceLib: target.sourceLib,
      sourceCode: '',
      sourceName: '',
      value: '',
      unit: '',
      name: uniqueName(target.label, used),
    })
  }

  /** 选择因子：带出数值 / 单位；名称仍为默认时同步为因子名称（可再自定义） */
  const changeFactor = (index: number, code: string) => {
    const item = value[index]
    const target = factorsLib.find((entry) => entry.code === code)
    update(index, {
      sourceCode: code,
      sourceName: target?.name ?? '',
      name: target && isDefaultFieldName(item.name.trim()) ? uniqueName(target.name, value.filter((_, i) => i !== index).map((entry) => entry.name)) : item.name,
      value: target?.value ?? '',
      unit: target?.unit ?? '',
    })
  }

  return (
    <div className="ce-factor-list">
      {value.map((item, index) => {
        const fixedLabel =
          item.sourceType === 'activity'
            ? '活动数据'
            : item.sourceType === 'parameter'
              ? '参数（运行时填入）'
              : ''

        return (
          <div className="ce-factor-row" key={item.id}>
            {fixedLabel ? (
              <span className="ce-factor-label">{fixedLabel}</span>
            ) : (
              <Select
                value={item.sourceType}
                data-ann-target="formula.factor.type"
                options={fieldTypeOptions}
                onChange={(e) => changeType(index, e.target.value)}
              />
            )}

            {item.sourceType === 'factor' ? (
              <>
                <input
                  className="input"
                  value={item.name}
                  placeholder="字段名称，可自定义"
                  onChange={(e) => update(index, { name: e.target.value })}
                />
                <Select
                  value={item.sourceCode}
                  data-ann-target="formula.factor.pick"
                  placeholder="请选择因子"
                  options={factorsLib.map((entry) => ({
                    label: `${entry.name}（${entry.code}）`,
                    value: entry.code,
                  }))}
                  onChange={(e) => changeFactor(index, e.target.value)}
                />
                <span className="ce-factor-value" title="数值与单位由因子库带出">
                  {item.sourceCode ? `${item.value}${item.unit ? ` / ${item.unit}` : ''}` : '选择因子后自动带出数值与单位'}
                </span>
              </>
            ) : isRuntimeFactor(item.sourceType) ? (
              <>
                <input
                  className="input"
                  value={item.name}
                  placeholder="字段名称，可自定义"
                  onChange={(e) => update(index, { name: e.target.value })}
                />
                <Select
                  value={item.unit}
                  options={unitOptionsFor(item.unit)}
                  onChange={(e) => update(index, { unit: e.target.value })}
                />
                <span className="ce-factor-value">运行时取值（由填报 / 项目参数提供）</span>
              </>
            ) : (
              <>
                <input
                  className="input"
                  value={item.name}
                  placeholder="字段名称，可自定义"
                  onChange={(e) => update(index, { name: e.target.value })}
                />
                <input
                  className="input"
                  value={item.value}
                  placeholder="常量值，如 44/12"
                  onChange={(e) => update(index, { value: e.target.value })}
                />
                <Select
                  value={item.unit}
                  options={unitOptionsFor(item.unit)}
                  onChange={(e) => update(index, { unit: e.target.value })}
                />
              </>
            )}

            <Button size="small" data-ann-target="formula.factor.delete" onClick={() => remove(index)}>
              删除
            </Button>
          </div>
        )
      })}

      <div className="ce-add-row">
        <Button size="small" data-ann-target="formula.factor.add" onClick={addField}>
          + 添加字段
        </Button>
        <span className="ce-factor-label" style={{ width: 'auto' }}>
          支持字段类型：常量 / 变量 / 因子；名称可自定义，因子需在因子库中选择对应因子值。
        </span>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Select } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import type { PcfDataItemType } from '@/types'
import { ALL_TYPE_OPTIONS } from './pcfItemMeta'
import './AllocationCalcModal.css'

/** 回填到「产品建模」数据表格的一行 */
export interface AllocationCalcRow {
  name: string
  itemType: PcfDataItemType
  unit: string
  quantity: number
}

interface AllocationCalcModalProps {
  open: boolean
  onClose: () => void
  /** 点击「应用计算结果」后回传当前产品一行数据 */
  onApply: (row: AllocationCalcRow) => void
  /** 继承核算规则中的默认分配方法：传入后弹窗初始即采用该方式 */
  defaultMethod?: AllocMethod
}

type AllocMethod = 'weight' | 'quantity' | 'value'

/** 核算规则 `allocDefault`（质量 / 数量 / 经济价值）→ 分配方式 */
export function allocDefaultToMethod(value?: string): AllocMethod {
  switch (value) {
    case '质量':
      return 'weight'
    case '数量':
      return 'quantity'
    case '经济价值':
      return 'value'
    default:
      return 'weight'
  }
}

const METHOD_OPTIONS: SelectOption[] = [
  { label: '按重量分摊', value: 'weight' },
  { label: '按数量分摊', value: 'quantity' },
  { label: '按产值分摊', value: 'value' },
]

/** 单位选项：kg / 度 / 升 等常用计量单位 */
const UNIT_OPTIONS: SelectOption[] = [
  { label: 'kg', value: 'kg' },
  { label: 't', value: 't' },
  { label: '度（kWh）', value: 'kWh' },
  { label: '升（L）', value: 'L' },
  { label: 'm³', value: 'm³' },
  { label: '件', value: '件' },
]

/** 分摊方式 → 当前产品参数标签 */
const PARAM_LABEL: Record<AllocMethod, string> = {
  weight: '当前产品重量',
  quantity: '当前产品数量',
  value: '当前产品产值',
}

const toNumber = (text: string): number => {
  if (text.trim() === '') return NaN
  const value = Number(text)
  return Number.isFinite(value) ? value : NaN
}

/** 数值展示：最多 4 位小数，去掉末尾多余的 0 */
const formatNumber = (value: number, digits = 4): string => {
  if (!Number.isFinite(value)) return '-'
  const text = value.toFixed(digits).replace(/\.?0+$/, '')
  return text === '' || text === '-' ? '0' : text
}

const formatPercent = (ratio: number): string =>
  Number.isFinite(ratio) ? `${formatNumber(ratio * 100, 2)}%` : '-'

/**
 * 分配计算（轻量级辅助工具）：
 * 按「当前产品参数 / 全部产品参数合计」得出分配比例，把「原始总活动数据」折算为
 * 「当前产品实际填报数量」，应用后向产品建模数据表格回填当前产品一行。
 */
export default function AllocationCalcModal({ open, onClose, onApply, defaultMethod }: AllocationCalcModalProps) {
  const [itemName, setItemName] = useState('')
  const [itemType, setItemType] = useState<PcfDataItemType>('energy')
  const [unit, setUnit] = useState('L')
  const [method, setMethod] = useState<AllocMethod>('weight')
  const [currentParam, setCurrentParam] = useState('')
  const [allParam, setAllParam] = useState('')
  const [totalData, setTotalData] = useState('')

  /** 每次打开重置为初始值，避免沿用上一次的计算结果；分配方法继承核算规则默认值 */
  useEffect(() => {
    if (!open) return
    setItemName('')
    setItemType('energy')
    setUnit('L')
    setMethod(defaultMethod ?? 'weight')
    setCurrentParam('')
    setAllParam('')
    setTotalData('')
  }, [open, defaultMethod])

  const calc = useMemo(() => {
    const current = toNumber(currentParam)
    const all = toNumber(allParam)
    const total = toNumber(totalData)
    const hasRatioBase = Number.isFinite(all) && all > 0
    const ratio = hasRatioBase ? current / all : NaN
    const hasTotal = Number.isFinite(total)
    return {
      ratio,
      quantity: hasTotal && hasRatioBase ? total * ratio : NaN,
    }
  }, [currentParam, allParam, totalData])

  const canApply =
    itemName.trim() !== '' &&
    Number.isFinite(calc.ratio) &&
    Number.isFinite(calc.quantity)

  const handleApply = () => {
    if (!canApply) return
    onApply({
      name: itemName.trim(),
      itemType,
      unit,
      quantity: Number(calc.quantity.toFixed(4)),
    })
  }

  const currentLabel = PARAM_LABEL[method]

  return (
    <Modal
      open={open}
      title="分配计算"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={!canApply} onClick={handleApply}>
            应用计算结果
          </Button>
        </>
      }
    >
      <div className="alloc-calc">
        <div className="alloc-calc-block">
          <div className="alloc-calc-block-title">基础数据配置</div>
          <div className="form-grid">
            <div className="form-item">
              <label className="form-label required">分摊项名称</label>
              <Input
                value={itemName}
                placeholder="如 柴油消耗"
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">数据项类型</label>
              <Select
                options={ALL_TYPE_OPTIONS}
                value={itemType}
                onChange={(e) => setItemType(e.target.value as PcfDataItemType)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">单位</label>
              <Select options={UNIT_OPTIONS} value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="alloc-calc-block">
          <div className="alloc-calc-block-title">分摊参数配置</div>
          <div className="form-grid">
            <div className="form-item">
              <label className="form-label">分摊方式</label>
              <Select
                options={METHOD_OPTIONS}
                value={method}
                onChange={(e) => setMethod(e.target.value as AllocMethod)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">原始总活动数据</label>
              <Input
                value={totalData}
                inputMode="decimal"
                placeholder="如 100（表示总消耗量）"
                onChange={(e) => setTotalData(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">{currentLabel}</label>
              <Input
                value={currentParam}
                inputMode="decimal"
                placeholder="如 1 个当前产品的重量"
                onChange={(e) => setCurrentParam(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">本期全部产品合计</label>
              <Input
                value={allParam}
                inputMode="decimal"
                placeholder="含当前产品在内的全部产品，口径同分摊方式"
                onChange={(e) => setAllParam(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="alloc-calc-block">
          <div className="alloc-calc-block-title">
            计算结果
            <span className="alloc-calc-auto">实时计算</span>
          </div>
          <div className="alloc-calc-result-grid">
            <div className="alloc-calc-result-item is-primary">
              <span className="alloc-calc-result-label">当前产品分配值</span>
              <span className="alloc-calc-result-value">
                {formatNumber(calc.quantity)}
                {Number.isFinite(calc.quantity) && unit ? <em>{unit}</em> : null}
              </span>
            </div>
            <div className="alloc-calc-result-item">
              <span className="alloc-calc-result-label">分配比例</span>
              <span className="alloc-calc-result-value">{formatPercent(calc.ratio)}</span>
            </div>
          </div>
          <div className="alloc-calc-formula">
            计算口径：分配比例 = 单个当前产品参数 ÷ 本期全部产品合计；分配值 = 原始总活动数据 × 分配比例。
          </div>
        </div>
      </div>
    </Modal>
  )
}

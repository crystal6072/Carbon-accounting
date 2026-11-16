import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal } from '@/shared/components'
import type { PcfBiocarbon } from '@/types'
import { BIOCARBON_NET_FORMULA, calcBiocarbonValues, formatBiocarbon, toBiocarbonNumber } from './biocarbonMeta'

interface BiocarbonModalProps {
  open: boolean
  /** 当前已保存的生物碳核算值（打开时回显参数，便于修改后重算） */
  value: PcfBiocarbon
  /** 只读模式（查看 / 锁定态）：参数不可编辑，「计算并回显」置灰，仅用于查看计算结果 */
  readOnly?: boolean
  onClose: () => void
  /** 点击「计算并回显」后回传参数 + 三项生物碳值 */
  onApply: (value: PcfBiocarbon) => void
}

/**
 * 碳固存计算弹窗（步骤①「生物碳核算」面板）：
 * - 按「采伐获取 → 使用 → 废弃」三阶段录入参数，弹窗内实时预览三项结果；
 * - 点击「计算并回显」后把参数与结果回填到面板的生物碳值；
 * - `readOnly` 为真时（查看 / 锁定态）面板链接仍按编辑态样式展示，弹窗进入只读查看。
 */
export default function BiocarbonModal({ open, value, readOnly = false, onClose, onApply }: BiocarbonModalProps) {
  const [mass, setMass] = useState('') // 竹木部分质量 M（kg）
  const [carbonRate, setCarbonRate] = useState('') // 含碳率 cf（小数，如 0.47）
  const [moisture, setMoisture] = useState('') // 干基含水率 ω（%）
  const [life, setLife] = useState('') // 产品设计寿命（年）
  const [incineration, setIncineration] = useState('') // 竹木部分焚烧比例（%）

  /** 每次打开按已保存值回显，避免沿用上一次未应用的临时输入 */
  useEffect(() => {
    if (!open) return
    setMass(value.mass != null ? String(value.mass) : '')
    setCarbonRate(value.carbonRate != null ? String(value.carbonRate) : '')
    setMoisture(value.moisture != null ? String(value.moisture) : '')
    setLife(value.life != null ? String(value.life) : '')
    setIncineration(value.incinerationRatio != null ? String(value.incinerationRatio) : '')
  }, [open, value])

  const params = useMemo<PcfBiocarbon>(
    () => ({
      mass: toBiocarbonNumber(mass),
      carbonRate: toBiocarbonNumber(carbonRate),
      moisture: toBiocarbonNumber(moisture),
      life: toBiocarbonNumber(life),
      incinerationRatio: toBiocarbonNumber(incineration),
      sequestration: null,
      annualSequestration: null,
      release: null,
      netStorage: null,
    }),
    [mass, carbonRate, moisture, life, incineration],
  )

  const calc = useMemo(() => calcBiocarbonValues(params), [params])

  /** CS 有效且 > 0 才允许回显 */
  const canApply = calc.sequestration != null && calc.sequestration > 0

  const handleApply = () => {
    if (!canApply) return
    onApply({ ...params, ...calc })
  }

  return (
    <Modal
      open={open}
      title="碳固存计算"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={!canApply || readOnly} onClick={handleApply}>
            计算并回显
          </Button>
        </>
      }
    >
      <div className="bio-calc">
        <div className="bio-calc-tip">
          {readOnly
            ? '生物碳固存计算（竹木专用，查看模式）：下方为按「采伐获取 → 使用 → 废弃」三阶段录入并保存的参数与计算结果，参数不可编辑。'
            : '生物碳固存计算（竹木专用）：按「采伐获取 → 使用 → 废弃」三阶段录入参数，点击「计算并回显」后把生物碳净储量回显到步骤①「生物碳核算」面板。'}
        </div>

        {/* 区块一：初始碳固存（采伐 / 获取阶段） */}
        <div className="bio-calc-block">
          <div className="bio-calc-block-title">
            ① 初始碳固存
            <span className="bio-calc-stage">采伐 / 获取阶段</span>
          </div>
          <div className="pcf-grid">
            <div className="form-item">
              <label className="form-label required">竹木部分质量 (M)</label>
              <Input value={mass} inputMode="decimal" placeholder="如 100（kg）" disabled={readOnly} onChange={(e) => setMass(e.target.value)} />
            </div>
            <div className="form-item">
              <label className="form-label required">含碳率 (cf)</label>
              <Input
                value={carbonRate}
                inputMode="decimal"
                placeholder="如 0.47（小数）"
                disabled={readOnly}
                onChange={(e) => setCarbonRate(e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label required">干基含水率 (ω)</label>
              <Input
                value={moisture}
                inputMode="decimal"
                placeholder="如 12（%）"
                disabled={readOnly}
                onChange={(e) => setMoisture(e.target.value)}
              />
            </div>
          </div>
          <div className="bio-calc-result">
            <span className="bio-calc-result-label">初始碳固存量（CO₂当量, CS）</span>
            <span className="bio-calc-result-value">
              {formatBiocarbon(calc.sequestration)}
              {calc.sequestration != null && <em>kg</em>}
            </span>
          </div>
          <div className="bio-calc-formula">
            计算口径：CS = 44/12 × cf × M ÷ (100 + ω) × 100（cf 为小数，如 0.47；结果按 CO₂ 当量计）。
          </div>
        </div>

        {/* 区块二：长期碳固存展示（使用阶段） */}
        <div className="bio-calc-block">
          <div className="bio-calc-block-title">
            ② 长期碳固存展示
            <span className="bio-calc-stage">使用阶段</span>
          </div>
          <div className="pcf-grid">
            <div className="form-item">
              <label className="form-label">产品设计寿命</label>
              <Input value={life} inputMode="decimal" placeholder="如 20（年）" disabled={readOnly} onChange={(e) => setLife(e.target.value)} />
            </div>
          </div>
          <div className="bio-calc-result">
            <span className="bio-calc-result-label">年均持续固存量</span>
            <span className="bio-calc-result-value">
              {formatBiocarbon(calc.annualSequestration)}
              {calc.annualSequestration != null && <em>kg/年</em>}
            </span>
          </div>
          <div className="bio-calc-formula">计算口径：年均持续固存量 = CS ÷ 产品设计寿命（年）。</div>
        </div>

        {/* 区块三：废弃碳释放（废弃阶段） */}
        <div className="bio-calc-block">
          <div className="bio-calc-block-title">
            ③ 废弃碳释放
            <span className="bio-calc-stage">废弃阶段</span>
          </div>
          <div className="pcf-grid">
            <div className="form-item">
              <label className="form-label">竹木部分焚烧比例</label>
              <Input
                value={incineration}
                inputMode="decimal"
                placeholder="如 30（%）"
                disabled={readOnly}
                onChange={(e) => setIncineration(e.target.value)}
              />
            </div>
          </div>
          <div className="bio-calc-result">
            <span className="bio-calc-result-label">废弃焚烧释放量</span>
            <span className="bio-calc-result-value">
              {formatBiocarbon(calc.release)}
              {calc.release != null && <em>kg</em>}
            </span>
          </div>
          <div className="bio-calc-formula">计算口径：废弃焚烧释放量 = CS × 焚烧比例（%）。</div>
        </div>

        {/* 区块四：生物碳净储量（最终回显值） */}
        <div className="bio-calc-block is-emphasis">
          <div className="bio-calc-block-title">
            ④ 生物碳净储量
            <span className="bio-calc-stage">最终回显值</span>
          </div>
          <div className="bio-calc-result">
            <span className="bio-calc-result-label">生物碳净储量</span>
            <span className="bio-calc-result-value">
              {formatBiocarbon(calc.netStorage)}
              {calc.netStorage != null && <em>kgCO₂e</em>}
            </span>
          </div>
          <div className="bio-calc-formula">计算口径：{BIOCARBON_NET_FORMULA}。</div>
        </div>
      </div>
    </Modal>
  )
}
import { useState } from 'react'
import type { PcfBiocarbon } from '@/types'
import { formatBiocarbon } from './biocarbonMeta'
import BiocarbonModal from './BiocarbonModal'
import './BiocarbonPanel.css'

interface BiocarbonPanelProps {
  value: PcfBiocarbon
  onChange: (value: PcfBiocarbon) => void
  disabled?: boolean
}

/**
 * 生物碳核算面板（步骤①「目标与范围」）：
 * - 面板最终回显「生物碳净储量」（初始碳固存 − 废弃焚烧释放）；
 * - 点击「碳固存计算」打开参数录入弹窗，计算后把净储量回显到只读值框；
 * - 结果随步骤①一并保存（`project.biocarbon`），供建模 / 核算引用。
 */
export default function BiocarbonPanel({ value, onChange, disabled = false }: BiocarbonPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bio-panel" data-ann-target="pcf.step1.biocarbon">
      <div className="bio-field">
        <div className="bio-field-head">
          <span className="bio-field-label">生物碳净储量</span>
          <button
            type="button"
            className="bio-field-link"
            data-ann-target="pcf.step1.biocarbon.calc"
            onClick={() => setModalOpen(true)}
          >
            碳固存计算
          </button>
        </div>
        <div className="bio-field-value" title="生物碳净储量 = 初始碳固存 CS − 废弃焚烧释放">
          {value.netStorage != null ? `${formatBiocarbon(value.netStorage)} kgCO₂e` : ''}
        </div>
      </div>

      <BiocarbonModal
        open={modalOpen}
        value={value}
        readOnly={disabled}
        onClose={() => setModalOpen(false)}
        onApply={(next) => {
          onChange(next)
          setModalOpen(false)
        }}
      />
    </div>
  )
}
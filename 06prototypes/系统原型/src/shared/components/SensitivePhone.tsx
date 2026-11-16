import { useState } from 'react'
import { Icon } from '@/shared/components'

interface SensitivePhoneProps {
  /** 脱敏后的展示号码（如 138****1002），由 GET 接口直接返回，前端不持有明文 */
  masked: string
  /**
   * 明文反查（受控权限接口）：悬停「👁️」小眼睛时调用，返回完整号码。
   * 未传则不提供明文查看（列表 / 详情默认脱敏，杜绝 F12 抓包泄露明文）。
   */
  onReveal?: () => Promise<string>
  className?: string
}

/**
 * 统一手机号脱敏展示组件（§成员管理 · 手机号专项）。
 * - 默认展示脱敏号码；
 * - 右侧「👁️」小眼睛，Hover 悬停时调用受控权限接口回明文，气泡展示；
 * - 供列表页 / 详情页复用，保证交互体验一致。
 */
export default function SensitivePhone({ masked, onReveal, className = '' }: SensitivePhoneProps) {
  const [plain, setPlain] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleEnter = async () => {
    setOpen(true)
    if (!onReveal || plain !== null) return
    setLoading(true)
    try {
      setPlain(await onReveal())
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className={`sensitive-phone ${className}`}>
      <span className="sensitive-phone-mask mono">{masked || '—'}</span>
      {onReveal && (
        <span
          className="sensitive-phone-eye"
          onMouseEnter={() => void handleEnter()}
          onMouseLeave={() => setOpen(false)}
          aria-label="查看明文手机号"
        >
          <Icon name="eye" size={14} />
          {open && <span className="sensitive-phone-tip">{loading ? '查询中…' : plain ?? masked}</span>}
        </span>
      )}
    </span>
  )
}

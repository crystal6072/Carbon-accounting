import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, useToast } from '@/shared/components'
import type { MemberDetail, PasswordResetMode } from '@/types'
import { resetMemberPassword } from '@/mock/member'
import { PASSWORD_HINT } from './memberMeta'

interface MemberResetModalProps {
  open: boolean
  tenantId: string
  member: MemberDetail | null
  onClose: () => void
}

/**
 * 成员管理 · 重置密码（§5.7）：租户管理员对本租户成员发起，
 * 新密码一次性展示，旧密码立即失效、目标账号全部会话失效、置首登改密。
 * 主管理员密码由超管在租户管理重置（E10，页面不提供入口）；已移出成员不可重置（E11）。
 */
export default function MemberResetModal({ open, tenantId, member, onClose }: MemberResetModalProps) {
  const toast = useToast()
  const [mode, setMode] = useState<PasswordResetMode>('random')
  const [customPassword, setCustomPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setMode('random')
      setCustomPassword('')
      setConfirmPassword('')
      setPlaintext('')
    }
  }, [open])

  const customInvalid =
    mode === 'custom' &&
    (customPassword.length < 8 || confirmPassword.length === 0 || customPassword !== confirmPassword)

  const handleSubmit = async () => {
    if (!member) return
    setSubmitting(true)
    try {
      const pwd = await resetMemberPassword(tenantId, member.id, mode, mode === 'custom' ? customPassword : undefined)
      setPlaintext(pwd)
      toast('密码已重置')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`重置密码 · ${member?.name ?? ''}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{plaintext ? '关闭' : '取消'}</Button>
          {!plaintext && (
            <Button variant="primary" disabled={submitting || customInvalid} onClick={() => void handleSubmit()}>
              确认重置
            </Button>
          )}
        </>
      }
    >
      {!plaintext ? (
        <>
          <p className="form-tip" style={{ marginTop: 0 }}>
            重置后旧密码立即失效，目标账号全部会话失效（含其他租户，密码为账号级凭证），并标记首登改密。新密码仅展示一次。
          </p>

          <FormField label="重置方式" required>
            <span className="member-reset-modes">
              <label className="member-reset-mode">
                <input type="radio" name="member-reset-mode" checked={mode === 'random'} onChange={() => setMode('random')} />
                <span>随机生成</span>
              </label>
              <label className="member-reset-mode">
                <input type="radio" name="member-reset-mode" checked={mode === 'custom'} onChange={() => setMode('custom')} />
                <span>自定义密码</span>
              </label>
            </span>
          </FormField>

          {mode === 'custom' && (
            <>
              <FormField
                label="新密码"
                required
                hint={PASSWORD_HINT}
                error={customPassword.length > 0 && customPassword.length < 8 ? '密码长度不少于 8 位' : ''}
              >
                <Input
                  type="password"
                  value={customPassword}
                  placeholder="请输入新密码"
                  onChange={(e) => setCustomPassword(e.target.value)}
                />
              </FormField>
              <FormField
                label="确认新密码"
                required
                error={confirmPassword.length > 0 && customPassword !== confirmPassword ? '两次输入的密码不一致' : ''}
              >
                <Input
                  type="password"
                  value={confirmPassword}
                  placeholder="请再次输入新密码"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormField>
            </>
          )}
        </>
      ) : (
        <>
          <p className="form-tip" style={{ marginTop: 0 }}>
            请抄录并线下交付给账号持有人。关闭本弹窗后不可再次查看，遗失只能再次重置（不提供明文找回）。
          </p>
          <div className="member-onetime" data-ann-target="member.reset.onetime">
            <span className="member-onetime-code">{plaintext}</span>
            <span className="form-tip">一次性密码</span>
          </div>
        </>
      )}
    </Modal>
  )
}

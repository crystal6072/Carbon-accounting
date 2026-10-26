import { useEffect, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, useToast } from '@/shared/components'
import type { AccountStatus, PasswordResetMode, PlatformAccount, TenantMembership } from '@/types'
import { deleteAccount, resetPassword, updateAccountStatus } from '@/mock/account'

export type AccountConfirmMode = 'disable' | 'enable' | 'cancel'

interface AccountConfirmModalProps {
  open: boolean
  account: PlatformAccount | null
  mode: AccountConfirmMode
  onClose: () => void
  onDone: (mode: AccountConfirmMode) => void
}

const TITLE: Record<AccountConfirmMode, string> = {
  disable: '确认停用',
  enable: '确认启用',
  cancel: '确认注销',
}

const ACTION: Record<AccountConfirmMode, string> = {
  disable: '停用',
  enable: '启用',
  cancel: '注销',
}

/** 名下有效租户身份（停用影响提示：N 个租户身份将同时失效） */
function activeMemberships(account: PlatformAccount): TenantMembership[] {
  return account.tenantMemberships.filter((item) => item.status === 'active')
}

/**
 * 平台账号 · 停用 / 启用 / 注销二次确认。
 * 停用与注销为账号级操作：名下有效租户身份的登录同时失效，需在弹窗中明示（§5.4 D01）。
 */
export default function AccountConfirmModal({ open, account, mode, onClose, onDone }: AccountConfirmModalProps) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [ack, setAck] = useState(false)

  useEffect(() => {
    if (open) setAck(false)
  }, [open])

  const memberships = account ? activeMemberships(account) : []
  const showImpact = (mode === 'disable' || mode === 'cancel') && memberships.length > 0

  const handleConfirm = async () => {
    if (!account) return
    if (showImpact && !ack) {
      toast('请先确认「该账号名下租户身份将同时失效」', 'error')
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'cancel') {
        await deleteAccount(account.id)
        toast('注销成功，账号数据已删除')
      } else {
        const next: AccountStatus = mode === 'disable' ? 'disabled' : 'enabled'
        await updateAccountStatus(account.id, next)
        toast(mode === 'enable' ? '启用成功' : '停用成功')
      }
      onDone(mode)
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={<span data-ann-target="account.confirm.modal">{TITLE[mode]}</span>}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="account.confirm.cancel" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" disabled={submitting} data-ann-target="account.confirm.ok" onClick={() => void handleConfirm()}>
            {TITLE[mode]}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>
            确认{ACTION[mode]}账号「{account?.displayName}」（{account?.loginName}）？
          </div>
          {mode === 'disable' && (
            <div className="modal-confirm-tip">停用后该账号无法登录平台后台，会话立即失效；平台角色保留，可重新启用。</div>
          )}
          {mode === 'enable' && <div className="modal-confirm-tip">启用后该账号恢复登录能力，需已持有平台角色。</div>}
          {mode === 'cancel' && (
            <div className="modal-confirm-tip">注销为不可逆操作：账号数据将被删除，平台角色关联同步回收，登录名与手机号一并释放（可重新注册）。</div>
          )}
        </div>
      </div>

      {showImpact && (
        <div className="account-impact" data-ann-target="account.confirm.impact">
          <span className="account-impact-title">
            <Icon name="warning" size={14} />
            该账号名下有 {memberships.length} 个租户身份将同时失效
          </span>
          <ul className="account-impact-list">
            {memberships.map((item) => (
              <li key={item.id}>
                {item.tenantName}
                {item.primary ? '（主管理员）' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showImpact && (
        <FormField label="确认影响" required annTarget="account.confirm.ack">
          <label className="account-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>已知悉：{ACTION[mode]}后该账号在以上租户的登录同时失效，成员关系记录保留。</span>
          </label>
        </FormField>
      )}
    </Modal>
  )
}

/** 平台账号 · 重置密码：仅超管可操作，不可重置自己，新密码一次性展示 */
interface AccountResetModalProps {
  open: boolean
  account: PlatformAccount | null
  onClose: () => void
}

const PASSWORD_HINT = '不少于 8 位，且包含大写字母、小写字母、数字、特殊字符中的三类'

export function AccountResetModal({ open, account, onClose }: AccountResetModalProps) {
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

  const canSubmit = !customInvalid

  const handleSubmit = async () => {
    if (!account) return
    setSubmitting(true)
    try {
      const pwd = await resetPassword(account.id, mode, mode === 'custom' ? customPassword : undefined)
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
      title={<span data-ann-target="account.reset.modal">{`重置密码 · ${account?.displayName ?? ''}`}</span>}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="account.reset.cancel" onClick={onClose}>
            {plaintext ? '关闭' : '取消'}
          </Button>
          {!plaintext && (
            <Button variant="primary" disabled={submitting || !canSubmit} data-ann-target="account.reset.ok" onClick={() => void handleSubmit()}>
              确认重置
            </Button>
          )}
        </>
      }
    >
      {!plaintext ? (
        <>
          <p className="form-tip" style={{ marginTop: 0 }}>
            重置后旧密码立即失效，目标账号全部会话失效，并标记首登改密。新密码仅展示一次。
          </p>

          <FormField label="重置方式" required annTarget="account.reset.mode">
            <span className="account-reset-modes">
              <label className="account-reset-mode">
                <input type="radio" name="reset-mode" checked={mode === 'random'} onChange={() => setMode('random')} />
                <span>随机生成</span>
              </label>
              <label className="account-reset-mode">
                <input type="radio" name="reset-mode" checked={mode === 'custom'} onChange={() => setMode('custom')} />
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
                annTarget="account.reset.custom"
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
            请抄录并线下交付给账号持有人。关闭本弹窗后不可再次查看，遗失只能重新重置。
          </p>
          <div className="account-onetime" data-ann-target="account.reset.onetime">
            <span className="account-onetime-code">{plaintext}</span>
            <span className="form-tip">一次性密码</span>
          </div>
        </>
      )}
    </Modal>
  )
}

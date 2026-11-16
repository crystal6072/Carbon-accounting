import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FormField, Icon, Input, Modal, Select, useToast } from '@/shared/components'
import type { AccountStatus, PasswordResetMode, PlatformAccount, TenantMembership } from '@/types'
import { accountKindOf, deleteAccount, resetPassword, updateAccountStatus } from '@/mock/account'
import { tenantsLosingLastAdmin } from '@/mock/tenant'

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

/** 租户账号操作原因（枚举 + 可选补充说明）：平台对租户账号的兜底操作必须可追责 */
export const TENANT_ACCOUNT_REASONS = [
  { label: '忘记密码 / 无法登录', value: 'forgot' },
  { label: '人员失联 / 离职交接', value: 'lost' },
  { label: '安全事件（疑似盗号）', value: 'security' },
  { label: '租户管理员无法处理，平台协助', value: 'assist' },
]

/**
 * 账号 · 停用 / 启用 / 注销二次确认（平台账号与租户成员共用，规则一致）。
 *
 * - 文案按账号类型分支：平台账号讲「平台后台」，租户成员讲「所属租户」；
 * - 停用 / 注销为账号级操作，名下有效租户身份同时失效，弹窗必须明示；
 * - 对租户成员操作时**原因必填**（枚举 + 补充说明），并双写审计，平台兜底可追责；
 * - 停用前置按「操作后该租户是否还有可用管理员」判定（E19）：命中则禁用确认按钮，
 *   直接给「去更换主管理员」出口，避免留空窗。
 */
export default function AccountConfirmModal({ open, account, mode, onClose, onDone }: AccountConfirmModalProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [ack, setAck] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonNote, setReasonNote] = useState('')

  useEffect(() => {
    if (open) {
      setAck(false)
      setReason('')
      setReasonNote('')
    }
  }, [open])

  const memberships = account ? activeMemberships(account) : []
  const showImpact = (mode === 'disable' || mode === 'cancel') && memberships.length > 0
  const isTenantAccount = !!account && accountKindOf(account) === 'tenant'

  /** 停用后该租户将无可用管理员（E19）：阻断并引导先交接 */
  const blocked = useMemo(
    () => (mode === 'disable' && account ? tenantsLosingLastAdmin(account.id) : []),
    [mode, account],
  )

  const reasonText = reason ? `${TENANT_ACCOUNT_REASONS.find((item) => item.value === reason)?.label ?? ''}${reasonNote.trim() ? `：${reasonNote.trim()}` : ''}` : ''
  const reasonRequired = isTenantAccount && mode !== 'cancel'

  const handleConfirm = async () => {
    if (!account) return
    if (blocked.length > 0) return
    if (showImpact && !ack) {
      toast('请先确认「该账号名下租户身份将同时失效」', 'error')
      return
    }
    if (reasonRequired && !reason) {
      toast('请选择操作原因', 'error')
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'cancel') {
        await deleteAccount(account.id)
        toast('注销成功，账号数据已删除')
      } else {
        const next: AccountStatus = mode === 'disable' ? 'disabled' : 'enabled'
        await updateAccountStatus(account.id, next, reasonText)
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
          {blocked.length > 0 && (
            <Button variant="primary" data-ann-target="account.confirm.goto-admin" onClick={() => navigate(`/system/tenant/${blocked[0].tenantId}`)}>
              去更换主管理员
            </Button>
          )}
          <Button
            variant="primary"
            disabled={submitting || blocked.length > 0}
            data-ann-target="account.confirm.ok"
            onClick={() => void handleConfirm()}
          >
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
          {mode === 'disable' && !isTenantAccount && (
            <div className="modal-confirm-tip">停用后该账号无法登录平台后台，会话立即失效；平台角色保留，可重新启用。</div>
          )}
          {mode === 'disable' && isTenantAccount && (
            <div className="modal-confirm-tip">停用后该账号无法登录任何租户系统；其名下租户的会话立即失效，成员关系与租户角色保留，可重新启用。</div>
          )}
          {mode === 'enable' && !isTenantAccount && (
            <div className="modal-confirm-tip">启用后该账号恢复登录能力，需已持有平台角色。</div>
          )}
          {mode === 'enable' && isTenantAccount && (
            <div className="modal-confirm-tip">启用后该账号恢复登录能力；此前被禁用的成员关系不随之恢复，仍由租户管理员在成员管理中启用。</div>
          )}
          {mode === 'cancel' && (
            <div className="modal-confirm-tip">
              注销为不可逆操作：账号数据将被删除，平台角色关联同步回收，账号与手机号一并释放（可重新注册）
              {memberships.length > 0
                ? `；该账号在以上 ${memberships.length} 个租户的成员关系将同时置为「已移出」，成员记录保留供追溯。`
                : '。'}
            </div>
          )}
        </div>
      </div>

      {blocked.length > 0 && (
        <div className="account-impact" data-ann-target="account.confirm.admin-vacuum">
          <span className="account-impact-title">
            <Icon name="warning" size={14} />
            该人员为在任租户管理员，暂时不允许停用
          </span>
          <ul className="account-impact-list">
            {blocked.map((item) => (
              <li key={item.tenantId}>
                {item.tenantName}
                <span className="text-tertiary">（停用后将无可用管理员）</span>
              </li>
            ))}
          </ul>
          <div className="account-impact-note">
            请先到「租户管理 → 更换主管理员」完成交接（可在更换弹窗内选择接任者或现场新建），再停用本账号。
          </div>
        </div>
      )}

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
            <span>
              已知悉：{ACTION[mode]}后该账号在以上租户的
              {mode === 'cancel' ? '成员关系置为「已移出」' : '登录同时失效'}，成员记录保留。
            </span>
          </label>
        </FormField>
      )}

      {reasonRequired && (
        <>
          <FormField label="操作原因" required annTarget="account.confirm.reason">
            <Select
              value={reason}
              placeholder="请选择原因"
              options={TENANT_ACCOUNT_REASONS}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          <FormField label="补充说明" hint="选填；将写入平台审计与租户侧审计">
            <Input
              value={reasonNote}
              placeholder="例如：管理员本人反馈忘记密码，已电话核实身份"
              onChange={(e) => setReasonNote(e.target.value)}
            />
          </FormField>
        </>
      )}
    </Modal>
  )
}

/**
 * 平台账号 · 重置密码：仅超管可操作，新密码一次性展示。
 * 规则：不可重置自己（E10）；**唯一例外是系统内置根账号本人**——根账号仅可重置自己的密码，
 * 他人对根账号重置一律拒绝（E24）。重置后标记首登改密，下次登录强制换新密码。
 */
interface AccountResetModalProps {
  open: boolean
  account: PlatformAccount | null
  onClose: () => void
  /** 来源入口：1 = 租户管理（平台在租户详情兜底运维）/ 2 = 账号管理（默认） */
  channel?: 1 | 2
  /** 来源入口 = 1 时的租户上下文（写入重置记录） */
  tenantId?: string
}

const PASSWORD_HINT = '不少于 8 位，且包含大写字母、小写字母、数字、特殊字符中的三类'

export function AccountResetModal({ open, account, onClose, channel = 2, tenantId }: AccountResetModalProps) {
  const toast = useToast()
  const [mode, setMode] = useState<PasswordResetMode>('random')
  const [customPassword, setCustomPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonNote, setReasonNote] = useState('')

  useEffect(() => {
    if (open) {
      setMode('random')
      setCustomPassword('')
      setConfirmPassword('')
      setPlaintext('')
      setReason('')
      setReasonNote('')
    }
  }, [open])

  const customInvalid =
    mode === 'custom' &&
    (customPassword.length < 8 || confirmPassword.length === 0 || customPassword !== confirmPassword)

  const canSubmit = !customInvalid

  const isTenantAccount = !!account && accountKindOf(account) === 'tenant'
  const memberships = account ? activeMemberships(account) : []
  const reasonRequired = isTenantAccount
  const reasonText = reason
    ? `${TENANT_ACCOUNT_REASONS.find((item) => item.value === reason)?.label ?? ''}${reasonNote.trim() ? `：${reasonNote.trim()}` : ''}`
    : ''

  const handleSubmit = async () => {
    if (!account) return
    if (reasonRequired && !reason) {
      toast('请选择重置原因', 'error')
      return
    }
    setSubmitting(true)
    try {
      const pwd = await resetPassword(
        account.id,
        mode,
        mode === 'custom' ? customPassword : undefined,
        // 租户成员走 tenant_member（reset_type = 4：超管兜底重置租户成员）
        isTenantAccount ? 'tenant_member' : 'admin',
        reasonText,
        // 来源入口：1 = 租户管理（租户详情成员兜底）/ 2 = 账号管理
        isTenantAccount ? { channel, tenantId } : undefined,
      )
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
            <Button
              variant="primary"
              disabled={submitting || !canSubmit || (reasonRequired && !reason)}
              data-ann-target="account.reset.ok"
              onClick={() => void handleSubmit()}
            >
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
            {isTenantAccount && ' 该账号为租户成员，密码是账号级凭证：重置将影响其所属全部租户的会话。'}
          </p>

          {isTenantAccount && memberships.length > 0 && (
            <div className="account-impact" data-ann-target="account.reset.impact">
              <span className="account-impact-title">
                <Icon name="warning" size={14} />
                该账号同时属于 {memberships.length} 个租户，重置将使其全部会话失效
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

          {reasonRequired && (
            <>
              <FormField label="重置原因" required annTarget="account.reset.reason">
                <Select
                  value={reason}
                  placeholder="请选择原因"
                  options={TENANT_ACCOUNT_REASONS}
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormField>
              <FormField label="补充说明" hint="选填；写入平台审计与租户侧审计">
                <Input
                  value={reasonNote}
                  placeholder="例如：管理员本人反馈忘记密码，已电话核实身份"
                  onChange={(e) => setReasonNote(e.target.value)}
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

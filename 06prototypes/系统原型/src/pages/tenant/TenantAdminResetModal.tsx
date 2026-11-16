import { useEffect, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, Select, useToast } from '@/shared/components'
import type { PasswordResetMode, Tenant } from '@/types'
import { getAccountById } from '@/mock/account'
import { resetTenantAdminPassword } from '@/mock/member'
import { tenantStatusOf } from '@/mock/tenant'
import './TenantPage.css'

/** 重置原因（与账号管理「租户成员兜底重置」同一枚举，保证统计口径一致） */
const REASON_OPTIONS = [
  { label: '忘记密码 / 无法登录', value: 'forgot' },
  { label: '人员失联 / 离职交接', value: 'lost' },
  { label: '安全事件（疑似盗号）', value: 'security' },
  { label: '租户管理员无法处理，平台协助', value: 'assist' },
]

interface TenantAdminResetModalProps {
  open: boolean
  tenant: Tenant
  onClose: () => void
}

/** 密码复杂度：与平台账号 / 成员管理同一口径 */
const PASSWORD_HINT = '不少于 8 位，且包含大写字母、小写字母、数字、特殊字符中的三类'

/**
 * 租户管理 · 重置主管理员密码（单点入口，仅在详情页「主管理员」区块）：
 * 复用账号管理的密码重置服务，不新增功能码；随机 / 自定义二选一，
 * 旧密码与全部会话立即失效并置首登改密；密码是账号级凭证，需在弹窗内明示「该账号同时属于 N 个租户」的影响面。
 * 双写审计：平台审计 + 租户侧审计。
 */
export default function TenantAdminResetModal({ open, tenant, onClose }: TenantAdminResetModalProps) {
  const toast = useToast()
  const [mode, setMode] = useState<PasswordResetMode>('random')
  const [customPassword, setCustomPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonNote, setReasonNote] = useState('')

  useEffect(() => {
    if (open) {
      setMode('random')
      setCustomPassword('')
      setConfirmPassword('')
      setPlaintext('')
      setCopied(false)
      setReason('')
      setReasonNote('')
    }
  }, [open])

  const account = tenant.adminAccountId ? getAccountById(tenant.adminAccountId) : undefined
  const memberships = account?.tenantMemberships.filter((item) => item.status === 'active') ?? []
  const tenantCount = memberships.length
  const tenantDisabled = tenant.status === 'disabled'

  const customInvalid =
    mode === 'custom' &&
    (customPassword.length < 8 || confirmPassword.length === 0 || customPassword !== confirmPassword)

  const reasonText = reason ? `${REASON_OPTIONS.find((item) => item.value === reason)?.label ?? ''}${reasonNote.trim() ? `：${reasonNote.trim()}` : ''}` : ''

  const handleSubmit = async () => {
    if (!reason) {
      toast('请选择重置原因', 'error')
      return
    }
    setSubmitting(true)
    try {
      const pwd = await resetTenantAdminPassword(tenant.id, mode, mode === 'custom' ? customPassword : undefined, reasonText)
      setPlaintext(pwd)
      toast('主管理员密码已重置')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!plaintext) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plaintext)
      } else {
        const ta = document.createElement('textarea')
        ta.value = plaintext
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
    } catch {
      toast('复制失败，请手动抄录', 'error')
    }
  }

  return (
    <Modal
      open={open}
      title={<span data-ann-target="tenant.modal.admin.reset">{`重置主管理员密码 · ${tenant.adminName || '未指定'}`}</span>}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{plaintext ? '关闭' : '取消'}</Button>
          {!plaintext && (
            <Button variant="primary" disabled={submitting || customInvalid || !reason} onClick={() => void handleSubmit()}>
              确认重置
            </Button>
          )}
        </>
      }
    >
      {!plaintext ? (
        <>
          <div className="tenant-impact" data-ann-target="tenant.admin.reset.impact">
            <div>
              <span className="tenant-impact-title">
                <Icon name="warning" size={14} />
                该账号同时属于 {tenantCount} 个租户
              </span>
              <ul className="tenant-impact-list">
                {memberships.map((item) => (
                  <li key={item.id}>
                    {item.tenantName}
                    {item.primary ? '（主管理员）' : ''}
                    {item.tenantId === tenant.id ? '（当前租户）' : ''}
                    <span className="text-tertiary">
                      {item.tenantId && tenantStatusOf(item.tenantId) === 'disabled' ? ' · 已停用' : ' · 启用中'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="tenant-impact-note">
                密码是账号级凭证：重置将使其在<strong>全部 {tenantCount} 个租户</strong>的会话立即失效，旧密码同时失效，并置首登改密。
                {tenantDisabled && (
                  <>
                    <br />
                    当前租户已停用：密码重置即时生效，但需租户启用后该账号才能登录。
                  </>
                )}
              </div>
            </div>
          </div>

          <FormField label="重置方式" required annTarget="tenant.admin.reset.mode">
            <span className="tenant-admin-modes">
              <label className="tenant-admin-mode">
                <input type="radio" name="tenant-admin-reset-mode" checked={mode === 'random'} onChange={() => setMode('random')} />
                <span>随机生成</span>
              </label>
              <label className="tenant-admin-mode">
                <input type="radio" name="tenant-admin-reset-mode" checked={mode === 'custom'} onChange={() => setMode('custom')} />
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
                annTarget="tenant.admin.reset.custom"
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

          <FormField label="重置原因" required annTarget="tenant.admin.reset.reason">
            <Select value={reason} placeholder="请选择原因" options={REASON_OPTIONS} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <FormField label="补充说明" hint="选填；写入平台审计与租户侧审计">
            <Input value={reasonNote} placeholder="例如：管理员本人反馈忘记密码，已电话核实身份" onChange={(e) => setReasonNote(e.target.value)} />
          </FormField>

          <p className="form-tip" style={{ marginTop: 'var(--space-sm)' }}>
            提交后写双份审计：平台审计（租户详情「操作记录」）与租户侧审计（成员操作记录），均含重置原因。新密码仅展示一次，关闭后不可再查。
          </p>
        </>
      ) : (
        <>
          <p className="form-tip" style={{ marginTop: 0 }}>
            请抄录并线下交付给主管理员本人。关闭本弹窗后不可再次查看，遗失只能重新重置。
          </p>
          <div className="tenant-onetime" data-ann-target="tenant.admin.reset.onetime">
            <span className="mono">{plaintext}</span>
            <Button size="small" onClick={() => void handleCopy()}>
              {copied ? '已复制' : '复制密码'}
            </Button>
          </div>
          <p className="form-tip" style={{ marginTop: 'var(--space-sm)' }}>
            旧密码与全部会话已立即失效（含该账号在其他 {Math.max(tenantCount - 1, 0)} 个租户的会话）；该账号下次登录将被拦截到改密页。
          </p>
        </>
      )}
    </Modal>
  )
}

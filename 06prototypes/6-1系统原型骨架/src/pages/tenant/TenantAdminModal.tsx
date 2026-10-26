import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Select, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import type { AdminRelievedReason, PlatformAccount, Tenant } from '@/types'
import { activeTenantAdminSeats, changeTenantAdmin, MAX_TENANT_ADMIN_SEATS } from '@/mock/tenant'
import { fetchAllAccounts } from '@/mock/account'
import './TenantPage.css'

interface TenantAdminModalProps {
  open: boolean
  tenant: Tenant
  onClose: () => void
  onDone: () => void
}

const RELIEVED_OPTIONS: { label: string; value: AdminRelievedReason }[] = [
  {
    label: '降级为普通成员（收回「租户管理员」角色，保留成员身份；须至少保留 1 个其他角色）',
    value: 'demote',
  },
  { label: '禁用（收回「租户管理员」角色，并停用该成员登录）', value: 'disable' },
  { label: '移出租户（收回角色，成员关系置「已移出」，账号不再属于本租户）', value: 'remove' },
]

/**
 * 更换主管理员（独立弹窗，入口在租户详情页「更换主管理员」按钮）：
 * 超管从本租户启用成员中选择新任主管理员，并指定原管理员的去向（降级为普通成员 / 禁用）；
 * 提交后原账号的「租户管理员」角色被收回，新任自动获得该角色与全部功能权限。
 */
export default function TenantAdminModal({ open, tenant, onClose, onDone }: TenantAdminModalProps) {
  const toast = useToast()
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [newAdminId, setNewAdminId] = useState('')
  const [relievedReason, setRelievedReason] = useState<AdminRelievedReason>('demote')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setNewAdminId('')
    setRelievedReason('demote')
    void fetchAllAccounts().then((list) => {
      // 候选 = 租户自有账号（无平台角色）、启用、非现任主管理员、且未达兼任上限。
      // 平台账号一律排除：平台人员处理租户事务只能走「进入租户」（只读 + 原因 + 双写审计）。
      setAccounts(
        list.filter(
          (item) =>
            item.status === 'enabled' &&
            item.roleIds.length === 0 &&
            item.id !== tenant.adminAccountId &&
            activeTenantAdminSeats(item.id) < MAX_TENANT_ADMIN_SEATS,
        ),
      )
    })
  }, [open, tenant.id, tenant.adminAccountId])

  const options: SelectOption[] = accounts.map((item) => {
    const seats = activeTenantAdminSeats(item.id)
    return {
      label: `${item.displayName}（${item.loginName}）· ${item.mobile}${seats > 0 ? ` · 已兼任 ${seats} 个租户` : ''}`,
      value: item.id,
    }
  })

  const handleSubmit = async () => {
    if (!newAdminId) {
      toast('请选择新任主管理员', 'error')
      return
    }
    setSubmitting(true)
    try {
      await changeTenantAdmin(tenant.id, newAdminId, relievedReason)
      toast('主管理员已更换，原账号「租户管理员」角色已收回')
      onDone()
    } catch (error) {
      toast(error instanceof Error ? error.message : '更换失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={tenant.adminAccountId ? '更换主管理员' : '指定主管理员'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting || options.length === 0} onClick={() => void handleSubmit()}>
            确认更换
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="现任主管理员" full>
          <Input
            value={tenant.adminAccountId ? `${tenant.adminName}（${tenant.adminMobile}）` : '未指定'}
            disabled
          />
        </FormField>

        <FormField
          label="新任主管理员"
          required
          full
          error={!newAdminId ? '请选择新任主管理员' : ''}
          hint={`仅可选租户自有账号（平台账号不得兼任）；排除停用 / 注销、现任主管理员，以及已绑定其他租户的账号（单租户模式，一账号只能绑 ${MAX_TENANT_ADMIN_SEATS} 个租户）；非本租户成员的账号接任时将自动建立成员记录，并受成员数上限约束`}
        >
          <Select
            value={newAdminId}
            placeholder={options.length === 0 ? '全局账号表中暂无可选的启用账号' : '请选择新任主管理员'}
            options={options}
            data-ann-target="tenant.modal.admin"
            onChange={(e) => setNewAdminId(e.target.value)}
          />
        </FormField>

        {tenant.adminAccountId && (
          <FormField label="原管理员去向" required full>
            <div className="tenant-admin-modes">
              {RELIEVED_OPTIONS.map((opt) => (
                <label key={opt.value} className="tenant-admin-mode">
                  <input
                    type="radio"
                    name="relieved-reason"
                    checked={relievedReason === opt.value}
                    onChange={() => setRelievedReason(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </FormField>
        )}
      </div>

      <p className="form-tip" style={{ marginTop: 'var(--space-sm)' }}>
        {tenant.adminAccountId
          ? '更换后，原账号的「租户管理员」角色立即被收回：降级时保留成员身份（须至少保留 1 个其他角色），禁用时同时停用该成员登录，移出时成员关系置「已移出」；新任主管理员自动获得「租户管理员」角色与全部功能权限。操作记入审计。'
          : '指定后，该账号成为本租户首任主管理员，自动获得「租户管理员」角色与全部功能权限；后续如需更换，可再次使用本操作。操作记入审计。'}
      </p>
    </Modal>
  )
}

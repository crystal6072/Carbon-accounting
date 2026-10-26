import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, MultiSelect, TreeSelect, useToast } from '@/shared/components'
import type { MultiSelectOption } from '@/shared/components'
import type { PasswordResetMode, Role, TenantMemberItem, TreeOption } from '@/types'
import {
  createMember,
  fetchDeptOptions,
  fetchTenantRoleOptions,
  updateMember,
} from '@/mock/member'
import { PASSWORD_HINT, ROLE_MAX } from './memberMeta'
import './MemberPage.css'

export type MemberFormMode = 'create' | 'edit'

interface MemberFormModalProps {
  open: boolean
  tenantId: string
  mode: MemberFormMode
  /** 编辑模式的目标成员 */
  member: TenantMemberItem | null
  onClose: () => void
  onDone: () => void
}

interface FormState {
  displayName: string
  loginName: string
  mobile: string
  email: string
  passwordMode: PasswordResetMode
  customPassword: string
  confirmPassword: string
  roleNames: string[]
  deptId: string
}

const EMPTY_FORM: FormState = {
  displayName: '',
  loginName: '',
  mobile: '',
  email: '',
  passwordMode: 'random',
  customPassword: '',
  confirmPassword: '',
  roleNames: [],
  deptId: '',
}

const MOBILE_PATTERN = /^1[3-9]\d{9}$/

const TITLE: Record<MemberFormMode, string> = {
  create: '新建成员',
  edit: '编辑成员',
}

/** 部门树拍平（按名称回显编辑态部门） */
function flattenDeptOptions(options: TreeOption[]): TreeOption[] {
  return options.flatMap((option) => [option, ...flattenDeptOptions(option.children ?? [])])
}

/**
 * 成员管理 · 新建 / 编辑（两态合一弹窗）。
 * - 新建：建账号 + 建成员关系 + 配角色，密码一次性展示（§5.1）。
 * - 编辑：姓名 / 手机号 / 邮箱改账号级字段，部门（调岗）与角色改租户域字段，登录名不可改（§5.3）。
 */
export default function MemberFormModal({ open, tenantId, mode, member, onClose, onDone }: MemberFormModalProps) {
  const toast = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [oneTimePassword, setOneTimePassword] = useState('')

  const roleOptions: MultiSelectOption[] = useMemo(() => roles.map((role) => ({ label: role.name, value: role.name })), [roles])

  useEffect(() => {
    if (!open) return
    setErrors({})
    setOneTimePassword('')
    void (async () => {
      const [roleList, deptTree] = await Promise.all([fetchTenantRoleOptions(tenantId), fetchDeptOptions(tenantId)])
      setRoles(roleList)
      setDeptOptions(deptTree)
      if (mode === 'edit' && member) {
        // 部门按名称回显（种子数据 deptId 为空，名称即关联键）
        const matched = flattenDeptOptions(deptTree).find((node) => node.label === member.deptName)
        setForm({
          displayName: member.name,
          loginName: member.loginName,
          mobile: member.mobile,
          email: member.email,
          passwordMode: 'random',
          customPassword: '',
          confirmPassword: '',
          roleNames: [...member.roleNames],
          deptId: matched?.value ?? '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
    })()
  }, [open, mode, member, tenantId])

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.displayName.trim()) next.displayName = '姓名必填'
    else if (form.displayName.trim().length > 50) next.displayName = '姓名最长 50 字符'
    if (mode === 'create') {
      const loginName = form.loginName.trim()
      if (!loginName) next.loginName = '登录名必填'
      else if (/^\d{11}$/.test(loginName)) next.loginName = '登录名不能为 11 位纯数字'
      else if (/[\u4e00-\u9fa5]/.test(loginName)) next.loginName = '登录名仅支持字母、数字与下划线'
    }
    if (!form.mobile.trim()) next.mobile = '手机号必填'
    else if (!MOBILE_PATTERN.test(form.mobile.trim())) next.mobile = '手机号格式不正确'
    if (mode === 'create' && form.passwordMode === 'custom') {
      if (form.customPassword.length < 8) next.customPassword = '密码长度不少于 8 位'
      else if (form.customPassword !== form.confirmPassword) next.confirmPassword = '两次输入的密码不一致'
    }
    if (form.roleNames.length < 1) next.roleNames = '至少指派 1 个角色'
    else if (form.roleNames.length > ROLE_MAX) next.roleNames = `角色最多 ${ROLE_MAX} 个`
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      if (mode === 'edit' && member) {
        await updateMember(tenantId, member.id, {
          displayName: form.displayName,
          mobile: form.mobile,
          email: form.email,
          roleNames: form.roleNames,
          deptId: form.deptId || null,
        })
        toast('保存成功')
        onDone()
      } else {
        const created = await createMember(tenantId, {
          displayName: form.displayName,
          loginName: form.loginName,
          mobile: form.mobile,
          email: form.email,
          passwordMode: form.passwordMode,
          customPassword: form.passwordMode === 'custom' ? form.customPassword : undefined,
          roleNames: form.roleNames,
          deptId: form.deptId || null,
        })
        setOneTimePassword(created.password)
        toast('成员已创建')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel = mode === 'edit' ? '保存' : '确认新建'

  return (
    <Modal
      open={open}
      title={`${TITLE[mode]}${mode === 'edit' && member ? ` · ${member.name}` : ''}`}
      size="lg"
      onClose={onClose}
      footer={
        oneTimePassword ? (
          <Button variant="primary" onClick={onDone}>
            完成
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
              {submitLabel}
            </Button>
          </>
        )
      }
    >
      {oneTimePassword ? (
        <>
          <p className="form-tip" style={{ marginTop: 0 }}>
            请抄录并线下交付给账号持有人。关闭本弹窗后不可再次查看，遗失只能由租户管理员再次重置。
          </p>
          <div className="member-onetime" data-ann-target="member.create.onetime">
            <span className="member-onetime-code">{oneTimePassword}</span>
            <span className="form-tip">一次性密码（已同步标记首登改密）</span>
          </div>
        </>
      ) : (
        <>
          {mode === 'edit' && (
            <p className="form-tip" style={{ marginTop: 0 }}>
              姓名 / 手机号 / 邮箱写在账号表、全局生效（平台后台「平台账号」同步可见）；登录名创建后不可修改；部门调整不影响历史业务数据上的部门快照。
            </p>
          )}

          <div className="form-grid">
            <FormField label="姓名" required error={errors.displayName}>
              <Input
                value={form.displayName}
                placeholder="请输入姓名"
                invalid={!!errors.displayName}
                data-ann-target="member.form.name"
                onChange={(e) => update({ displayName: e.target.value })}
              />
            </FormField>

            {mode === 'create' && (
              <FormField
                label="登录名"
                required
                error={errors.loginName}
                hint="创建后不可改；全局唯一（不区分大小写），不能为 11 位纯数字"
              >
                <Input
                  value={form.loginName}
                  placeholder="请输入登录名"
                  invalid={!!errors.loginName}
                  data-ann-target="member.form.loginName"
                  onChange={(e) => update({ loginName: e.target.value })}
                />
              </FormField>
            )}

            <FormField
              label="手机号"
              required
              error={errors.mobile}
              hint="登录凭证之一，全局唯一"
            >
              <Input
                value={form.mobile}
                placeholder="请输入手机号"
                invalid={!!errors.mobile}
                data-ann-target="member.form.mobile"
                onChange={(e) => update({ mobile: e.target.value })}
              />
            </FormField>

            {mode === 'edit' && (
              <FormField label="邮箱" hint="选填，用于通知">
                <Input value={form.email} placeholder="请输入邮箱" data-ann-target="member.form.email" onChange={(e) => update({ email: e.target.value })} />
              </FormField>
            )}

            {mode === 'create' && (
              <>
                <FormField label="密码" required hint={PASSWORD_HINT} full>
                  <span className="member-reset-modes">
                    <label className="member-reset-mode">
                      <input
                        type="radio"
                        name="member-password-mode"
                        checked={form.passwordMode === 'random'}
                        onChange={() => update({ passwordMode: 'random' })}
                      />
                      <span>随机生成</span>
                    </label>
                    <label className="member-reset-mode">
                      <input
                        type="radio"
                        name="member-password-mode"
                        checked={form.passwordMode === 'custom'}
                        onChange={() => update({ passwordMode: 'custom' })}
                      />
                      <span>自定义密码</span>
                    </label>
                  </span>
                </FormField>
                {form.passwordMode === 'custom' && (
                  <>
                    <FormField label="新密码" required error={errors.customPassword}>
                      <Input
                        type="password"
                        value={form.customPassword}
                        placeholder="请输入新密码"
                        invalid={!!errors.customPassword}
                        onChange={(e) => update({ customPassword: e.target.value })}
                      />
                    </FormField>
                    <FormField label="确认新密码" required error={errors.confirmPassword}>
                      <Input
                        type="password"
                        value={form.confirmPassword}
                        placeholder="请再次输入新密码"
                        invalid={!!errors.confirmPassword}
                        onChange={(e) => update({ confirmPassword: e.target.value })}
                      />
                    </FormField>
                  </>
                )}
              </>
            )}

            <FormField
              label="部门"
              hint="选填；为空表示未挂组织，数据范围按「仅本人」处理；停用部门不可挂新成员"
            >
              <span data-ann-target="member.form.dept">
                <TreeSelect
                  value={form.deptId}
                  options={deptOptions}
                  noneLabel="未挂组织（数据范围仅本人）"
                  placeholder="请选择部门"
                  onChange={(value) => update({ deptId: value })}
                />
              </span>
            </FormField>

            <FormField label="角色" required error={errors.roleNames} full hint={`1 至 ${ROLE_MAX} 个，至少 1 个；仅可指派本租户启用状态的租户角色，平台角色不可指派给成员`}>
              <span data-ann-target="member.form.role">
                <MultiSelect
                  value={form.roleNames}
                  options={roleOptions}
                  placeholder="请选择角色"
                  onChange={(roleNames) => update({ roleNames })}
                />
              </span>
            </FormField>
          </div>
        </>
      )}
    </Modal>
  )
}

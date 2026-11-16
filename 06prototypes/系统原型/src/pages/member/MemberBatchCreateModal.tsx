import { useEffect, useState } from 'react'
import { Button, FormField, Modal, MultiSelect, Table, TreeSelect, useToast } from '@/shared/components'
import type { MultiSelectOption } from '@/shared/components'
import type { Role, TenantMemberItem, TreeOption } from '@/types'
import { createMember, fetchDeptOptions, fetchMembers, fetchTenantRoleOptions } from '@/mock/member'
import { ROLE_MAX } from './memberMeta'
import './MemberPage.css'

const MOBILE_PATTERN = /^1[3-9]\d{9}$/

interface BatchRow {
  key: number
  name: string
  mobile: string
  deptId: string
  roleNames: string[]
  error: string
}

interface MemberBatchCreateModalProps {
  open: boolean
  tenantId: string
  onClose: () => void
  onDone: () => void
}

/** 批量新增成员：一次多行，每行姓名 / 手机号 / 所属组织 / 角色，行间组织可不同 */
export default function MemberBatchCreateModal({ open, tenantId, onClose, onDone }: MemberBatchCreateModalProps) {
  const toast = useToast()
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [rows, setRows] = useState<BatchRow[]>([])
  const [existingMobiles, setExistingMobiles] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const roleOptions: MultiSelectOption[] = roles.map((role) => ({ label: role.name, value: role.name }))

  const addRow = () =>
    setRows((prev) => [...prev, { key: Date.now() + prev.length, name: '', mobile: '', deptId: '', roleNames: [], error: '' }])

  const updateRow = (key: number, patch: Partial<BatchRow>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const removeRow = (key: number) => setRows((prev) => prev.filter((row) => row.key !== key))

  useEffect(() => {
    if (!open) return
    void (async () => {
      const [tree, roleList, members] = await Promise.all([
        fetchDeptOptions(tenantId),
        fetchTenantRoleOptions(tenantId),
        fetchMembers(tenantId),
      ])
      setDeptOptions(tree)
      setRoles(roleList)
      setExistingMobiles(new Set((members as TenantMemberItem[]).map((m) => m.mobile)))
      setRows([{ key: Date.now(), name: '', mobile: '', deptId: '', roleNames: [], error: '' }])
    })()
  }, [open, tenantId])

  const validateAll = (): boolean => {
    const next = rows.map((row, index) => {
      const errors: string[] = []
      if (!row.name.trim()) errors.push('姓名必填')
      if (!row.mobile.trim()) errors.push('手机号必填')
      else if (!MOBILE_PATTERN.test(row.mobile.trim())) errors.push('手机号格式不正确')
      if (!row.deptId) errors.push('请选择所属组织')
      if (row.roleNames.length < 1) errors.push('至少 1 个角色')
      else if (row.roleNames.length > ROLE_MAX) errors.push(`角色最多 ${ROLE_MAX} 个`)
      const dupInBatch = rows.some((r, i) => i !== index && r.mobile.trim() === row.mobile.trim() && !!row.mobile.trim())
      if (row.mobile.trim() && dupInBatch) errors.push('手机号在批量中重复')
      if (row.mobile.trim() && existingMobiles.has(row.mobile.trim())) errors.push('手机号已是本租户成员')
      return errors.join('；')
    })
    setRows((prev) => prev.map((row, index) => ({ ...row, error: next[index] })))
    return next.every((e) => !e)
  }

  const handleSubmit = async () => {
    if (!validateAll() || rows.length === 0) return
    setSubmitting(true)
    let ok = 0
    let fail = 0
    try {
      for (const row of rows) {
        try {
          await createMember(tenantId, {
            displayName: row.name.trim(),
            // 批量表单不收集账号，按手机号派生（加前缀避免 11 位纯数字账号限制）
            loginName: `mb_${row.mobile.trim()}`,
            mobile: row.mobile.trim(),
            email: '',
            passwordMode: 'random',
            roleNames: row.roleNames,
            deptId: row.deptId,
          })
          ok += 1
        } catch {
          fail += 1
        }
      }
      if (fail === 0) {
        toast(`已新增 ${ok} 名成员`)
        onDone()
      } else {
        toast(`成功 ${ok} 名，失败 ${fail} 名（手机号重复 / 已注册等），请检查后重试`, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const batchColumns = [
    { key: 'name', title: '姓名', render: (row: BatchRow) => <input className="batch-input" value={row.name} placeholder="姓名" onChange={(e) => updateRow(row.key, { name: e.target.value })} /> },
    { key: 'mobile', title: '手机号', render: (row: BatchRow) => <input className="batch-input" value={row.mobile} placeholder="手机号" onChange={(e) => updateRow(row.key, { mobile: e.target.value })} /> },
    {
      key: 'deptId',
      title: '所属组织',
      render: (row: BatchRow) => (
        <TreeSelect value={row.deptId} options={deptOptions} placeholder="请选择" onChange={(value) => updateRow(row.key, { deptId: value })} />
      ),
    },
    {
      key: 'roleNames',
      title: '角色',
      render: (row: BatchRow) => (
        <MultiSelect value={row.roleNames} options={roleOptions} placeholder="请选择" onChange={(value) => updateRow(row.key, { roleNames: value })} />
      ),
    },
    {
      key: 'error',
      title: '校验',
      render: (row: BatchRow) => (row.error ? <span className="batch-error">{row.error}</span> : <span className="text-tertiary">—</span>),
    },
    {
      key: 'op',
      title: '操作',
      width: 60,
      render: (row: BatchRow) => (
        <button type="button" className="link link-danger" onClick={() => removeRow(row.key)}>
          删除
        </button>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      title="批量新增成员"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
            确认新增
          </Button>
        </>
      }
    >
      <p className="form-tip" style={{ marginTop: 0 }}>
        每行一个成员：姓名、手机号、所属组织（必填）、角色（1 至 {ROLE_MAX} 个）；行间所属组织可不同。提交时逐行校验，手机号重复 / 已注册将跳过。
      </p>
      <div className="batch-table-wrap">
        <Table columns={batchColumns} data={rows} rowKey={(row) => String(row.key)} />
      </div>
      <Button variant="ghost" onClick={addRow}>
        + 添加一行
      </Button>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Textarea, useToast } from '@/shared/components'
import { copyRole, createRole, updateRole } from '@/mock/role'
import type { Role, RoleScope } from '@/types'
import './RolePage.css'

interface RoleModalProps {
  open: boolean
  /** 为空表示新增；source 非空表示从该角色复制 */
  role: Role | null
  source: Role | null
  scope: RoleScope
  /** 租户上下文（租户端「角色管理」新建角色时必传：租户角色必写租户标识） */
  tenant?: { tenantId: string; tenantName: string }
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  name: string
  code: string
  description: string
}

const EMPTY_FORM: FormState = { name: '', code: '', description: '' }

/**
 * 平台角色管理 · 新增 / 修改弹窗（对齐参考图：角色名称、角色标识、角色描述）。
 * 角色标识创建后不可改（编辑态只读）；功能分配走独立的「分配权限」弹窗。
 */
export default function RoleModal({ open, role, source, scope, tenant, onClose, onSaved }: RoleModalProps) {
  const toast = useToast()
  const isEdit = !!role
  const isCopy = !!source && !role

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (role) {
      setForm({ name: role.name, code: role.code, description: role.description })
    } else if (source) {
      setForm({ name: `${source.name} 副本`, code: `${source.code}_COPY`, description: source.description })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [open, role, source])

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = '角色名称必填'
    else if (form.name.trim().length > 50) next.name = '角色名称最长 50 字符'
    if (!isEdit) {
      const code = form.code.trim()
      if (!code) next.code = '角色标识必填'
      else if (!/^[A-Z][A-Z0-9_]*$/.test(code)) next.code = '仅支持大写字母、数字与下划线，且以字母开头'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      if (isEdit && role) {
        await updateRole(role.id, { name: form.name.trim(), description: form.description.trim() })
        toast('保存成功')
      } else if (isCopy && source) {
        await copyRole(source.id, { name: form.name.trim(), code: form.code.trim(), description: form.description.trim() })
        toast('角色已复制，功能权限已带入，可再通过「授权」调整')
      } else {
        await createRole(
          scope,
          { name: form.name.trim(), code: form.code.trim(), description: form.description.trim() },
          scope === 'tenant' ? tenant : undefined,
        )
        toast('角色已创建，请通过「授权」分配功能')
      }
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEdit ? '修改' : isCopy ? '复制角色' : '新增'

  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="role.form.cancel" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            data-ann-target="role.form.ok"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            确认
          </Button>
        </>
      }
    >
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <FormField label="角色名称" required error={errors.name}>
          <Input
            value={form.name}
            placeholder="请输入角色名称"
            invalid={!!errors.name}
            data-ann-target="role.form.name"
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </FormField>

        <FormField
          label="角色标识"
          required
          error={errors.code}
          hint={isEdit ? '创建后不可修改' : '如 SUPER_ADMIN，归属范围内唯一'}
        >
          <Input
            value={form.code}
            readOnly={isEdit}
            placeholder="请输入角色标识"
            invalid={!!errors.code}
            data-ann-target="role.form.code"
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          />
        </FormField>

        <FormField label="角色描述">
          <Textarea
            value={form.description}
            rows={3}
            placeholder="请输入角色描述"
            data-ann-target="role.form.description"
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </FormField>
      </div>
    </Modal>
  )
}

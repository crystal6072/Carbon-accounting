import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, useToast } from '@/shared/components'
import { createOrgNode, updateOrgNode } from '@/mock/org'
import type { OrgNode } from '@/types'

interface OrgNodeModalProps {
  open: boolean
  orgId: string
  /** 新增时的上级节点；null = 新增顶级节点 */
  parent: OrgNode | null
  /** 传入则为编辑（编辑不改变上级） */
  node: OrgNode | null
  /** 新增同级节点的默认排序号 */
  suggestedSort: number
  /** 本租户可用的组织类型（来自组织类型字典） */
  typeOptions: string[]
  onClose: () => void
  onDone: () => void
}

interface FormState {
  code: string
  name: string
  typeName: string
  leader: string
  sort: string
}

/** 组织架构节点 · 新增 / 编辑弹窗 */
export default function OrgNodeModal({
  open,
  orgId,
  parent,
  node,
  suggestedSort,
  typeOptions,
  onClose,
  onDone,
}: OrgNodeModalProps) {
  const toast = useToast()
  const isEdit = !!node
  const [form, setForm] = useState<FormState>({ code: '', name: '', typeName: '', leader: '', sort: '1' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      node
        ? { code: node.code, name: node.name, typeName: node.typeName, leader: node.leader, sort: String(node.sort) }
        : { code: '', name: '', typeName: typeOptions[typeOptions.length - 1] ?? '部门', leader: '', sort: String(suggestedSort) },
    )
  }, [open, node, suggestedSort, typeOptions])

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    const name = form.name.trim()
    if (!name) next.name = '节点名称必填'
    else if (name.length > 50) next.name = '节点名称最长 50 字符'
    const sort = Number(form.sort.trim())
    if (!Number.isInteger(sort) || sort < 0) next.sort = '排序须为不小于 0 的整数'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      typeName: form.typeName,
      leader: form.leader.trim(),
      sort: Number(form.sort.trim()),
    }
    setSubmitting(true)
    try {
      if (node) {
        await updateOrgNode(node.id, payload)
        toast('节点已更新')
      } else {
        await createOrgNode(orgId, parent?.id ?? null, payload)
        toast(parent ? `已在「${parent.name}」下新增节点` : '已新增顶级节点')
      }
      onDone()
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const parentText = node
    ? node.isRoot
      ? '当前为租户根组织（系统自动创建，可修改组织名称，不可删除 / 移动）'
      : node.parentId
        ? '编辑不改变上级，如需调整请使用「移动」'
        : '当前为顶级节点'
    : parent
      ? `上级：${parent.name}（层级 ${parent.level + 1}）`
      : '新建顶级节点（层级 1）'

  return (
    <Modal
      open={open}
      title={isEdit ? `编辑节点 · ${node?.name ?? ''}` : parent ? `新增下级 · ${parent.name}` : '新增顶级节点'}
      size="default"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
            保存
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="节点名称" required error={errors.name} hint="同一上级下名称不可重复">
          <Input
            value={form.name}
            placeholder="如 核算部 / 生产技术科 / 招商服务部"
            invalid={!!errors.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </FormField>

        <FormField label="组织编码" hint="选填；留空由系统生成，租户内唯一">
          <Input
            value={form.code}
            placeholder="如 ORG0007"
            onChange={(e) => update({ code: e.target.value.toUpperCase() })}
          />
        </FormField>

        <FormField label="负责人" hint="选填，仅作组织架构展示，不联动权限">
          <Input
            value={form.leader}
            placeholder="请输入负责人姓名"
            onChange={(e) => update({ leader: e.target.value })}
          />
        </FormField>

        <FormField label="排序" error={errors.sort} hint="同级节点按序号升序排列">
          <Input
            value={form.sort}
            placeholder="0"
            invalid={!!errors.sort}
            onChange={(e) => update({ sort: e.target.value })}
          />
        </FormField>
      </div>
      <p className="form-tip" data-ann-target="org.modal.node">{parentText}；层级上限 5 层，新增后默认启用。</p>
    </Modal>
  )
}

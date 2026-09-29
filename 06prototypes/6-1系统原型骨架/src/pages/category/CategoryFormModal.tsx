import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, Select, Textarea } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import type { CategoryItem, CategoryLevel } from '@/types'
import type { CategoryPayload } from '@/mock'
import { levelText } from '@/shared/utils/tree'

/** 「一级分类」在上级分类下拉中的显式选项文案 */
const PARENT_NONE_LABEL = '无上级（一级分类）'

interface CategoryFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial: CategoryItem | null
  /** 新建时的默认上级分类（从树节点新增下级时带入） */
  defaultParentId: string | null
  /** 上级分类是否锁定（新增一级分类 / 新增下级分类时锁定） */
  lockParent: boolean
  /** 上级分类锁定时展示的文案（如「竹制餐具」「无上级（一级分类）」） */
  lockedParentLabel?: string
  parentOptions: SelectOption[]
  onClose: () => void
  onSubmit: (payload: CategoryPayload) => Promise<void>
  resolveLevel: (parentId: string | null) => CategoryLevel
}

/** 新增 / 编辑分类弹窗（轻量配置：底栏「取消 + 保存」，使用状态不在表单内编辑） */
export default function CategoryFormModal({
  open,
  mode,
  initial,
  defaultParentId,
  lockParent,
  lockedParentLabel,
  parentOptions,
  onClose,
  onSubmit,
  resolveLevel,
}: CategoryFormModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [sortNo, setSortNo] = useState('')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setCode(initial.code)
      setName(initial.name)
      setParentId(initial.parentId ?? '')
      setSortNo(initial.sortNo == null ? '' : String(initial.sortNo))
      setRemark(initial.remark)
    } else {
      setCode('')
      setName('')
      setParentId(defaultParentId ?? '')
      setSortNo('')
      setRemark('')
    }
  }, [open, mode, initial, defaultParentId])

  const level = resolveLevel(parentId || null)

  // 「一级分类」作为显式选项，避免用户靠「不选」来表达一级分类
  const parentSelectOptions = useMemo<SelectOption[]>(
    () => [{ label: PARENT_NONE_LABEL, value: '' }, ...parentOptions],
    [parentOptions],
  )

  // 标题随入口变化，让用户明确当前在新增哪一级分类
  const modalTitle =
    mode === 'edit' ? '编辑分类' : lockParent ? (parentId ? '新增下级分类' : '新增一级分类') : '新增分类'

  const handleSubmit = async () => {
    const nextErrors: { code?: string; name?: string } = {}
    if (!code.trim()) nextErrors.code = '请输入分类编码'
    if (!name.trim()) nextErrors.name = '请输入分类名称'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        parentId: parentId || null,
        sortNo: sortNo.trim() === '' ? null : Number(sortNo),
        remark: remark.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={modalTitle}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="上级分类" full>
          {lockParent ? (
            <div className="form-static">{lockedParentLabel ?? PARENT_NONE_LABEL}</div>
          ) : (
            <Select value={parentId} options={parentSelectOptions} onChange={(e) => setParentId(e.target.value)} />
          )}
        </FormField>
        <FormField label="分类编码" required error={errors.code}>
          <Input
            value={code}
            placeholder="如 BAM-01"
            invalid={!!errors.code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
        <FormField label="分类名称" required error={errors.name}>
          <Input
            value={name}
            placeholder="请输入分类名称"
            invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="分类层级">
          <div className="form-static">{levelText(level)}</div>
        </FormField>
        <FormField label="排序号">
          <Input
            value={sortNo}
            inputMode="numeric"
            placeholder="越小越靠前，可留空"
            onChange={(e) => setSortNo(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </FormField>
        <FormField label="备注" full>
          <Textarea value={remark} rows={3} placeholder="选填" onChange={(e) => setRemark(e.target.value)} />
        </FormField>
      </div>
      <div className="modal-confirm-tip">上级分类与分类层级的联动口径为【待确认 Q03】，原型按「上级层级 + 1」自动带出。</div>
    </Modal>
  )
}

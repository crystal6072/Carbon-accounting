import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, Select, Textarea } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import type { IndustryItem, IndustryLevel } from '@/types'
import type { IndustryPayload } from '@/mock'
import { levelText } from './industryMeta'

/** 「一级行业」在上级行业下拉中的显式选项文案 */
const PARENT_NONE_LABEL = '无上级（一级行业）'

interface IndustryFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial: IndustryItem | null
  /** 新建时的默认上级行业（从树节点新增下级时带入） */
  defaultParentId: string | null
  /** 上级行业是否锁定（新增一级行业 / 新增下级行业时锁定） */
  lockParent: boolean
  /** 上级行业锁定时展示的文案 */
  lockedParentLabel?: string
  parentOptions: SelectOption[]
  onClose: () => void
  onSubmit: (payload: IndustryPayload) => Promise<void>
  resolveLevel: (parentId: string | null) => IndustryLevel
}

/** 新增 / 编辑行业弹窗（轻量字典：底栏「取消 + 保存」，使用状态不在表单内编辑） */
export default function IndustryFormModal({
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
}: IndustryFormModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [sortNo, setSortNo] = useState('')
  const [description, setDescription] = useState('')
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
      setDescription(initial.description)
    } else {
      setCode('')
      setName('')
      setParentId(defaultParentId ?? '')
      setSortNo('')
      setDescription('')
    }
  }, [open, mode, initial, defaultParentId])

  const level = resolveLevel(parentId || null)

  // 「一级行业」作为显式选项，避免用户靠「不选」来表达一级行业
  const parentSelectOptions = useMemo<SelectOption[]>(
    () => [{ label: PARENT_NONE_LABEL, value: '' }, ...parentOptions],
    [parentOptions],
  )

  // 标题随入口变化，让用户明确当前在新增哪一级行业
  const modalTitle =
    mode === 'edit' ? '编辑行业' : lockParent ? (parentId ? '新增下级行业' : '新增一级行业') : '新增行业'

  const handleSubmit = async () => {
    const nextErrors: { code?: string; name?: string } = {}
    if (!code.trim()) nextErrors.code = '请输入行业编码'
    if (!name.trim()) nextErrors.name = '请输入行业名称'
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
        description: description.trim(),
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
        <FormField label="上级行业" full>
          {lockParent ? (
            <div className="form-static">{lockedParentLabel ?? PARENT_NONE_LABEL}</div>
          ) : (
            <Select value={parentId} options={parentSelectOptions} onChange={(e) => setParentId(e.target.value)} />
          )}
        </FormField>
        <FormField label="行业编码" required error={errors.code}>
          <Input
            value={code}
            placeholder="如 IND-0101"
            invalid={!!errors.code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
        <FormField label="行业名称" required error={errors.name}>
          <Input
            value={name}
            placeholder="请输入行业名称"
            invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="行业层级">
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
        <FormField label="行业描述" full>
          <Textarea
            value={description}
            rows={3}
            maxLength={500}
            placeholder="选填"
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
      </div>
      <div className="modal-confirm-tip">
        行业层级由「上级行业」推导：不选上级 = 一级行业，选择上级 = 二级行业（仅两级）。
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Textarea, TreeSelect } from '@/shared/components'
import type { CategoryItem, CategoryLevel, TreeOption } from '@/types'
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
  /** 上级分类候选（分级树：层级未达上限，且已排除自身与其全部下级） */
  parentOptions: TreeOption[]
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
          <Button onClick={onClose} data-ann-target="category.form.cancel">
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} data-ann-target="category.form.save">
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
            <TreeSelect
              value={parentId}
              options={parentOptions}
              noneLabel={PARENT_NONE_LABEL}
              placeholder="请选择上级分类"
              searchPlaceholder="搜索分类名称 / 编码"
              emptyText="暂无可选分类"
              annTarget="category.form.parent"
              onChange={(next) => setParentId(next)}
            />
          )}
        </FormField>
        <FormField label="分类编码" required error={errors.code}>
          <Input
            value={code}
            placeholder="如 BAM-01"
            invalid={!!errors.code}
            data-ann-target="category.form.code"
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
        <FormField label="分类名称" required error={errors.name}>
          <Input
            value={name}
            placeholder="请输入分类名称"
            invalid={!!errors.name}
            data-ann-target="category.form.name"
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="分类层级">
          <div className="form-static" data-ann-target="category.form.level">
            {levelText(level)}
          </div>
        </FormField>
        <FormField label="排序号">
          <Input
            value={sortNo}
            inputMode="numeric"
            placeholder="越小越靠前，可留空"
            data-ann-target="category.form.sortNo"
            onChange={(e) => setSortNo(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </FormField>
        <FormField label="备注" full>
          <Textarea
            value={remark}
            rows={3}
            placeholder="选填"
            data-ann-target="category.form.remark"
            onChange={(e) => setRemark(e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  )
}

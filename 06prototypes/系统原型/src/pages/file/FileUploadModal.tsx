import { useEffect, useState } from 'react'
import { Button, FileUploadField, Input, Modal, Select, Textarea, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { useAuth } from '@/context/AuthContext'
import { extOf, uploadLibraryFile } from '@/mock'
import type { LibraryFileCategory } from '@/types'
import { categoryText, categoryOrder, FILE_ACCEPT, validateFile } from './fileMeta'
import { readAsDataUrl } from './fileUtils'
import './FileLibraryPage.css'

interface PickedFile {
  id: string
  file: File
  url: string
}

interface FileUploadModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

let pickSeed = 0

/**
 * 上传文件到文件库。
 *
 * 支持多选，**单文件生成一条记录**，不做「一条记录多附件」（D03）。
 * 与「编辑」共用同一个文件上传组件，视觉一致；上传后如需换文件，在编辑里替换。
 */
export default function FileUploadModal({ open, onClose, onSaved }: FileUploadModalProps) {
  const toast = useToast()
  const { session } = useAuth()
  const operator = session?.displayName ?? '当前用户'

  const [picked, setPicked] = useState<PickedFile[]>([])
  const [category, setCategory] = useState<LibraryFileCategory | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPicked([])
    setCategory('')
    setName('')
    setDescription('')
    setSubmitting(false)
  }, [open])

  const handlePick = async (fileList: File[]) => {
    if (fileList.length === 0) return
    const valid: File[] = []
    const errors: string[] = []
    fileList.forEach((item) => {
      const error = validateFile(item)
      if (error) errors.push(error)
      else valid.push(item)
    })

    const added = await Promise.all(
      valid.map(async (item) => ({
        id: `pick-${pickSeed++}`,
        file: item,
        url: await readAsDataUrl(item),
      })),
    )

    setPicked((prev) => [...prev, ...added])
    if (errors.length > 0) toast(errors[0], 'error')
  }

  const handleSubmit = async () => {
    if (picked.length === 0) {
      toast('请先选择文件', 'error')
      return
    }
    if (!category) {
      toast('请选择文件分类', 'error')
      return
    }

    setSubmitting(true)
    try {
      for (const item of picked) {
        await uploadLibraryFile(
          {
            category,
            name: picked.length === 1 ? name.trim() || undefined : undefined,
            description: description.trim(),
            version: {
              fileName: item.file.name,
              ext: extOf(item.file.name),
              size: item.file.size,
              url: item.url,
            },
          },
          operator,
        )
      }
      toast(`已上传 ${picked.length} 个文件`)
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '上传失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryOptions: SelectOption[] = categoryOrder.map((item) => ({
    label: categoryText[item],
    value: item,
  }))

  return (
    <Modal
      open={open}
      title="上传文件"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? '上传中…' : '上传'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-item form-item-full">
          <span className="form-label required">文件</span>
          <FileUploadField
            files={picked.map((item) => ({
              id: item.id,
              name: item.file.name,
              size: item.file.size,
              ext: extOf(item.file.name),
              url: item.url,
            }))}
            accept={FILE_ACCEPT}
            multiple
            hint="支持 PDF / 图片 / Word / Excel，单文件 ≤ 20MB，可多选；一个文件生成一条记录"
            emptyText="暂无文件，请点击「选择文件」上传"
            onPick={(fileList) => void handlePick(fileList)}
            onRemove={(id) => setPicked((prev) => prev.filter((item) => item.id !== id))}
          />
        </div>

        {picked.length <= 1 && (
          <div className="form-item">
            <span className="form-label">文件名称</span>
            <Input
              value={name}
              maxLength={100}
              placeholder={picked[0] ? picked[0].file.name.replace(/\.[^.]+$/, '') : '选择文件后可修改展示名称'}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="file-form-tip">留空则取原始文件名；≤ 100 字符</span>
          </div>
        )}
        <div className="form-item">
          <span className="form-label required">文件分类</span>
          <Select
            value={category}
            placeholder="请选择"
            options={categoryOptions}
            onChange={(e) => setCategory(e.target.value as LibraryFileCategory)}
          />
        </div>
        <div className="form-item form-item-full">
          <span className="form-label">文件说明</span>
          <Textarea
            value={description}
            maxLength={500}
            rows={3}
            placeholder="选填，≤ 500 字符"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}

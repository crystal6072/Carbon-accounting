import { useEffect, useMemo, useState } from 'react'
import { Button, FileUploadField, Input, Modal, Select, Textarea, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { useAuth } from '@/context/AuthContext'
import { extOf, replaceLibraryFile, updateLibraryFileMeta } from '@/mock'
import type { LibraryFileCategory, LibraryFileItem, LibraryFileVersion } from '@/types'
import { activeRefCountOf, categoryOrder, categoryText, FILE_ACCEPT, validateFile } from './fileMeta'
import { downloadFile, readAsDataUrl } from './fileUtils'
import './FileLibraryPage.css'

interface PendingFile {
  fileName: string
  ext: string
  size: number
  url: string
}

interface FileEditModalProps {
  open: boolean
  file: LibraryFileItem | null
  onClose: () => void
  onSaved: () => void
  /** 预览文件（复用列表页的预览弹窗） */
  onPreview: (file: LibraryFileItem, version: LibraryFileVersion) => void
}

/**
 * 编辑文件：改元信息 + 替换当前文件。
 *
 * 与「上传文件」共用同一个文件上传组件，视觉与交互一致：
 * - 选择新文件即替换当前文件（旧文件转文件记录）；
 * - 也可先「删除」当前文件，再选择新文件；
 * - 删除后未补新文件不允许保存。
 */
export default function FileEditModal({ open, file, onClose, onSaved, onPreview }: FileEditModalProps) {
  const toast = useToast()
  const { session } = useAuth()
  const operator = session?.displayName ?? '当前用户'

  const [name, setName] = useState('')
  const [category, setCategory] = useState<LibraryFileCategory>('other')
  const [description, setDescription] = useState('')
  const [removed, setRemoved] = useState(false)
  const [pending, setPending] = useState<PendingFile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const current = file?.versions.find((item) => item.versionNo === file.currentVersion) ?? null
  const refCount = file ? activeRefCountOf(file) : 0

  useEffect(() => {
    if (!open || !file) return
    setName(file.name)
    setCategory(file.category)
    setDescription(file.description)
    setRemoved(false)
    setPending(null)
    setSubmitting(false)
  }, [open, file])

  const fieldFiles = useMemo(() => {
    if (pending) {
      return [{ id: 'pending', name: pending.fileName, size: pending.size, ext: pending.ext, url: pending.url, tag: '待保存' }]
    }
    if (removed || !current) return []
    return [{ id: 'current', name: current.fileName, size: current.size, ext: current.ext, url: current.url }]
  }, [pending, removed, current])

  const handlePick = async (fileList: File[]) => {
    const target = fileList[0]
    if (!target) return
    const error = validateFile(target)
    if (error) {
      toast(error, 'error')
      return
    }
    const url = await readAsDataUrl(target)
    setPending({ fileName: target.name, ext: extOf(target.name), size: target.size, url })
    setRemoved(false)
  }

  const handlePreview = (id: string) => {
    if (!file) return
    if (id === 'pending') {
      if (!pending) return
      onPreview(file, {
        id: 'pending',
        versionNo: 0,
        fileName: pending.fileName,
        ext: pending.ext,
        size: pending.size,
        uploadedBy: operator,
        uploadedAt: '',
        changeNote: '',
        url: pending.url,
      })
      return
    }
    if (!current) return
    if (!current.url) {
      toast('演示数据未包含文件内容，可上传本地文件后预览', 'error')
      return
    }
    onPreview(file, current)
  }

  const handleDownload = (id: string) => {
    if (id === 'pending' && pending) {
      downloadFile(pending.url, pending.fileName)
      return
    }
    if (current?.url) downloadFile(current.url, current.fileName)
    else toast('演示数据未包含文件内容，可上传本地文件后下载', 'error')
  }

  const handleSubmit = async () => {
    if (!file) return
    if (!name.trim()) {
      toast('文件名称不能为空', 'error')
      return
    }
    if (removed && !pending) {
      toast('已移除当前文件，请上传新文件后再保存', 'error')
      return
    }

    setSubmitting(true)
    try {
      await updateLibraryFileMeta(
        file.id,
        {
          name: name.trim(),
          category,
          description: description.trim(),
        },
        operator,
      )
      if (pending) {
        await replaceLibraryFile(file.id, pending, operator)
        toast(refCount > 0 ? `文件已替换，已同步 ${refCount} 处引用` : '文件已替换并保存')
      } else {
        toast('已保存')
      }
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryOptions: SelectOption[] = categoryOrder.map((item) => ({
    label: categoryText[item],
    value: item,
  }))

  const hint = pending
    ? '保存后替换当前文件；新文件将同步到所有引用处'
    : removed
      ? '已移除当前文件，请选择新文件后保存'
      : '支持 PDF / 图片 / Word / Excel，单文件 ≤ 20MB；选择新文件即替换当前文件'

  return (
    <Modal
      open={open}
      title="编辑文件"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-item">
          <span className="form-label required">文件名称</span>
          <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-item">
          <span className="form-label required">文件分类</span>
          <Select
            value={category}
            options={categoryOptions}
            onChange={(e) => setCategory(e.target.value as LibraryFileCategory)}
          />
        </div>

        <div className="form-item form-item-full">
          <span className="form-label required">文件</span>
          <FileUploadField
            files={fieldFiles}
            accept={FILE_ACCEPT}
            hint={hint}
            emptyText={removed ? '已移除当前文件，请选择新文件' : '暂无文件，请点击「选择文件」上传'}
            onPick={(fileList) => void handlePick(fileList)}
            onRemove={(id) => {
              if (id === 'pending') setPending(null)
              else setRemoved(true)
            }}
            onPreview={(item) => handlePreview(item.id)}
            onDownload={(item) => handleDownload(item.id)}
          />
          {refCount > 0 && (
            <span className="file-form-tip">该文件已被 {refCount} 处业务引用，替换后这些业务同步使用新文件</span>
          )}
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

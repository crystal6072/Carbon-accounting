import { useCallback, useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Select, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { collectFactorsToLibrary, createMyFactorLibrary, fetchMyFactorLibraries } from '@/mock'
import type { MyFactorLibrary } from '@/types'
import './FactorPage.css'

interface FactorCollectModalProps {
  open: boolean
  /** 源库版本（收藏来源） */
  sourceVersionId: string
  /** 待收藏的因子 id */
  factorIds: string[]
  onClose: () => void
  onCollected: (success: number, failed: number) => void
}

/**
 * 前台 · 收藏因子：把已发布库中的因子**复制**到「我的因子库」形成独立副本。
 * 收藏 = 复制式快照：源库后续更新**不会自动影响**副本，仅通过「有新版本可更新」手动更新。
 */
export default function FactorCollectModal({
  open,
  sourceVersionId,
  factorIds,
  onClose,
  onCollected,
}: FactorCollectModalProps) {
  const toast = useToast()
  const [libs, setLibs] = useState<MyFactorLibrary[]>([])
  const [targetId, setTargetId] = useState('')
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const list = await fetchMyFactorLibraries()
    setLibs(list)
    setTargetId((prev) => prev || list[0]?.id || '')
  }, [])

  useEffect(() => {
    if (!open) return
    setNewName('')
    void load()
  }, [open, load])

  const options: SelectOption[] = libs.map((item) => ({
    label: `${item.name}（${item.factorCount} 个因子）`,
    value: item.id,
  }))

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast('请输入新库名称', 'error')
      return
    }
    const created = await createMyFactorLibrary(newName)
    toast('已创建「我的因子库」')
    setNewName('')
    setTargetId(created.id)
    await load()
  }

  const handleSubmit = async () => {
    if (!targetId) {
      toast('请先创建或选择「我的因子库」', 'error')
      return
    }
    setSubmitting(true)
    try {
      const result = await collectFactorsToLibrary(sourceVersionId, factorIds, targetId)
      onCollected(result.success, result.failed.length)
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '收藏失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={<span data-ann-target="pcf-factor.collect.modal">收藏因子到「我的因子库」</span>}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting || factorIds.length === 0} onClick={handleSubmit}>
            {submitting ? '收藏中…' : `收藏所选因子（${factorIds.length}）`}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="收藏到" required full>
          <div data-ann-target="pcf-factor.collect.target">
          <Select
            value={targetId}
            placeholder="请选择「我的因子库」"
            options={options}
            onChange={(e) => setTargetId(e.target.value)}
          />
          </div>
        </FormField>
        <FormField label="或新建「我的因子库」" full>
          <div className="flex gap-xs" data-ann-target="pcf-factor.collect.new">
            <Input value={newName} placeholder="请输入库名称" onChange={(e) => setNewName(e.target.value)} />
            <Button onClick={handleCreate}>新建</Button>
          </div>
        </FormField>
      </div>
    </Modal>
  )
}

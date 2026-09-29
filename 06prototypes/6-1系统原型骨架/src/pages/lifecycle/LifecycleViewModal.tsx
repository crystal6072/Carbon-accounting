import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Tag, useToast } from '@/shared/components'
import { fetchLifecycleStages } from '@/mock'
import type { LifecycleStageItem } from '@/types'
import {
  inclusionHint,
  inclusionText,
  inclusionTone,
  industriesText,
  levelText,
  levelTone,
  useStatusText,
  useStatusTone,
} from './lifecycleMeta'

interface LifecycleViewModalProps {
  open: boolean
  stageId: string | null
  onClose: () => void
  /** 点击「编辑」：由调用页关闭查看弹窗并打开编辑弹窗 */
  onEdit: (stageId: string) => void
}

/** 生命周期阶段查看弹窗（只读）：使用状态画在内容区，不做标题栏 Badge */
export default function LifecycleViewModal({ open, stageId, onClose, onEdit }: LifecycleViewModalProps) {
  const toast = useToast()

  const [stage, setStage] = useState<LifecycleStageItem | null>(null)
  const [parentName, setParentName] = useState<string>('-')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!open || !stageId) return
    setLoading(true)
    try {
      const list = await fetchLifecycleStages()
      const target = list.find((item) => item.id === stageId) ?? null
      setStage(target)
      setParentName(target?.parentId ? list.find((item) => item.id === target.parentId)?.name ?? '-' : '-')
    } catch (error) {
      toast(error instanceof Error ? error.message : '生命周期阶段加载失败', 'error')
      setStage(null)
    } finally {
      setLoading(false)
    }
  }, [open, stageId, toast])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Modal
      open={open}
      title="查看阶段"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>关闭</Button>
          <Button variant="primary" disabled={!stage} onClick={() => stage && onEdit(stage.id)}>
            编辑
          </Button>
        </>
      }
    >
      {loading && <div className="empty">加载中…</div>}
      {!loading && !stage && <div className="empty">生命周期阶段不存在或已被删除</div>}
      {!loading && stage && (
        <>
          <div className="view-block">
            <div className="view-block-title">基本信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">阶段编码</span>
                <span className="detail-value mono">{stage.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">阶段名称</span>
                <span className="detail-value">{stage.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">阶段层级</span>
                <span className="detail-value">
                  <Tag tone={levelTone[stage.level]}>{levelText[stage.level]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">上级阶段</span>
                <span className="detail-value">{parentName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">阶段顺序</span>
                <span className="detail-value">{stage.order}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">适用行业</span>
                <span className="detail-value">{industriesText(stage)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={useStatusTone[stage.status]}>{useStatusText[stage.status]}</Tag>
                </span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">阶段描述</span>
                <span className="detail-value">{stage.description || '-'}</span>
              </div>
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">默认纳入规则</div>
            <div className="rule-list">
              <div className="rule-item">
                <span className="rule-label">摇篮到大门</span>
                <span className="rule-value">
                  <Tag tone={inclusionTone[stage.gateRule]}>{inclusionText[stage.gateRule]}</Tag>
                  <span className="form-tip">{inclusionHint[stage.gateRule]}</span>
                </span>
              </div>
              <div className="rule-item">
                <span className="rule-label">摇篮到坟墓</span>
                <span className="rule-value">
                  <Tag tone={inclusionTone[stage.graveRule]}>{inclusionText[stage.graveRule]}</Tag>
                  <span className="form-tip">{inclusionHint[stage.graveRule]}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">制单信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{stage.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{stage.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新人</span>
                <span className="detail-value">{stage.updatedBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{stage.updatedAt}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

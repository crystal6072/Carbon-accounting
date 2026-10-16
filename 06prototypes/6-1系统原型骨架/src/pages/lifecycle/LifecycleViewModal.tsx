import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Tag, useToast } from '@/shared/components'
import { boundaryLabelOf, fetchLifecycleStages } from '@/mock'
import type { LifecycleStageItem } from '@/types'
import {
  isCommonBoundary,
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
          <Button data-ann-target="lifecycle.view.close" onClick={onClose}>关闭</Button>
          <Button variant="primary" data-ann-target="lifecycle.view.edit" disabled={!stage} onClick={() => stage && onEdit(stage.id)}>
            编辑
          </Button>
        </>
      }
    >
      {loading && <div className="empty">加载中…</div>}
      {!loading && !stage && <div className="empty">生命周期阶段不存在或已被删除</div>}
      {!loading && stage && (
        <>
          <div className="view-block" data-ann-target="lifecycle.view.body">
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
            <div className="view-block-title">适用系统边界</div>
            <div className="rule-list">
              <div className="rule-item">
                <span className="rule-label">系统边界</span>
                <span className="rule-value">
                  {isCommonBoundary(stage) ? (
                    <Tag>全边界通用</Tag>
                  ) : (
                    <span className="boundary-cell">
                      {stage.boundaries.map((code) => (
                        <Tag key={code} tone="info">
                          {boundaryLabelOf(code)}
                        </Tag>
                      ))}
                    </span>
                  )}
                  <span className="form-tip">引用「平台支撑 · 数据字典 · 系统边界」；为空表示适用于全部系统边界</span>
                </span>
              </div>
            </div>
          </div>

          <div className="view-block" data-ann-target="lifecycle.view.meta">
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

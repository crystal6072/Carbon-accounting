import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, useToast } from '@/shared/components'
import { deleteMyModel, fetchMyModel } from '@/mock'
import type { MyModel } from '@/mock'
import ModelDetailView from './ModelDetailView'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 前台 · 我的模型详情。
 * - 「自己新增」（manual）与「加入副本」（collected）同权：均可编辑 / 删除；
 * - 加入副本额外展示来源模型与来源版本提示（复制式快照，修改源模型不影响本副本）。
 */
export default function MyModelDetailPage() {
  const { modelId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [model, setModel] = useState<MyModel | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setModel(await fetchMyModel(modelId))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
      setModel(null)
    } finally {
      setLoading(false)
    }
  }, [modelId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async () => {
    if (!model) return
    if (!window.confirm(`确认删除模型「${model.name}」？删除后不可恢复。`)) return
    try {
      await deleteMyModel(model.id)
      toast('删除成功')
      navigate('/pcf/my-model')
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  if (!model) {
    return (
      <>
        <PageHeader
          breadcrumb={['产品碳足迹', '模型管理', '我的模型', '模型详情']}
          title="模型详情"
          onBack={() => navigate('/pcf/my-model')}
        />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '模型不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  const isCollected = model.origin === 'collected'

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '模型管理', '我的模型', model.name]}
        title={model.name}
        description={`${model.code} · ${model.version} · ${model.standardName} · 创建 ${model.createdAt}${isCollected ? ' · 平台模型副本' : ''}`}
        onBack={() => navigate('/pcf/my-model')}
        actions={
          <>
            <Button variant="primary" onClick={() => navigate(`/pcf/my-model/${model.id}/edit`)}>
              编辑
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()}>
              删除
            </Button>
          </>
        }
      />

      <ModelDetailView
        model={model}
        notice={
          isCollected ? (
            <span data-ann-target="mym.detail.origin">
              平台模型副本：由平台模型库「{model.sourceModelName || model.sourceModelId || '-'}」{model.version} 版本复制生成，与本组织自建模型同权（可编辑 / 删除）；修改源模型不影响本副本。
            </span>
          ) : undefined
        }
      />
    </>
  )
}

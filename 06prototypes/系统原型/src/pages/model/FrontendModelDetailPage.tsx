import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, useToast } from '@/shared/components'
import { collectModelToMy, fetchPublishedModel } from '@/mock'
import type { CarbonModel } from '@/mock'
import ModelDetailView from './ModelDetailView'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 前台 · 模型库详情（只读预览）。
 * 展示平台模型当前版本号；「加入我的模型」按当前版本复制一份到本组织（复制式快照，可重复加入）。
 */
export default function FrontendModelDetailPage() {
  const { modelId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [model, setModel] = useState<CarbonModel | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setModel(await fetchPublishedModel(modelId))
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

  const handleCollect = async () => {
    if (!model) return
    try {
      await collectModelToMy(model.id)
      toast(`已加入我的模型：${model.name}（${model.version} 副本）`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  if (!model) {
    return (
      <>
        <PageHeader
          breadcrumb={['产品碳足迹', '模型管理', '模型库', '模型详情']}
          title="模型详情"
          onBack={() => navigate('/pcf/model-libraries')}
        />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '该模型尚未发布或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '模型管理', '模型库', model.name]}
        title={<span data-ann-target="lib.detail">{model.name}</span>}
        description={`${model.code} · ${model.version} · ${model.standardName} · 更新 ${model.updatedAt} · 只读预览`}
        onBack={() => navigate('/pcf/model-libraries')}
        actions={
          <Button variant="primary" data-ann-target="lib.join" onClick={() => void handleCollect()}>
            加入我的模型
          </Button>
        }
      />

      <ModelDetailView
        model={model}
        notice={`模型库为平台已发布模型，仅支持只读预览；「加入我的模型」将按当前版本 ${model.version} 复制一份到本组织（复制式快照，不与平台模型联动；同一模型可重复加入，每次新增一条副本）。`}
      />
    </>
  )
}

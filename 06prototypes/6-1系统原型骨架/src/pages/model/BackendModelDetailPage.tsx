import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, useToast } from '@/shared/components'
import { deleteModel, disableModel, enableModel, fetchModel, publishModel } from '@/mock'
import type { CarbonModel } from '@/mock'
import ModelDetailView from './ModelDetailView'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 后台 · 模型详情（只读）。复用 `ModelDetailView` 展示「目标与范围 + 产品建模」，
 * 顶部按状态给出可用动作：编辑 / 发布 / 停用 / 重新启用 / 删除。
 */
export default function BackendModelDetailPage() {
  const { modelId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [model, setModel] = useState<CarbonModel | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setModel(await fetchModel(modelId))
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

  const run = async (action: () => Promise<unknown>, successText: string) => {
    try {
      await action()
      toast(successText)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handlePublish = () => {
    if (!model) return
    const isEnable = model.status === 'disabled'
    const verb = isEnable ? '重新启用' : '发布'
    const tip = isEnable ? '启用后前台模型库重新可见。' : '发布后前台模型库可见。'
    if (!window.confirm(`确认${verb}模型「${model.name}」？${tip}`)) return
    void run(() => publishModel(model.id), `${verb}成功`)
  }

  const handleDisable = () => {
    if (!model) return
    if (!window.confirm(`确认停用模型「${model.name}」？停用后前台模型库不再展示，已引用该模型的项目不受影响。`)) return
    void run(() => disableModel(model.id), '停用成功')
  }

  const handleDelete = () => {
    if (!model) return
    if (!window.confirm(`确认删除模型「${model.name}」？删除后不可恢复。`)) return
    void run(async () => {
      await deleteModel(model.id)
      navigate('/model/library')
    }, '删除成功')
  }

  if (!model) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '模型管理', '模型详情']} title="模型详情" onBack={() => navigate('/model/library')} />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '模型不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '模型管理', model.name]}
        title={model.name}
        description={`${model.code} · 维护人 ${model.maintainer} · 创建 ${model.createdAt} · 更新 ${model.updatedAt}`}
        onBack={() => navigate('/model/library')}
        actions={
          <>
            {model.status !== 'published' && (
              <Button onClick={() => navigate(`/model/library/${model.id}/edit`)}>编辑</Button>
            )}
            {model.status !== 'published' && (
              <Button variant="primary" onClick={handlePublish}>
                {model.status === 'disabled' ? '重新启用' : '发布'}
              </Button>
            )}
            {model.status === 'published' && <Button onClick={handleDisable}>停用</Button>}
            {model.status !== 'published' && (
              <Button variant="danger" onClick={handleDelete}>
                删除
              </Button>
            )}
          </>
        }
      />

      <ModelDetailView model={model} />
    </>
  )
}

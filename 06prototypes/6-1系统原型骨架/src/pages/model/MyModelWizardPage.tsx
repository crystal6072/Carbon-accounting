import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader, useToast } from '@/shared/components'
import { fetchMyModel } from '@/mock'
import type { MyModel } from '@/mock'
import ModelWizard from './ModelWizard'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 前台 · 我的模型新建 / 编辑向导页（与后台共用 `ModelWizard`，仅保存适配器不同）。
 * 收藏副本为只读，访问编辑路由时自动跳回详情。
 */
export default function MyModelWizardPage() {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const isEdit = !!modelId
  const [model, setModel] = useState<MyModel | null>(null)
  const [loading, setLoading] = useState(isEdit)

  const load = useCallback(async () => {
    if (!modelId) return
    setLoading(true)
    try {
      const detail = await fetchMyModel(modelId)
      if (detail.origin === 'collected') {
        toast('收藏副本为只读，不可编辑', 'error')
        navigate(`/pcf/my-model/${modelId}`, { replace: true })
        return
      }
      setModel(detail)
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
      navigate('/pcf/my-model', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [modelId, navigate, toast])

  useEffect(() => {
    void load()
  }, [load])

  const title = isEdit ? '编辑模型' : '新建模型'

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '模型管理', '我的模型', title]}
        title={title}
        description="写入「我的模型」（仅本组织可见）；内容与后台模型一致，可用于新建核算项目时直接引用。"
        onBack={() => navigate('/pcf/my-model')}
      />

      {loading ? (
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      ) : (
        <div className="card">
          <ModelWizard
            mode="org"
            initial={model}
            onSaved={(id) => navigate(`/pcf/my-model/${id}`)}
            onCancel={() => navigate('/pcf/my-model')}
          />
        </div>
      )}
    </>
  )
}

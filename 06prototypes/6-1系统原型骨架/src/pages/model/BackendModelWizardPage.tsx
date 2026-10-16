import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader, useToast } from '@/shared/components'
import { fetchModel } from '@/mock'
import type { CarbonModel } from '@/mock'
import ModelWizard from './ModelWizard'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

/**
 * 后台 · 模型新建 / 编辑向导页（两步：目标与范围 → 产品建模）。
 * 新建后为「草稿」，可在向导内「保存并发布」直接发布到前台模型库。
 */
export default function BackendModelWizardPage() {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const isEdit = !!modelId
  const [model, setModel] = useState<CarbonModel | null>(null)
  const [loading, setLoading] = useState(isEdit)

  const load = useCallback(async () => {
    if (!modelId) return
    setLoading(true)
    try {
      const detail = await fetchModel(modelId)
      if (detail.status === 'published') {
        toast('已发布模型不可直接编辑，请先返回列表停用后再编辑', 'error')
        navigate(`/model/library/${modelId}`, { replace: true })
        return
      }
      setModel(detail)
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
      navigate('/model/library', { replace: true })
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
        breadcrumb={['系统管理', '模型管理', title]}
        title={title}
        description="模型 = 「目标与范围 + 产品建模」的可复用模板；保存为草稿，发布后前台模型库可见、可供新建核算项目引用。"
        onBack={() => navigate('/model/library')}
      />

      {loading ? (
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      ) : (
        <div className="card">
          <ModelWizard
            mode="platform"
            initial={model}
            onSaved={(id) => navigate(`/model/library/${id}`)}
            onCancel={() => navigate('/model/library')}
          />
        </div>
      )}
    </>
  )
}

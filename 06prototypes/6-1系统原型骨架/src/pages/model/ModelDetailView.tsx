import type { ReactNode } from 'react'
import { Tag } from '@/shared/components'
import type { CarbonModel, MyModel } from '@/types'
import ModelWizard from './ModelWizard'
import { MODEL_STATUS_TEXT, MODEL_STATUS_TONE, MY_MODEL_ORIGIN_TEXT, MY_MODEL_ORIGIN_TONE } from './modelMeta'
import '@/pages/pcf/PcfPage.css'
import './ModelPage.css'

interface ModelDetailViewProps {
  model: CarbonModel | MyModel
  /** 顶部提示条（如收藏副本只读说明） */
  notice?: ReactNode
}

/**
 * 模型只读详情（后台模型详情、前台模型库预览、我的模型详情共用）。
 * **与新建 / 编辑页交互保持一致**：复用同一套「目标与范围 → 产品建模」两步向导与步骤条，
 * 仅字段转为纯文本、底部仅保留「上一步 / 下一步」。
 */
export default function ModelDetailView({ model, notice }: ModelDetailViewProps) {
  const isPlatform = model.scope === 'platform'

  const metaTag = isPlatform ? (
    <Tag tone={MODEL_STATUS_TONE[(model as CarbonModel).status]}>
      {MODEL_STATUS_TEXT[(model as CarbonModel).status]}
    </Tag>
  ) : (
    <Tag tone={MY_MODEL_ORIGIN_TONE[(model as MyModel).origin]}>
      {MY_MODEL_ORIGIN_TEXT[(model as MyModel).origin]}
    </Tag>
  )

  const metaFields: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: '模型编码', value: model.code, mono: true },
    {
      label: isPlatform ? '维护人' : '模型来源',
      value: isPlatform
        ? (model as CarbonModel).maintainer
        : (model as MyModel).sourceModelName
          ? `收藏自 ${(model as MyModel).sourceModelName}`
          : '组织自建',
    },
    ...(isPlatform ? [{ label: '创建时间', value: (model as CarbonModel).createdAt }] : []),
    { label: '更新时间', value: model.updatedAt },
  ]

  return (
    <div className="card">
      <ModelWizard
        mode={isPlatform ? 'platform' : 'org'}
        initial={model}
        readOnly
        metaTag={metaTag}
        metaFields={metaFields}
        notice={notice}
      />
    </div>
  )
}

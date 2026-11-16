import { Button, Tag } from '@/shared/components'
import type { IndustryItem } from '@/types'
import { levelText, useStatusText, useStatusTone } from './industryMeta'

interface IndustryDetailPanelProps {
  item: IndustryItem
  /** 上级行业名称（门类展示 `-`） */
  parentName: string
  /** 点击上级行业：跳到该上级的详情 */
  onOpenParent: (parentId: string) => void
  onEdit: (item: IndustryItem) => void
  /** 启用 / 禁用：由调用页弹二次确认 */
  onToggleStatus: (item: IndustryItem) => void
}

/**
 * 行业详情面板（选中左树节点后展示）：基本信息 + 行业描述。
 * 操作入口（编辑 / 启用 / 禁用）放在面板顶部工具栏，与列表态的工具栏位置一致。
 */
export default function IndustryDetailPanel({
  item,
  parentName,
  onOpenParent,
  onEdit,
  onToggleStatus,
}: IndustryDetailPanelProps) {
  return (
    <>
      <div className="toolbar">
        <div className="flex gap-sm">
          <span className="toolbar-title">{item.name}</span>
          <Tag tone={useStatusTone[item.status]}>{useStatusText[item.status]}</Tag>
          <span className="toolbar-tip">{levelText(item.level)}</span>
        </div>
        <div className="flex gap-xs">
          <Button size="small" data-ann-target="industry.detail.edit" onClick={() => onEdit(item)}>
            编辑
          </Button>
          <Button
            size="small"
            variant={item.status === 'enabled' ? 'danger' : 'primary'}
            data-ann-target={item.status === 'enabled' ? 'industry.detail.disable' : 'industry.detail.enable'}
            onClick={() => onToggleStatus(item)}
          >
            {item.status === 'enabled' ? '禁用' : '启用'}
          </Button>
        </div>
      </div>

      <div className="industry-detail">
        <div className="view-block" data-ann-target="industry.detail.body">
          <div className="view-block-title">基本信息</div>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">行业编码</span>
              <span className="detail-value mono">{item.code}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">行业名称</span>
              <span className="detail-value">{item.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">行业层级</span>
              <span className="detail-value">{levelText(item.level)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">上级行业</span>
              <span className="detail-value">
                {item.parentId ? (
                  <button className="link" onClick={() => onOpenParent(item.parentId as string)}>
                    {parentName}
                  </button>
                ) : (
                  '-'
                )}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">排序号</span>
              <span className="detail-value mono">{item.sortNo == null ? '-' : item.sortNo}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">使用状态</span>
              <span className="detail-value">
                <Tag tone={useStatusTone[item.status]}>{useStatusText[item.status]}</Tag>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">创建人</span>
              <span className="detail-value">{item.createdBy}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">创建时间</span>
              <span className="detail-value nowrap">{item.createdAt}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">最后修改时间</span>
              <span className="detail-value nowrap">{item.updatedAt}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">最后修改人</span>
              <span className="detail-value">{item.updatedBy}</span>
            </div>
          </div>
        </div>

        <div className="view-block">
          <div className="view-block-title">行业描述</div>
          <div className="industry-detail-text">{item.description || '-'}</div>
        </div>

        <div className="view-block" data-ann-target="industry.detail.downstream">
          <div className="view-block-title">下游引用说明</div>
          <div className="form-tip">
            本行业的启用状态决定它是否出现在下游「适用行业 / 所属行业」下拉中：物料 / 能源为多选，
            产品信息 / 工艺流程 / 工序为单选必填。行业主数据变更不追溯已建核算项目。
          </div>
        </div>
      </div>
    </>
  )
}

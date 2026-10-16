import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Icon, Input, PageHeader, Tag, useToast } from '@/shared/components'
import {
  canDeleteFormula,
  canEditFormula,
  createFormulaConfig,
  duplicateFormulaConfig,
  FORMULA_TOTAL,
  listFormulaConfigs,
  removeFormulaConfig,
  setFormulaConfigStatus,
  type FormulaConfig,
  type FormulaStatus,
} from './formulaMeta'
import './FormulaPage.css'

const STATUS_TEXT: Record<FormulaStatus, string> = {
  draft: '草稿',
  published: '已发布',
}

const STATUS_TONE: Record<FormulaStatus, 'default' | 'success'> = {
  draft: 'default',
  published: 'success',
}

/**
 * 公式管理 · 列表页
 * 卡片网格展示所有公式配置；支持搜索、新增、复制、删除，点击卡片进入编辑。
 */
export default function FormulaListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState<FormulaConfig[]>(() => [...listFormulaConfigs()])

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    if (!text) return list
    return list.filter(
      (item) => item.name.toLowerCase().includes(text) || item.description.toLowerCase().includes(text),
    )
  }, [list, keyword])

  const refresh = () => setList([...listFormulaConfigs()])

  const handleCreate = () => {
    const name = window.prompt('请输入公式配置名称', '新公式配置')
    if (name === null) return
    if (!name.trim()) {
      toast('公式配置名称不能为空', 'error')
      return
    }
    const created = createFormulaConfig(name)
    navigate(`/model/formula/${created.id}`)
  }

  const handleCopy = (config: FormulaConfig) => {
    duplicateFormulaConfig(config.id)
    refresh()
    toast('复制成功，已生成草稿副本')
  }

  const handleDelete = (config: FormulaConfig) => {
    if (!canDeleteFormula(config)) {
      toast('已发布状态不可删除，请先取消发布', 'error')
      return
    }
    if (!window.confirm(`确认删除公式配置「${config.name}」？删除后不可恢复。`)) return
    removeFormulaConfig(config.id)
    refresh()
    toast('删除成功')
  }

  const handleTogglePublish = (config: FormulaConfig) => {
    const nextStatus: FormulaStatus = config.status === 'published' ? 'draft' : 'published'
    setFormulaConfigStatus(config.id, nextStatus)
    refresh()
    toast(nextStatus === 'published' ? '已发布' : '已取消发布')
  }

  const openEditor = (config: FormulaConfig) => {
    if (!canEditFormula(config)) {
      toast('已发布状态不可编辑，请先取消发布', 'error')
      return
    }
    navigate(`/model/formula/${config.id}`)
  }

  return (
    <div className="fm-page">
      <PageHeader
        title="公式管理"
        breadcrumb={['系统管理', '核算配置', '公式管理']}
        description="预先配置产品碳排计算方法：行级公式逐行计算排放、阶段汇总公式累加各阶段、全局公式折算单位产品碳足迹。"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            + 新增公式配置
          </Button>
        }
      />

      <div className="fm-list-toolbar">
        <div className="fm-search">
          <Icon name="search" size={15} />
          <Input
            value={keyword}
            placeholder="搜索公式配置名称 / 描述"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <span className="fm-list-count">共 {rows.length} 个公式配置</span>
      </div>

      {rows.length === 0 ? (
        <div className="fm-empty">
          <div className="fm-empty-title">暂无公式配置</div>
          <p className="fm-empty-desc">
            {keyword ? '没有匹配的公式配置，试试其它关键词。' : '点击「新增公式配置」开始配置产品碳排计算公式。'}
          </p>
          {!keyword && (
            <Button variant="primary" onClick={handleCreate}>
              + 新增公式配置
            </Button>
          )}
        </div>
      ) : (
        <div className="fm-grid">
          {rows.map((config) => {
            const configured = Object.values(config.formulas).filter((value) => value.trim()).length
            return (
              <article key={config.id} className="fm-card" onClick={() => openEditor(config)}>
                <div className="fm-card-head">
                  <h3 className="fm-card-title">{config.name}</h3>
                  <Tag tone={STATUS_TONE[config.status]}>{STATUS_TEXT[config.status]}</Tag>
                </div>
                <p className="fm-card-desc">{config.description || '暂无描述'}</p>

                <div className="fm-card-meta">
                  <span className="fm-meta-item">
                    版本 <em>{config.version}</em>
                  </span>
                  <span className="fm-meta-item">
                    更新人 <em>{config.updatedBy}</em>
                  </span>
                  <span className="fm-meta-item">
                    已配置 <em>{configured}/{FORMULA_TOTAL}</em>
                  </span>
                </div>

                <div className="fm-card-foot">
                  <span className="fm-card-time">更新于 {config.updatedAt}</span>
                  <span className="fm-card-actions">
                    <button
                      type="button"
                      className="fm-link"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleCopy(config)
                      }}
                    >
                      复制
                    </button>
                    <button
                      type="button"
                      className="fm-link"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleTogglePublish(config)
                      }}
                    >
                      {config.status === 'published' ? '取消发布' : '发布'}
                    </button>
                    {canDeleteFormula(config) ? (
                      <button
                        type="button"
                        className="fm-link fm-link-danger"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDelete(config)
                        }}
                      >
                        删除
                      </button>
                    ) : (
                      <span className="fm-link fm-link-disabled" title="已发布不可删除，请先取消发布">
                        删除
                      </span>
                    )}
                    {canEditFormula(config) ? (
                      <button
                        type="button"
                        className="fm-link"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditor(config)
                        }}
                      >
                        编辑
                      </button>
                    ) : (
                      <span className="fm-link fm-link-disabled" title="已发布不可编辑，请先取消发布">
                        编辑
                      </span>
                    )}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

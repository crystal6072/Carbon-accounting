import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Tag, useToast } from '@/shared/components'
import { deleteStandard, fetchStandard } from '@/mock'
import type { StandardAttachment, StandardItem } from '@/types'
import StandardAttachmentPreview from './StandardAttachmentPreview'
import StandardConfirmModal from './StandardConfirmModal'
import { attachmentSizeText, dateText, standardStatusTone } from './standardMeta'
import './StandardPage.css'

export default function StandardDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [standard, setStandard] = useState<StandardItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  /** 在线预览的附件 */
  const [previewTarget, setPreviewTarget] = useState<StandardAttachment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStandard(await fetchStandard(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '标准文件加载失败', 'error')
      setStandard(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async () => {
    if (!standard) return
    try {
      await deleteStandard(standard.id)
      toast('删除成功')
      navigate('/basic/standard')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
      setConfirmOpen(false)
    }
  }

  if (!standard) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '基础库', '标准文件库']} title="标准文件详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '标准文件不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '基础库', '标准文件库', standard.nameZh]}
        title={standard.code}
        description={`${standard.nameZh} · ${standard.status}`}
        actions={
          <>
            <Button onClick={() => navigate('/basic/standard')}>返回列表</Button>
            <Button data-ann-target="standard.detail.delete" onClick={() => setConfirmOpen(true)}>删除</Button>
            <Button variant="primary" data-ann-target="standard.detail.edit" onClick={() => navigate(`/basic/standard/${standard.id}/edit`)}>
              编辑
            </Button>
          </>
        }
      />

      <div className="standard-stack">
        <section className="card" data-ann-target="standard.detail.body">
          <div className="standard-section-header">
            <span className="standard-section-title">基本信息</span>
            <span className="toolbar-tip">必填：标准号 / 中文标准名称 / 标准状态 / 发布、实施日期 / 发布单位</span>
          </div>
          <div className="standard-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">标准号</span>
                <span className="detail-value mono">{standard.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">标准状态</span>
                <span className="detail-value">
                  <Tag tone={standardStatusTone(standard.status)}>{standard.status || '-'}</Tag>
                </span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">中文标准名称</span>
                <span className="detail-value">{standard.nameZh}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">英文标准名称</span>
                <span className="detail-value">{standard.nameEn || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">发布日期</span>
                <span className="detail-value">{dateText(standard.publishDate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">实施日期</span>
                <span className="detail-value">{dateText(standard.implementDate)}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">发布单位</span>
                <span className="detail-value">{standard.publisher}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">主管部门</span>
                <span className="detail-value">{standard.competentDept || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">归口部门</span>
                <span className="detail-value">{standard.responsibleDept || '-'}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">来源链接</span>
                <span className="detail-value">
                  {standard.sourceUrl ? (
                    <a className="link" href={standard.sourceUrl} target="_blank" rel="noreferrer">
                      {standard.sourceUrl}
                    </a>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="standard-section-body standard-section-tip">
            一个标准号 = 一条记录，版本年份并入标准号（D01 / D02）；「来源链接」与「附件」二选一，至少填写一个（D03）。
          </div>
        </section>

        <section className="card" data-ann-target="standard.detail.attachments">
          <div className="standard-section-header">
            <span className="standard-section-title">标准文件附件</span>
            <span className="toolbar-tip">选填 · 可多个 · 与「来源链接」二选一 · 仅限内部查阅</span>
          </div>
          <div className="standard-section-body">
            {standard.attachments.length > 0 ? (
              <div className="standard-attach-list">
                {standard.attachments.map((att) => (
                  <div className="standard-attach-item" key={att.id}>
                    <span className="standard-attach-name" title={att.name}>
                      {att.name}
                    </span>
                    <span className="standard-attach-meta">
                      {attachmentSizeText(att.size)} · {att.uploadedAt}
                    </span>
                    <button className="link" onClick={() => setPreviewTarget(att)}>
                      在线预览
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">暂无附件（已提供来源链接）</div>
            )}
          </div>
          <div className="standard-section-body standard-section-tip">
            附件缺失不影响模型绑定、核算与报告，核算基于元数据与来源链接（A4）。GB/T 与 ISO
            标准文本受版权保护：仅限企业内部查阅，不得作为对外交付物、不得跨租户共享（A3 / A6）。
          </div>
        </section>
      </div>

      <StandardAttachmentPreview
        open={!!previewTarget}
        attachment={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />

      <StandardConfirmModal
        open={confirmOpen}
        standard={standard}
        mode="delete"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}

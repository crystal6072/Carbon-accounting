import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Tag, useToast } from '@/shared/components'
import { canMaintainKnowledge, deleteCase, fetchCase } from '@/mock'
import type { CarbonCase } from '@/types'
import CaseLibraryConfirmModal from './CaseLibraryConfirmModal'
import { CASE_TYPE_LABEL, CASE_TYPE_TAG_TONE, CASE_STATUS_LABEL, caseStatusTone, reductionText } from './caseLibraryMeta'
import './CaseLibraryPage.css'

export default function CaseLibraryDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const canMaintain = canMaintainKnowledge()

  const [item, setItem] = useState<CarbonCase | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItem(await fetchCase(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '案例加载失败', 'error')
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async () => {
    if (!item) return
    try {
      await deleteCase(item.id)
      toast('删除成功')
      navigate('/case/library')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
      setConfirmOpen(false)
    }
  }

  if (!item) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '碳核算知识库', '典型案例库']} title="案例详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '案例不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '碳核算知识库', '典型案例库', item.caseName]}
        title={item.caseName}
        description={`${CASE_TYPE_LABEL[item.caseType]} · ${CASE_STATUS_LABEL[item.status]}`}
        actions={
          <>
            <Button onClick={() => navigate('/case/library')}>返回列表</Button>
            {canMaintain && (
              <>
                <Button onClick={() => setConfirmOpen(true)}>删除</Button>
                <Button variant="primary" onClick={() => navigate(`/case/library/${item.id}/edit`)}>编辑</Button>
              </>
            )}
          </>
        }
      />

      <div className="case-detail-stack">
        <section className="card">
          <div className="case-detail-meta">
            <span><Tag tone={CASE_TYPE_TAG_TONE[item.caseType]}>{CASE_TYPE_LABEL[item.caseType]}</Tag></span>
            <span><Tag tone="primary">平台官方</Tag></span>
            <span>所属行业：{item.industry}</span>
            <span>实施主体：{item.subjectName || '-'}</span>
            <span>年减排量：{reductionText(item.reductionAmount)}</span>
            <span>状态：<Tag tone={caseStatusTone(item.status)}>{CASE_STATUS_LABEL[item.status]}</Tag></span>
            <span>发布时间：{item.publishedAt || '-'}</span>
          </div>
          {item.coverUrl && <img src={item.coverUrl} alt="封面" className="case-detail-cover" />}
          {item.summary && <div className="case-detail-summary">{item.summary}</div>}
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: item.content }} />
        </section>

        {item.attachmentUrl && (
          <section className="card">
            <div className="case-section-header"><span className="case-section-title">附件报告</span></div>
            <div className="case-section-body">
              <div className="case-attachment-row">
                <span className="case-attachment-name">{item.attachmentName || '案例报告.pdf'}</span>
                <div className="case-attachment-actions">
                  <Button size="small" onClick={() => window.open(item.attachmentUrl, '_blank')}>预览</Button>
                  <a
                    className="btn btn-sm"
                    href={item.attachmentUrl}
                    download={item.attachmentName || '案例报告.pdf'}
                  >
                    下载
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {item.linkUrl && (
          <section className="card">
            <div className="case-section-header"><span className="case-section-title">外部链接</span></div>
            <div className="case-section-body">
              <div className="case-attachment-row">
                <span className="case-attachment-name case-link-text" title={item.linkUrl}>{item.linkUrl}</span>
                <div className="case-attachment-actions">
                  <Button size="small" variant="primary" onClick={() => window.open(item.linkUrl, '_blank')}>跳转链接</Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <CaseLibraryConfirmModal
        open={confirmOpen}
        item={item}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}

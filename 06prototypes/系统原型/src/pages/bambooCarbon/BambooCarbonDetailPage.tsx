import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Tag, useToast } from '@/shared/components'
import { canMaintainKnowledge, deleteBambooCarbonTopic, fetchBambooCarbonTopic } from '@/mock'
import type { BambooCarbonTopic } from '@/types'
import BambooCarbonConfirmModal from './BambooCarbonConfirmModal'
import { BAMBOO_CATEGORY_LABEL, BAMBOO_STATUS_LABEL, bambooStatusTone } from './bambooCarbonMeta'
import './BambooCarbonPage.css'

export default function BambooCarbonDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const canMaintain = canMaintainKnowledge()

  const [topic, setTopic] = useState<BambooCarbonTopic | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTopic(await fetchBambooCarbonTopic(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '文章加载失败', 'error')
      setTopic(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async () => {
    if (!topic) return
    try {
      await deleteBambooCarbonTopic(topic.id)
      toast('删除成功')
      navigate('/basic/bamboo-carbon')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
      setConfirmOpen(false)
    }
  }

  if (!topic) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '碳核算知识库', '木竹碳专题库']} title="文章详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '文章不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '碳核算知识库', '木竹碳专题库', topic.title]}
        title={topic.title}
        description={`${BAMBOO_CATEGORY_LABEL[topic.category]} · ${BAMBOO_STATUS_LABEL[topic.status]}`}
        actions={
          <>
            <Button onClick={() => navigate('/basic/bamboo-carbon')}>返回列表</Button>
            {canMaintain && (
              <>
                <Button onClick={() => setConfirmOpen(true)}>删除</Button>
                <Button variant="primary" onClick={() => navigate(`/basic/bamboo-carbon/${topic.id}/edit`)}>编辑</Button>
              </>
            )}
          </>
        }
      />

      <div className="bamboo-stack">
        <section className="card">
          <div className="bamboo-detail-meta">
            <span><Tag tone="primary">平台官方</Tag></span>
            <span>分类：{BAMBOO_CATEGORY_LABEL[topic.category]}</span>
            <span>状态：<Tag tone={bambooStatusTone(topic.status)}>{BAMBOO_STATUS_LABEL[topic.status]}</Tag></span>
            <span>发布时间：{topic.publishedAt || '-'}</span>
          </div>
          {topic.coverUrl && <img src={topic.coverUrl} alt="封面" className="bamboo-detail-cover" />}
          {topic.summary && <div className="bamboo-detail-summary">{topic.summary}</div>}
          {/* 富文本正文：原型以 HTML 渲染，支持图文混排与表格 */}
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: topic.content }} />
          {topic.attachments?.length > 0 && (
            <div className="bamboo-attach-detail">
              <div className="bamboo-attach-detail-title">附件下载</div>
              <ul className="bamboo-attach-detail-list">
                {topic.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={a.url} download={a.name} className="link">📎 {a.name}</a>
                    <span className="bamboo-attach-size">{a.size < 1024 ? `${a.size} B` : `${(a.size / 1024).toFixed(1)} KB`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="bamboo-attach-detail">
            <div className="bamboo-attach-detail-title">外部链接</div>
            {topic.link?.trim() ? (
              <ul className="bamboo-attach-detail-list">
                <li>
                  <a href={topic.link} target="_blank" rel="noreferrer" className="link">🔗 {topic.link}</a>
                </li>
              </ul>
            ) : (
              <div className="bamboo-empty-hint">未配置</div>
            )}
          </div>
        </section>
      </div>

      <BambooCarbonConfirmModal
        open={confirmOpen}
        topic={topic}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}

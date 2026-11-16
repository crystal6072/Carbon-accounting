import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Tag, useToast } from '@/shared/components'
import { fetchPortalBambooCarbonTopic } from '@/mock'
import type { BambooCarbonTopic } from '@/types'
import { BAMBOO_CATEGORY_LABEL, ownerText, ownerTone } from '@/pages/bambooCarbon/bambooCarbonMeta'
import './KnowledgePage.css'

export default function KnowledgeTopicDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [topic, setTopic] = useState<BambooCarbonTopic | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTopic(await fetchPortalBambooCarbonTopic(id))
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

  if (!topic) {
    return (
      <>
        <PageHeader breadcrumb={['产品碳足迹', '知识中心', '木竹碳专题知识']} title="文章详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '文章不存在或尚未发布'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '知识中心', '木竹碳专题知识', topic.title]}
        title={topic.title}
        description={`${BAMBOO_CATEGORY_LABEL[topic.category]}`}
        actions={
          <Button onClick={() => navigate('/knowledge/bamboo-carbon')}>返回列表</Button>
        }
      />

      <div className="card knowledge-detail">
        <div className="knowledge-detail-meta">
          <Tag tone={ownerTone(topic)}>{ownerText(topic)}</Tag>
          <span>{BAMBOO_CATEGORY_LABEL[topic.category]}</span>
          <span>{topic.publishedAt}</span>
        </div>
        {topic.coverUrl && <img src={topic.coverUrl} alt={topic.title} className="knowledge-detail-cover" />}
        {topic.summary && <div className="knowledge-detail-summary">{topic.summary}</div>}
        <article className="rich-text" dangerouslySetInnerHTML={{ __html: topic.content }} />
        {topic.attachments?.length > 0 && (
          <div className="bamboo-attach-detail">
            <div className="bamboo-attach-detail-title">📎 附件下载</div>
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
        {topic.link?.trim() && (
          <div className="bamboo-link-detail">
            <a href={topic.link} target="_blank" rel="noreferrer" className="bamboo-link-btn">
              🔗 访问原文 / 外部链接
            </a>
          </div>
        )}
      </div>
    </>
  )
}

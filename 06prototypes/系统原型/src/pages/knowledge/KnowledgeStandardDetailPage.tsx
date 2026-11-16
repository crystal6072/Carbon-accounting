import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Descriptions, Tag } from 'tdesign-react'
import { BrowseIcon, FileIcon, LinkIcon } from 'tdesign-icons-react'
import { PageHeader, useToast } from '@/shared/components'
import { fetchPortalStandard } from '@/mock'
import type { StandardAttachment, StandardItem } from '@/types'
import StandardAttachmentPreview from '@/pages/standard/StandardAttachmentPreview'
import { attachmentSizeText, standardStatusTone } from '@/pages/standard/standardMeta'
import './KnowledgePage.css'

/** 后台语义色（success / warning / error / default）映射到 TDesign Tag 主题 */
const STATUS_THEME: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  default: 'default',
}

/**
 * 知识中心 · 标准规范详情（业务端只读）。
 * 展示平台维护的标准元数据与查阅入口：来源链接（新开页）与附件在线预览；
 * 与后台详情同源，但不含编辑 / 删除等维护动作。
 */
export default function KnowledgeStandardDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [standard, setStandard] = useState<StandardItem | null>(null)
  const [loading, setLoading] = useState(false)
  /** 在线预览的附件 */
  const [previewTarget, setPreviewTarget] = useState<StandardAttachment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStandard(await fetchPortalStandard(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '标准规范加载失败', 'error')
      setStandard(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  if (!standard) {
    return (
      <>
        <PageHeader breadcrumb={['产品碳足迹', '知识中心', '标准规范']} title="标准规范详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '标准规范不存在或已被平台下架'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '知识中心', '标准规范', standard.nameZh]}
        title={standard.code}
        description={standard.nameZh}
        actions={<Button onClick={() => navigate('/knowledge/standard')}>返回列表</Button>}
      />

      <div className="kstd-detail">
        {/* 头部卡片：标准名称 + 标准号 + 状态 / 分类 / 日期标签 */}
        <Card className="kstd-hero" bordered>
          <div className="kstd-hero-icon">
            <FileIcon size="30px" />
          </div>
          <div className="kstd-hero-main">
            <div className="kstd-hero-name">{standard.nameZh}</div>
            <div className="kstd-hero-sub">
              <span className="kstd-hero-code">{standard.code}</span>
              <Tag theme={STATUS_THEME[standardStatusTone(standard.status)]}>{standard.status || '-'}</Tag>
              <Tag variant="outline">{standard.category || '未分类'}</Tag>
            </div>
          </div>
          <div className="kstd-hero-dates">
            <div className="kstd-hero-date">
              <span className="kstd-hero-date-label">发布日期</span>
              <span>{standard.publishDate || '-'}</span>
            </div>
            <div className="kstd-hero-date">
              <span className="kstd-hero-date-label">实施日期</span>
              <span>{standard.implementDate || '-'}</span>
            </div>
          </div>
        </Card>

        {/* 基本信息：两列带边框描述表 */}
        <Card title="基本信息" bordered header-bordered>
          <Descriptions column={2} bordered size="medium">
            <Descriptions.DescriptionsItem label="中文标准名称" span={2}>
              {standard.nameZh}
            </Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="英文标准名称" span={2}>
              {standard.nameEn || '-'}
            </Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="标准号">
              <span className="kstd-mono">{standard.code}</span>
            </Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="标准分类">
              {standard.category || '-'}
            </Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="发布单位" span={2}>
              {standard.publisher}
            </Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="主管部门">
              {standard.competentDept || '-'}
            </Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="归口部门">
              {standard.responsibleDept || '-'}
            </Descriptions.DescriptionsItem>
          </Descriptions>
        </Card>

        {/* 标准查阅：来源链接 + 附件在线预览 */}
        <Card title="标准查阅" bordered header-bordered>
          {standard.sourceUrl && (
            <div className="kstd-source">
              <div className="kstd-source-info">
                <span className="kstd-source-label">来源链接</span>
                <span className="kstd-source-url">{standard.sourceUrl}</span>
              </div>
              <Button
                variant="outline"
                size="small"
                icon={<LinkIcon size="14px" />}
                onClick={() => window.open(standard.sourceUrl, '_blank', 'noreferrer')}
              >
                打开原文
              </Button>
            </div>
          )}

          {standard.attachments.length > 0 ? (
            <div className="kstd-attach-list">
              {standard.attachments.map((att) => (
                <div className="kstd-attach-item" key={att.id}>
                  <span className="kstd-attach-icon">
                    <FileIcon size="18px" />
                  </span>
                  <span className="kstd-attach-name" title={att.name}>
                    {att.name}
                  </span>
                  <span className="kstd-attach-meta">
                    {attachmentSizeText(att.size)} · {att.uploadedAt}
                  </span>
                  <Button variant="text" size="small" icon={<BrowseIcon size="14px" />} onClick={() => setPreviewTarget(att)}>
                    在线预览
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="kstd-empty">
              {standard.sourceUrl ? '未上传附件，请通过上方来源链接查阅标准原文' : '暂无查阅方式，请联系平台管理员'}
            </div>
          )}

          <Alert
            theme="info"
            message="标准文本受版权保护：附件仅限企业内部查阅，不得作为对外交付物、不得对外传播（A3）。"
            style={{ marginTop: 16 }}
          />
        </Card>
      </div>

      <StandardAttachmentPreview
        open={!!previewTarget}
        attachment={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </>
  )
}

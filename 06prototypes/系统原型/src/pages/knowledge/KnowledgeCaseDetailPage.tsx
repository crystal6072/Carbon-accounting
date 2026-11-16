import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Tag } from 'tdesign-react'
import { BrowseIcon, ChartIcon, FileIcon, LinkIcon } from 'tdesign-icons-react'
import { PageHeader, useToast } from '@/shared/components'
import { fetchPortalCase } from '@/mock'
import type { CarbonCase } from '@/types'
import {
  CASE_STATUS_LABEL,
  CASE_TYPE_LABEL,
  CASE_TYPE_TAG_TONE,
  caseStatusTone,
  ownerText,
  ownerTone,
  reductionText,
} from '@/pages/caseLibrary/caseLibraryMeta'
import './KnowledgePage.css'

import type { TagTone } from '@/shared/components'

/** 共享 TagTone（primary/success/warning/error/default）映射到 TDesign Tag 主题 */
const TONE_THEME: Record<TagTone, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'primary',
  default: 'default',
}

/**
 * 知识中心 · 典型案例详情（业务端只读）。
 * 与后台「系统管理 → 碳核算知识库 → 典型案例库」同源（仅已发布），
 * 展示案例元信息、图文详情、附件报告与外部链接；不含新增 / 编辑 / 删除入口。
 */
export default function KnowledgeCaseDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [item, setItem] = useState<CarbonCase | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItem(await fetchPortalCase(id))
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

  if (!item) {
    return (
      <>
        <PageHeader breadcrumb={['产品碳足迹', '知识中心', '典型案例']} title="案例详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '案例不存在或尚未发布'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '知识中心', '典型案例', item.caseName]}
        title={item.caseName}
        description={`${CASE_TYPE_LABEL[item.caseType]} · ${item.industry}`}
        actions={<Button onClick={() => navigate('/knowledge/case')}>返回列表</Button>}
      />

      <div className="kstd-detail">
        {/* 头部卡片：图标 + 案例名称 + 标签 + 关键指标 */}
        <Card className="kstd-hero" bordered>
          <div className="kstd-hero-icon kcase-hero-icon">
            <ChartIcon size="30px" />
          </div>
          <div className="kstd-hero-main">
            <div className="kstd-hero-name">{item.caseName}</div>
            <div className="kstd-hero-sub">
              <span className="kstd-hero-code">{item.caseCode}</span>
              <Tag theme={TONE_THEME[CASE_TYPE_TAG_TONE[item.caseType]]}>{CASE_TYPE_LABEL[item.caseType]}</Tag>
              <Tag theme={TONE_THEME[ownerTone(item)]}>{ownerText(item)}</Tag>
              <Tag theme={TONE_THEME[caseStatusTone(item.status)]}>{CASE_STATUS_LABEL[item.status]}</Tag>
            </div>
          </div>
          <div className="kstd-hero-dates">
            <div className="kstd-hero-date">
              <span className="kstd-hero-date-label">所属行业</span>
              <span>{item.industry}</span>
            </div>
            <div className="kstd-hero-date">
              <span className="kstd-hero-date-label">年减排量</span>
              <span>{reductionText(item.reductionAmount)}</span>
            </div>
            <div className="kstd-hero-date">
              <span className="kstd-hero-date-label">发布时间</span>
              <span>{item.publishedAt?.slice(0, 10) || '-'}</span>
            </div>
          </div>
        </Card>

        {/* 案例详情：摘要 + 图文正文 */}
        <Card title="案例详情" bordered header-bordered>
          {item.subjectName && (
            <div className="kcase-subject">实施主体：{item.subjectName}</div>
          )}
          {item.summary && <div className="kcase-summary">{item.summary}</div>}
          {item.coverUrl && <img src={item.coverUrl} alt={item.caseName} className="kcase-detail-cover" />}
          <article className="rich-text" dangerouslySetInnerHTML={{ __html: item.content }} />
        </Card>

        {/* 查阅入口：附件报告 + 外部链接 */}
        {(item.attachmentUrl || item.linkUrl) && (
          <Card title="案例资料" bordered header-bordered>
            {item.attachmentUrl && (
              <div className="kstd-attach-list">
                <div className="kstd-attach-item">
                  <span className="kstd-attach-icon">
                    <FileIcon size="18px" />
                  </span>
                  <span className="kstd-attach-name" title={item.attachmentName || '案例报告.pdf'}>
                    {item.attachmentName || '案例报告.pdf'}
                  </span>
                  <Button
                    variant="text"
                    size="small"
                    icon={<BrowseIcon size="14px" />}
                    onClick={() => window.open(item.attachmentUrl, '_blank')}
                  >
                    在线预览
                  </Button>
                  <a className="kcase-download" href={item.attachmentUrl} download={item.attachmentName || '案例报告.pdf'}>
                    下载
                  </a>
                </div>
              </div>
            )}
            {item.linkUrl && (
              <div className="kstd-source kcase-source">
                <div className="kstd-source-info">
                  <span className="kstd-source-label">外部链接</span>
                  <span className="kstd-source-url">{item.linkUrl}</span>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  icon={<LinkIcon size="14px" />}
                  onClick={() => window.open(item.linkUrl, '_blank')}
                >
                  打开原文
                </Button>
              </div>
            )}
            <Alert
              theme="info"
              message="案例内容由平台运营统一维护发布，全员可见；企业业务端只读，不支持维护企业侧案例。"
              style={{ marginTop: 16 }}
            />
          </Card>
        )}
      </div>
    </>
  )
}

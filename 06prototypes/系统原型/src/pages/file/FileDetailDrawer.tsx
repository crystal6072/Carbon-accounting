import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchLibraryFile, fetchLibraryFileLogs } from '@/mock'
import type { LibraryFileItem, LibraryFileLogItem, LibraryFileVersion } from '@/types'
import { categoryText, categoryTone, formatSize } from './fileMeta'
import { downloadFile } from './fileUtils'
import './FileLibraryPage.css'

interface FileDetailDrawerProps {
  open: boolean
  fileId: string | null
  onClose: () => void
  /** 编辑后需要刷新列表时回调 */
  onChanged: () => void
  onEdit: (file: LibraryFileItem) => void
  onPreview: (file: LibraryFileItem, version: LibraryFileVersion) => void
}

/**
 * 文件详情抽屉：当前文件（可直接预览 / 下载）/ 基本信息 / 版本记录 / 操作日志。
 *
 * 「版本记录」即历次上传与替换留痕：每次上传生成一个新版本，旧版本保留可查、只读。
 */
export default function FileDetailDrawer({
  open,
  fileId,
  onClose,
  onChanged,
  onEdit,
  onPreview,
}: FileDetailDrawerProps) {
  const toast = useToast()
  const [item, setItem] = useState<LibraryFileItem | null>(null)
  const [logs, setLogs] = useState<LibraryFileLogItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!open || !fileId) return
    setLoading(true)
    try {
      const [detail, logList] = await Promise.all([fetchLibraryFile(fileId), fetchLibraryFileLogs(fileId)])
      setItem(detail)
      setLogs(logList)
    } catch (error) {
      toast(error instanceof Error ? error.message : '文件加载失败', 'error')
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [open, fileId, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const current = item?.versions.find((version) => version.versionNo === item.currentVersion) ?? null

  const handleDownload = (version: LibraryFileVersion | null) => {
    if (!version) return
    if (!version.url) {
      toast('演示数据未包含文件内容，可上传本地文件后预览与下载', 'error')
      return
    }
    downloadFile(version.url, version.fileName)
  }

  const handlePreview = (version: LibraryFileVersion | null) => {
    if (!item || !version) return
    if (!version.url) {
      toast('演示数据未包含文件内容，可上传本地文件后预览', 'error')
      return
    }
    onPreview(item, version)
  }

  const fileColumns: Column<LibraryFileVersion>[] = [
    {
      key: 'versionNo',
      title: '版本',
      width: 72,
      render: (row) => <span className="mono nowrap">V{row.versionNo}</span>,
    },
    {
      key: 'fileName',
      title: '文件名',
      render: (row) => (
        <span className="cell-ellipsis" title={row.fileName}>
          {row.fileName}
        </span>
      ),
    },
    { key: 'size', title: '大小', width: 90, render: (row) => <span className="nowrap">{formatSize(row.size)}</span> },
    {
      key: 'uploaded',
      title: '上传信息',
      width: 170,
      render: (row) => (
        <span className="nowrap">
          {row.uploadedBy} · {row.uploadedAt}
        </span>
      ),
    },
    {
      key: 'current',
      title: '状态',
      width: 80,
      render: (row) =>
        row.versionNo === item?.currentVersion ? <Tag tone="success">当前</Tag> : <Tag tone="default">历史</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 110,
      render: (row) => (
        <span className="row-actions">
          <button type="button" className="link" onClick={() => handlePreview(row)}>
            预览
          </button>
          <button type="button" className="link" onClick={() => handleDownload(row)}>
            下载
          </button>
        </span>
      ),
    },
  ]

  return createPortal(
    <div className="file-drawer-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="file-drawer" role="dialog" aria-modal="true">
        <div className="file-drawer-header">
          <div>
            <div className="file-drawer-title">{item?.name ?? '文件详情'}</div>
            <div className="file-drawer-sub">
              {item ? item.code : '加载中…'}
            </div>
          </div>
          <button className="file-drawer-close" type="button" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="file-drawer-body">
          {loading && !item && <div className="file-empty">加载中…</div>}
          {!loading && !item && <div className="file-empty">文件不存在或已被删除</div>}

          {item && (
            <>
              <section className="file-section">
                <div className="file-section-head">
                  <span className="file-section-title">当前文件</span>
                </div>
                {current ? (
                  <div className="file-view-card">
                    <span className="file-ext-badge">{current.ext || '—'}</span>
                    <div className="file-view-card-main">
                      <div className="file-view-card-name" title={current.fileName}>
                        {current.fileName}
                      </div>
                      <div className="file-view-card-meta">
                        {formatSize(current.size)} · {current.uploadedBy} 上传于 {current.uploadedAt}
                      </div>
                    </div>
                    <div className="file-view-card-actions">
                      <Button size="small" onClick={() => handlePreview(current)}>
                        预览
                      </Button>
                      <Button size="small" onClick={() => handleDownload(current)}>
                        下载
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="file-empty">暂无文件</div>
                )}
              </section>

              <section className="file-section">
                <div className="file-section-head">
                  <span className="file-section-title">基本信息</span>
                </div>
                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-label">文件编码</span>
                    <span className="detail-value mono">{item.code}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">文件分类</span>
                    <span className="detail-value">
                      <Tag tone={categoryTone[item.category]}>{categoryText[item.category]}</Tag>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">文件大小</span>
                    <span className="detail-value">{formatSize(current?.size ?? 0)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">归属部门</span>
                    <span className="detail-value">{item.dept}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">创建信息</span>
                    <span className="detail-value">
                      {item.createdBy} · {item.createdAt}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">最近更新</span>
                    <span className="detail-value">
                      {item.updatedBy} · {item.updatedAt}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">文件说明</span>
                    <span className="detail-value">{item.description || '—'}</span>
                  </div>
                </div>
              </section>

              <section className="file-section">
                <div className="file-section-head">
                  <span className="file-section-title">
                    版本记录
                    <span className="file-section-count">共 {item.versions.length} 个版本</span>
                  </span>
                  <Button size="small" onClick={() => { onEdit(item); onChanged() }}>
                    上传新版本
                  </Button>
                </div>
                <div className="file-section-hint">每次上传生成一个新版本，历史版本保留可查、只读</div>
                <div className="file-table-wrap">
                  <Table
                    columns={fileColumns}
                    data={[...item.versions].sort((a, b) => b.versionNo - a.versionNo)}
                    rowKey={(row) => row.id}
                    emptyText="暂无版本记录"
                  />
                </div>
              </section>

              <section className="file-section">
                <div className="file-section-head">
                  <span className="file-section-title">操作日志</span>
                </div>
                {logs.length === 0 ? (
                  <div className="file-empty">暂无操作记录</div>
                ) : (
                  <ul className="file-log-list">
                    {logs.map((log) => (
                      <li className="file-log-item" key={log.id}>
                        <span className="file-log-time">{log.at}</span>
                        <span className="file-log-action">{log.action}</span>
                        <span>{log.operator}</span>
                        <span>{log.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        <div className="file-drawer-footer">
          <Button onClick={onClose}>关闭</Button>
          <Button
            variant="primary"
            disabled={!item}
            onClick={() => {
              if (!item) return
              onEdit(item)
              onChanged()
            }}
          >
            编辑
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

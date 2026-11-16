import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, PageHeader, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { useAuth } from '@/context/AuthContext'
import { deleteLibraryFile, fetchLibraryFiles } from '@/mock'
import type { LibraryFileCategory, LibraryFileItem, LibraryFileVersion } from '@/types'
import { categoryOrder, categoryText, categoryTone, formatSize } from './fileMeta'
import FileConfirmModal from './FileConfirmModal'
import FileDetailDrawer from './FileDetailDrawer'
import FileEditModal from './FileEditModal'
import FilePreviewModal from './FilePreviewModal'
import FileUploadModal from './FileUploadModal'
import './FileLibraryPage.css'

const PAGE_SIZE = 20

type NavKey = 'all' | 'mine' | 'recent' | LibraryFileCategory

interface QueryState {
  keyword: string
}

const EMPTY_QUERY: QueryState = {
  keyword: '',
}

/**
 * 文件管理 · 文件库（企业用户端 · 租户级文件资产）
 *
 * 口径（《文件管理业务 PRD》V0.3 / 《文件库字段清单》V0.3）：
 * - 一条记录 = 一个文件；替换后旧文件转入「文件记录」保留可查；
 * - 被有效引用的文件不可删除（删除确认弹窗会拦截并提示）；
 * - 不提供存储用量入口，配额仅在上传时静默校验。
 */
export default function FileLibraryPage() {
  const toast = useToast()
  const { session } = useAuth()
  const currentUser = session?.displayName ?? '李竹'

  const [list, setList] = useState<LibraryFileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [nav, setNav] = useState<NavKey>('all')
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LibraryFileItem | null>(null)
  const [confirm, setConfirm] = useState<{ file: LibraryFileItem } | null>(null)
  const [preview, setPreview] = useState<{ file: LibraryFileItem; version: LibraryFileVersion } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchLibraryFiles())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 企业端不做行级数据权限：持有「文件库 · 查看」即可见全部文件 */
  const scoped = list

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {}
    scoped.forEach((item) => {
      byCategory[item.category] = (byCategory[item.category] ?? 0) + 1
    })
    return {
      all: scoped.length,
      mine: scoped.filter((item) => item.createdBy === currentUser).length,
      recent: scoped.filter((item) => !!item.lastUsedAt).length,
      byCategory,
    }
  }, [scoped, currentUser])

  const rows = useMemo(() => {
    let data = scoped
    if (nav === 'mine') data = data.filter((item) => item.createdBy === currentUser)
    else if (nav === 'recent') data = data.filter((item) => !!item.lastUsedAt)
    else if (nav !== 'all') data = data.filter((item) => item.category === nav)

    const keyword = query.keyword.trim().toLowerCase()
    if (keyword) {
      data = data.filter((item) => item.name.toLowerCase().includes(keyword))
    }

    if (nav === 'recent') {
      data = [...data].sort((a, b) => ((a.lastUsedAt ?? '') < (b.lastUsedAt ?? '') ? 1 : -1))
    }
    return data
  }, [scoped, nav, query, currentUser])

  useEffect(() => {
    setPage(1)
  }, [nav, query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleConfirm = async () => {
    if (!confirm) return
    try {
      await deleteLibraryFile(confirm.file.id, currentUser)
      toast('文件已删除（含全部文件记录）')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleUploadSaved = async () => {
    setUploadOpen(false)
    await load()
  }

  const handleEditSaved = async () => {
    setEditTarget(null)
    await load()
  }

  const navItems = useMemo(
    () => [
      { key: 'all' as NavKey, label: '全部文件', count: counts.all },
      { key: 'mine' as NavKey, label: '我的上传', count: counts.mine },
      { key: 'recent' as NavKey, label: '最近使用', count: counts.recent },
    ],
    [counts],
  )

  const columns: Column<LibraryFileItem>[] = [
    {
      key: 'name',
      title: '文件名称',
      width: 220,
      render: (row) => {
        const current = row.versions.find((v) => v.versionNo === row.currentVersion)
        return (
          <div className="file-name-cell">
            <span className="file-ext-badge">{current?.ext || '—'}</span>
            <button className="link file-name-text" title={row.name} onClick={() => setDrawerId(row.id)}>
              {row.name}
            </button>
          </div>
        )
      },
    },
    {
      key: 'code',
      title: '文件编码',
      width: 120,
      render: (row) => <span className="mono nowrap">{row.code}</span>,
    },
    {
      key: 'version',
      title: '当前版本',
      width: 110,
      render: (row) => (
        <div className="file-version-cell">
          <span className="file-version-tag">V{row.currentVersion}</span>
          <span className="file-version-count">共 {row.versions.length} 版</span>
        </div>
      ),
    },
    {
      key: 'category',
      title: '文件分类',
      width: 104,
      render: (row) => <Tag tone={categoryTone[row.category]}>{categoryText[row.category]}</Tag>,
    },
    {
      key: 'size',
      title: '文件大小',
      width: 96,
      render: (row) => {
        const current = row.versions.find((v) => v.versionNo === row.currentVersion)
        return <span className="nowrap">{formatSize(current?.size ?? 0)}</span>
      },
    },
    {
      key: 'uploader',
      title: '上传人',
      width: 88,
      render: (row) => {
        const current = row.versions.find((v) => v.versionNo === row.currentVersion)
        return <span className="nowrap">{current?.uploadedBy ?? '—'}</span>
      },
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 140,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 130,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => setDrawerId(row.id)}>
            查看
          </button>
          <button className="link" onClick={() => setEditTarget(row)}>
            编辑
          </button>
          <button className="link link-danger" onClick={() => setConfirm({ file: row })}>
            删除
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '文件管理', '文件库']}
        title="文件库"
        actions={
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            新增
          </Button>
        }
      />

      <div className="file-layout">
        <aside className="card file-side">
          <div className="file-side-group">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={['file-nav-item', nav === item.key ? 'active' : ''].filter(Boolean).join(' ')}
                onClick={() => setNav(item.key)}
              >
                <span>{item.label}</span>
                <span className="file-nav-count">{item.count}</span>
              </button>
            ))}
          </div>
          <div className="file-side-group">
            <div className="file-side-title">文件分类</div>
            {categoryOrder.map((category) => (
              <button
                key={category}
                type="button"
                className={['file-nav-item', nav === category ? 'active' : ''].filter(Boolean).join(' ')}
                onClick={() => setNav(category)}
              >
                <span>{categoryText[category]}</span>
                <span className="file-nav-count">{counts.byCategory[category] ?? 0}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="card file-main">
          <div className="query-bar">
            <div className="query-item">
              <span className="query-label">文件名称</span>
              <Input
                value={query.keyword}
                placeholder="输入文件名称搜索"
                onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
              />
            </div>
            <div className="query-actions">
              <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
              <Button variant="primary" onClick={() => toast('查询完成')}>
                搜索
              </Button>
            </div>
          </div>

          <div className="toolbar">
            <div className="flex gap-sm">
              <span className="toolbar-title">文件列表</span>
              <span className="toolbar-tip">共 {rows.length} 条</span>
            </div>
          </div>

          <div className="material-table-wrap">
            <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} emptyText="暂无文件：点击右上角「新增」上传" />
          </div>

          <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      </div>

      <FileDetailDrawer
        open={!!drawerId}
        fileId={drawerId}
        onClose={() => setDrawerId(null)}
        onChanged={load}
        onEdit={(file) => {
          setDrawerId(null)
          setEditTarget(file)
        }}
        onPreview={(file, version) => setPreview({ file, version })}
      />

      <FileUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={handleUploadSaved} />

      <FileEditModal
        open={!!editTarget}
        file={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={handleEditSaved}
        onPreview={(file, version) => setPreview({ file, version })}
      />

      <FileConfirmModal
        open={!!confirm}
        file={confirm?.file ?? null}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />

      <FilePreviewModal
        open={!!preview}
        file={preview?.file ?? null}
        version={preview?.version ?? null}
        onClose={() => setPreview(null)}
      />
    </>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Icon, Input, PageHeader, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  buildFeatureMap,
  PLATFORM_DESC,
  PLATFORM_LABEL,
  PLATFORM_ORDER,
  type FeatureItem,
  type MenuPlatform,
} from '@/router/menu'
import './PanoramaPage.css'

/** 端筛选口径：全部 + 三个端 */
const PLATFORM_FILTERS: Array<{ value: MenuPlatform | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  ...PLATFORM_ORDER.map((platform) => ({ value: platform, label: PLATFORM_LABEL[platform] })),
]

/** 端图标的兜底映射（各端一个代表性图标） */
const PLATFORM_ICON: Record<MenuPlatform, 'layers' | 'settings' | 'user'> = {
  enterprise: 'layers',
  platform: 'settings',
  tenant: 'user',
}

/**
 * 功能全景（原型评审入口）：
 * - 一屏集中展示三个端的全部功能，标明每个功能「属于哪个端」；
 * - 支持按端筛选 + 关键词搜索（功能名 / 说明 / 路由 / 所属模块）；
 * - 每行可一键跳转对应原型页面，方便边看边改。
 * 数据源与侧栏 / 顶栏共用 router/menu.ts，端归属一处维护、处处一致。
 */
export default function PanoramaPage() {
  const features = useMemo(() => buildFeatureMap(), [])
  const [platform, setPlatform] = useState<MenuPlatform | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  /** 各端功能总数（图例与筛选计数用） */
  const countOf = useMemo(() => {
    const counter = new Map<MenuPlatform, number>()
    features.forEach((item) => counter.set(item.platform, (counter.get(item.platform) ?? 0) + 1))
    return counter
  }, [features])

  /** 按端 + 关键词过滤后的功能清单（保持菜单定义的顺序） */
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return features.filter((item) => {
      if (platform !== 'all' && item.platform !== platform) return false
      if (!kw) return true
      return [item.label, item.desc, item.route, item.group, item.module]
        .join(' ')
        .toLowerCase()
        .includes(kw)
    })
  }, [features, platform, keyword])

  /** 按端分组的展示数据：只渲染有内容的端 */
  const sections = useMemo(
    () =>
      PLATFORM_ORDER.filter((p) => filtered.some((item) => item.platform === p)).map((p) => ({
        platform: p,
        items: filtered.filter((item) => item.platform === p),
      })),
    [filtered],
  )

  const columns: Column<FeatureItem>[] = [
    {
      key: 'module',
      title: '所属模块',
      width: 220,
      render: (row) => (
        <span className="pano-module">
          {row.group}
          {row.module && <em className="pano-module-sub">{row.module}</em>}
        </span>
      ),
    },
    { key: 'label', title: '功能', width: 150 },
    { key: 'desc', title: '功能说明' },
    {
      key: 'route',
      title: '路由',
      width: 220,
      render: (row) => <span className="pano-route">{row.route}</span>,
    },
    {
      key: 'action',
      title: '操作',
      width: 88,
      align: 'center',
      render: (row) => (
        <Link className="pano-enter" to={row.route}>
          进入
          <Icon name="chevronRight" size={12} />
        </Link>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['功能全景']}
        title="功能全景"
        description="集中展示全部端的功能清单与归属，方便一屏评审与设计修改；点击「进入」跳转对应原型页面。"
      />

      {/* 端说明图例：三个端是什么、各有多少功能 */}
      <div className="pano-legend">
        {PLATFORM_ORDER.map((p) => (
          <div className="pano-legend-card" key={p}>
            <div className="pano-legend-head">
              <span className="pano-legend-icon">
                <Icon name={PLATFORM_ICON[p]} size={16} />
              </span>
              <span className="pano-legend-name">{PLATFORM_LABEL[p]}</span>
              <span className="pano-legend-count">{countOf.get(p) ?? 0} 项功能</span>
            </div>
            <div className="pano-legend-desc">{PLATFORM_DESC[p]}</div>
          </div>
        ))}
      </div>

      {/* 工具栏：按端筛选 + 关键词搜索 */}
      <div className="pano-toolbar">
        <div className="pano-chips">
          {PLATFORM_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`pano-chip${platform === filter.value ? ' is-active' : ''}`}
              onClick={() => setPlatform(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="pano-search">
          <Icon name="search" size={14} />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索功能 / 说明 / 路由"
          />
        </div>
      </div>

      {/* 按端分组的功能清单 */}
      {sections.length === 0 ? (
        <Card>
          <div className="pano-empty">没有匹配的功能，试试调整筛选条件或关键词</div>
        </Card>
      ) : (
        sections.map((section) => (
          <Card
            key={section.platform}
            className="pano-card"
            title={
              <span className="pano-card-title">
                <span className="pano-legend-icon">
                  <Icon name={PLATFORM_ICON[section.platform]} size={14} />
                </span>
                {PLATFORM_LABEL[section.platform]}
                <span className="pano-card-count">{section.items.length} 项</span>
              </span>
            }
          >
            <Table
              columns={columns}
              data={section.items}
              rowKey={(row) => row.route}
              emptyText="暂无功能"
            />
          </Card>
        ))
      )}
    </>
  )
}

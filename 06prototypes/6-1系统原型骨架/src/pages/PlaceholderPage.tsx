import { Card, PageHeader } from '@/shared/components'

interface PlaceholderPageProps {
  title: string
  breadcrumb: string[]
}

/** 骨架占位页：仅承载路由与面包屑，后续按各模块 PRD 逐步替换为真实页面。 */
export default function PlaceholderPage({ title, breadcrumb }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader breadcrumb={breadcrumb} title={title} />
      <Card>
        <div className="empty">
          <div style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{title}</div>
          <div>页面骨架占位 · 待按《{title}》PRD 实现</div>
        </div>
      </Card>
    </>
  )
}

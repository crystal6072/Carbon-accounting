import { Link } from 'react-router-dom'
import { Card, PageHeader } from '@/shared/components'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader breadcrumb={['系统']} title="页面不存在" />
      <Card>
        <div className="empty">
          <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--color-text-placeholder)' }}>404</div>
          <div style={{ marginTop: 8 }}>
            未找到该页面，<Link to="/dashboard">返回工作台</Link>
          </div>
        </div>
      </Card>
    </>
  )
}

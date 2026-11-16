import { Button, Card, PageHeader } from '@/shared/components'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader breadcrumb={['系统']} title="页面不存在" />
      <Card>
        <div className="empty">
          <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--color-text-placeholder)' }}>404</div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              返回工作台
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}

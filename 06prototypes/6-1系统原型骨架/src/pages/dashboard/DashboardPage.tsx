import { Link } from 'react-router-dom'
import { Button, Card, PageHeader, Tag } from '@/shared/components'
import './DashboardPage.css'

const STATS = [
  { value: '12', label: '进行中的核算项目' },
  { value: '48', label: '产品档案数' },
  { value: '326', label: '排放因子数' },
  { value: '9', label: '待核验活动数据' },
]

const TODOS = [
  { title: '产品品类数据待完善', desc: '2 个一级品类无下级品类', path: '/basic/category', tag: '基础库' },
  { title: '核算模型待启用', desc: '木材加工核算模型缺「默认公式」，暂不可启用', path: '/model/list', tag: '核算模型' },
  { title: '活动数据待核验', desc: '生产阶段 9 条数据待确认', path: '/pcf/project', tag: '核算项目' },
]

/** 工作台：概览统计 + 待办事项 + 快捷入口（骨架级实现） */
export default function DashboardPage() {
  return (
    <>
      <PageHeader breadcrumb={['工作台']} title="工作台" description="核算进度、待办事项与快捷入口" />

      <div className="dash-banner">
        <div>
          <div className="dash-banner-title">欢迎回来，系统管理员</div>
          <div className="dash-banner-desc">本期聚焦「产品碳足迹核算」主链，核算气体口径为 CO₂。</div>
        </div>
        <Link to="/pcf/project">
          <Button variant="primary">进入核算项目</Button>
        </Link>
      </div>

      <div className="dash-stats">
        {STATS.map((item) => (
          <div className="stat-card" key={item.label}>
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <Card title="待办事项">
        {TODOS.map((item) => (
          <div className="todo-item" key={item.title}>
            <div className="todo-main">
              <Tag tone="info">{item.tag}</Tag>
              <div>
                <div className="todo-title">{item.title}</div>
                <div className="todo-desc">{item.desc}</div>
              </div>
            </div>
            <Link to={item.path}>
              <Button size="small">去完成</Button>
            </Link>
          </div>
        ))}
      </Card>
    </>
  )
}

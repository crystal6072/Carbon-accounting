import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'
import { AnnotationProvider } from '@/annotations/AnnotationContext'
import AnnotationLayer from '@/annotations/AnnotationLayer'
import './BasicLayout.css'

/** 基础布局：顶栏 Header + 左侧 Sidebar + 右侧 Content（外层挂载批注展示层，仅覆盖展示、不触碰业务逻辑） */
export default function BasicLayout() {
  return (
    <AnnotationProvider>
      <div className="app-shell">
        <AppHeader />
        <div className="app-body">
          <AppSidebar />
          <main className="app-content">
            <div className="app-content-inner">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <AnnotationLayer />
    </AnnotationProvider>
  )
}

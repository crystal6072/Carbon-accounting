import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from '@/shared/components'
import 'tdesign-react/es/style/index.css'
import '@/shared/styles/design-tokens.css'
import '@/shared/styles/global.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[App crashed]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#c00', lineHeight: 1.6 }}>
          <h2>运行时错误（原型捕获）</h2>
          <div>{this.state.error.message}</div>
          <hr />
          <div>{this.state.error.stack}</div>
        </div>
      )
    }
    return this.props.children
  }
}

function showFatal(message: string) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<pre style="padding:24px;color:#c00;white-space:pre-wrap;font-family:monospace;line-height:1.6">运行时错误（原型捕获）：\n${message}</pre>`
  }
}
window.addEventListener('error', (e) => {
  showFatal(`${e.message}\n${(e.error as Error)?.stack ?? ''}`)
})
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason as Error
  showFatal(`未处理的 Promise 拒绝：${r?.message ?? e.reason}\n${r?.stack ?? ''}`)
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)

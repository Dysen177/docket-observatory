import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const savedTheme = localStorage.getItem('guo-intel-theme') === 'light' ? 'light' : 'dark'
document.documentElement.dataset.theme = savedTheme
document.documentElement.style.colorScheme = savedTheme

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Docket Observatory renderer failed.', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const english = localStorage.getItem('guo-intel-language') === 'en'
    return (
      <main className="fatal-error-screen" role="alert">
        <strong>{english ? 'The workspace could not be rendered' : '工作区无法正常显示'}</strong>
        <p>{english ? 'Reload the local application. Your court files and private cache are not changed by this error.' : '请重新加载本地程序。此错误不会修改法院文件或私有缓存。'}</p>
        <code>{this.state.error.message}</code>
        <button type="button" onClick={() => window.location.reload()}>{english ? 'Reload' : '重新加载'}</button>
      </main>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

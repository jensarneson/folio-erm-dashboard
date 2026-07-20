import { Component, type ReactNode, type ErrorInfo } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

function ErrorFallback({ error }: { error: Error | null }) {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.message}>
          An unexpected error occurred. You can try reloading the page or signing in again.
        </p>
        {error && (
          <details className={styles.details}>
            <summary className={styles.summary}>Error details</summary>
            <pre className={styles.pre}>{error.message}</pre>
          </details>
        )}
        <div className={styles.actions}>
          <button className={styles.reloadButton} onClick={() => window.location.reload()}>
            Reload page
          </button>
          <button className={styles.loginButton} onClick={() => navigate('/login', { replace: true })}>
            Sign in again
          </button>
        </div>
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} />
      )
    }

    return this.props.children
  }
}

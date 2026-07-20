import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, setOkapiConfig } from '../lib/okapi'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Use proxy in dev, direct URL in production
  const okapiUrl = import.meta.env.DEV ? '/okapi' : 'https://api-eku.folio.ebsco.com'
  const tenant = 'fs00001224'

  // Load saved credentials from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('folio-credentials')
    if (saved) {
      try {
        const creds = JSON.parse(saved)
        setUsername(creds.username || '')
        setPassword(creds.password || '')
      } catch {
        // ignore
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const trimmedUrl = okapiUrl.replace(/\/$/, '')
      await setOkapiConfig({
        okapiUrl: trimmedUrl,
        tenant: tenant.trim(),
        username: username.trim(),
      })

      await login({
        okapiUrl: trimmedUrl,
        tenant: tenant.trim(),
        username: username.trim(),
        password: password.trim(),
      })

      // Save non-sensitive config for next login — no password persisted
      localStorage.setItem(
        'folio-credentials',
        JSON.stringify({
          username: username.trim(),
          okapiUrl: trimmedUrl,
          tenant: tenant.trim(),
        })
      )
      console.log('[Login] Logged in to', trimmedUrl, '/', tenant)

      navigate('/')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>FOLIO ERM Dashboard</h1>
        <p style={styles.subtitle}>EKU Libraries</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              style={styles.input}
              placeholder="your.username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
    padding: '1rem',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-accent)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
  },
  input: {
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  error: {
    background: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '0.625rem 0.75rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
  },
  button: {
    padding: '0.75rem',
    background: 'var(--color-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
}

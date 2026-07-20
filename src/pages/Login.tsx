import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, setOkapiConfig } from '../lib/okapi'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const okapiUrl = import.meta.env.DEV ? '/okapi' : 'https://api-eku.folio.ebsco.com'
  const tenant = 'fs00001224'

  // Load saved username from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('folio-credentials')
    if (saved) {
      try {
        const creds = JSON.parse(saved)
        setUsername(creds.username || '')
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
        }),
      )
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>FOLIO ERM Dashboard</h1>
        <p className={styles.subtitle}>EKU Libraries</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              className={styles.input}
              placeholder="your.username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

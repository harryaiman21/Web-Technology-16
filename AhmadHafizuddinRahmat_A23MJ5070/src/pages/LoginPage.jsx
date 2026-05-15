import { useState } from 'react'
import { login } from '../api'
import './LoginPage.css'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) { setError('Enter username and password'); return }
    try {
      setLoading(true); setError('')
      const data = await login(username.trim(), password.trim())
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      // Use replace to avoid back-button going to login
      window.location.replace('/')
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-brand">
          <span className="login-icon">⬡</span>
          <div className="login-title">SOPify</div>
          <div className="login-sub">Sign in to continue</div>
        </div>

        <div className="login-form">
          <div className="field">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKey}
              placeholder="editor1 or reviewer1"
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="login-error">⚠ {error}</div>}

          <button className={'login-btn' + (loading ? ' loading' : '')} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </div>

        <div className="login-hint">
          <div>editor1 / editor123</div>
          <div>reviewer1 / reviewer123</div>
        </div>
      </div>
    </div>
  )
}
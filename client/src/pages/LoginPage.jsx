import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage({ onLogin, initialMode = 'login' }) {
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsSignup(initialMode === 'signup')
  }, [initialMode])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login'
      const body = isSignup 
        ? { username, password, email }
        : { username, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      if (isSignup) {
        // After signup, switch to login page
        setIsSignup(false)
        setPassword('')
        setEmail('')
        setError('Account created! Please log in.')
        navigate('/login')
      } else {
        // After login, store user and proceed
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0 }}>
      <div className="modal" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isSignup ? '🌸 Create Account' : '🌸 Welcome Back'}
          </h3>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Username</span>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </label>

          {isSignup && (
            <label className="field">
              <span className="field-label">Email (optional)</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </label>
          )}

          {error && (
            <div
              style={{
                color: error.includes('created') ? '#2e7d32' : '#d32f2f',
                padding: '12px',
                background: error.includes('created') ? '#e8f5e9' : '#ffebee',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '14px',
                border: '1px solid rgba(236, 151, 183, 0.35)'
              }}
            >
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Log In')}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setIsSignup(!isSignup)
                setError('')
              }}
            >
              {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

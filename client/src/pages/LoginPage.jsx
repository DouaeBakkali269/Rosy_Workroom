import { useState } from 'react'

export default function LoginPage({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Call parent callback
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section active">
      <div className="hero-centered">
        <div className="hero-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2 className="hero-card-title">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="field">
              <label className="field-label">Username</label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {isSignup && (
              <div className="field">
                <label className="field-label">Email (optional)</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
            )}

            {error && (
              <div style={{ 
                color: '#d32f2f', 
                padding: '10px', 
                background: '#ffebee', 
                borderRadius: '6px',
                marginBottom: '10px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn primary full" 
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Log In')}
            </button>

            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button
                type="button"
                className="btn ghost"
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
    </section>
  )
}

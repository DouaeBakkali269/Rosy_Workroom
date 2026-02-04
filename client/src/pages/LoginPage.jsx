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

      if (isSignup) {
        // After signup, switch to login page
        setIsSignup(false)
        setPassword('')
        setEmail('')
        setError('Account created! Please log in.')
      } else {
        // After login, store user and proceed
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '30px',
          textAlign: 'center',
          color: '#333'
        }}>
          {isSignup ? '🌸 Create Account' : '🌸 Welcome Back'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#555' }}>
              Username
            </label>
            <input
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #f0f0f0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#555' }}>
              Password
            </label>
            <input
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #f0f0f0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {isSignup && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#555' }}>
                Email (optional)
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #f0f0f0',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
          )}

          {error && (
            <div style={{ 
              color: error.includes('created') ? '#2e7d32' : '#d32f2f', 
              padding: '12px', 
              background: error.includes('created') ? '#e8f5e9' : '#ffebee', 
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              background: '#ff69b4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Log In')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#ff69b4',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
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

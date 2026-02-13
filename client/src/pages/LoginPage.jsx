import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function LoginPage({ onLogin, initialMode = 'login' }) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSuccessMessage, setIsSuccessMessage] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsSignup(initialMode === 'signup')
  }, [initialMode])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSuccessMessage(false)
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
        throw new Error(data.error || t('login.authFailed'))
      }

      if (isSignup) {
        // After signup, switch to login page
        setIsSignup(false)
        setPassword('')
        setEmail('')
        setError(t('login.accountCreated'))
        setIsSuccessMessage(true)
        navigate('/login')
      } else {
        // After login, store auth payload and proceed
        onLogin({
          user: data.user,
          token: data.token,
          tokenExpiresAt: data.tokenExpiresAt
        })
        navigate('/dashboard')
      }
    } catch (err) {
      setIsSuccessMessage(false)
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
            {isSignup ? `🌸 ${t('login.createTitle')}` : `🌸 ${t('login.welcomeTitle')}`}
          </h3>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">{t('login.username')}</span>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">{t('login.password')}</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              required
            />
          </label>

          {isSignup && (
            <label className="field">
              <span className="field-label">{t('login.emailOptional')}</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
              />
            </label>
          )}

          {error && (
            <div
              style={{
                color: isSuccessMessage ? '#2e7d32' : '#d32f2f',
                padding: '12px',
                background: isSuccessMessage ? '#e8f5e9' : '#ffebee',
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
              {loading ? t('login.pleaseWait') : (isSignup ? t('login.signUp') : t('login.logIn'))}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setIsSignup(!isSignup)
                setError('')
                setIsSuccessMessage(false)
              }}
            >
              {isSignup ? t('login.haveAccount') : t('login.noAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

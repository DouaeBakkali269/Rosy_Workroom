import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SweetFeedbackSection from '../components/SweetFeedbackSection'
import { useLanguage } from '../context/LanguageContext'

export default function LandingPage() {
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xykdznzb'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, language, setLanguage } = useLanguage()
  const [formData, setFormData] = useState({
    name: '',
    type: 'feature',
    message: ''
  })
  const [sent, setSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    const param = searchParams.get('lang')
    if (!param) return
    const normalized = param.toLowerCase()
    if (normalized.startsWith('fr')) setLanguage('French')
    if (normalized.startsWith('de')) setLanguage('German')
    if (normalized.startsWith('en')) setLanguage('English')
  }, [searchParams, setLanguage])

  function handleLanguageChange(next) {
    setLanguage(next)
    const nextParam = next === 'French' ? 'fr' : next === 'German' ? 'de' : 'en'
    const updated = new URLSearchParams(searchParams)
    updated.set('lang', nextParam)
    setSearchParams(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.message.trim() || isSending) return

    setIsSending(true)
    setSendError('')
    setSent(false)

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim() || 'Anonymous',
          type: formData.type,
          message: formData.message.trim()
        })
      })

      if (!response.ok) {
        throw new Error(`Formspree request failed (${response.status})`)
      }

      setSent(true)
      setFormData({ name: '', type: 'feature', message: '' })
    } catch (error) {
      console.error('Feedback send failed:', error)
      setSendError('Could not send feedback right now. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="landing-page-container">
      {/* Header */}
      <header className="landing-header">
        <h2 className="landing-logo">{t('landing.heroTitle')}</h2>
        <div className="landing-header-buttons">
          <select
            className="input"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            aria-label={t('profile.language')}
          >
            <option value="English">{t('profile.langEnglish')}</option>
            <option value="French">{t('profile.langFrench')}</option>
            <option value="German">{t('profile.langGerman')}</option>
          </select>
          <button className="btn ghost" onClick={() => navigate('/login')}>{t('landing.headerLogin')}</button>
          <button className="btn primary" onClick={() => navigate('/signup')}>{t('landing.headerGetStarted')}</button>
        </div>
      </header>

      <section className="page-section active landing-main-section">
        <div className="home-hero">
          <div className="home-hero-panel landing-hero-panel">
            <div className="landing-hero-text">
              <h1 className="home-title">{t('landing.heroTitle')}</h1>
              <p className="home-subtitle">{t('landing.heroSubtitle')}</p>
              <p className="home-description">{t('landing.heroDescription')}</p>

              <div className="hero-actions">
                <div className="hero-actions-row hero-actions-row-1">
                  <button className="btn primary hero-btn" onClick={() => navigate('/signup')}>{t('landing.heroGetStarted')}</button>
                  <button className="btn ghost hero-btn" onClick={() => navigate('/login')}>{t('landing.heroLogin')}</button>
                </div>
              </div>
            </div>
            <div className="landing-image-container">
              <img className="home-decoration" src="/2.png" alt={t('landing.heroAlt')} />
            </div>
          </div>
        </div>

        <div className="project-grid landing-project-grid">
          <div className="project-card">
            <div className="project-title">{t('landing.projectProjectsTitle')}</div>
            <p className="project-desc">{t('landing.projectProjectsDesc')}</p>
            <p onClick={() => navigate('/projects')} className="project-card-link">
              {t('landing.projectProjectsLink')} →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">{t('landing.projectKanbanTitle')}</div>
            <p className="project-desc">{t('landing.projectKanbanDesc')}</p>
            <p onClick={() => navigate('/projects')} className="project-card-link">
              {t('landing.projectKanbanLink')} →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">{t('landing.projectBudgetTitle')}</div>
            <p className="project-desc">{t('landing.projectBudgetDesc')}</p>
            <p onClick={() => navigate('/money')} className="project-card-link">
              {t('landing.projectBudgetLink')} →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">{t('landing.projectNotesTitle')}</div>
            <p className="project-desc">{t('landing.projectNotesDesc')}</p>
            <p onClick={() => navigate('/notes')} className="project-card-link">
              {t('landing.projectNotesLink')} →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">{t('landing.projectVisionTitle')}</div>
            <p className="project-desc">{t('landing.projectVisionDesc')}</p>
            <p onClick={() => navigate('/vision')} className="project-card-link">
              {t('landing.projectVisionLink')} →
            </p>
          </div>

          <div className="project-card">
            <div className="project-title">{t('landing.projectWeekTitle')}</div>
            <p className="project-desc">{t('landing.projectWeekDesc')}</p>
            <p onClick={() => navigate('/week-planner')} className="project-card-link">
              {t('landing.projectWeekLink')} →
            </p>
          </div>
        </div>

        <section className="landing-reviews">
          <div className="landing-reviews-header">
            <div>
              <h2 className="landing-section-title">{t('landing.reviewsTitle')} 💗</h2>
              <p className="landing-section-subtitle">{t('landing.reviewsSubtitle')}</p>
            </div>
            <div className="landing-badge">★★★★★ {t('landing.reviewsBadge')}</div>
          </div>

          <div className="landing-reviews-grid">
            {[
              {
                quote: t('landing.review1Quote'),
                name: 'Maya',
                tag: t('landing.review1Tag')
              },
              {
                quote: t('landing.review2Quote'),
                name: 'Lina',
                tag: t('landing.review2Tag')
              },
              {
                quote: t('landing.review3Quote'),
                name: 'Sofia',
                tag: t('landing.review3Tag')
              }
            ].map((review, idx) => (
              <div key={idx} className="review-card">
                <p className="review-quote">“{review.quote}”</p>
                <div className="review-meta">
                  <span className="review-name">{review.name}</span>
                  <span className="review-tag">{review.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <SweetFeedbackSection
          formData={formData}
          setFormData={setFormData}
          sent={sent}
          isSending={isSending}
          sendError={sendError}
          handleSubmit={handleSubmit}
        />
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="landing-footer-text">{t('landing.footerMade')}</p>
        <p className="landing-footer-text">© Rosy Workroom. {t('landing.footerRights')}</p>
      </footer>
    </div>
  )
}

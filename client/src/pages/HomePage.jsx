import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const handleNavigate = (path) => {
    navigate(path)
  }

  return (
    <section className="page-section active" id="home">
      <div className="home-hero">
        <div className="home-hero-panel">
          <img className="home-decoration" src="/2.png" alt={t('landing.heroAlt')} />
          <h1 className="home-title">{t('home.title')}</h1>
          <p className="home-subtitle">{t('home.subtitle')}</p>
          <p className="home-description">{t('home.description')}</p>
          <div className="hero-actions">
            <div className="hero-actions-row hero-actions-row-1">
              <button className="btn primary hero-btn" onClick={() => handleNavigate('/projects')}>{t('home.planProjects')}</button>
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('/week-planner')}>{t('home.planWeek')}</button>
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('/money')}>{t('home.trackMoney')}</button>
            </div>
            <div className="hero-actions-row hero-actions-row-2">
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('/vision')}>{t('home.addGoals')}</button>
              <button className="btn ghost hero-btn" onClick={() => handleNavigate('/notes')}>{t('home.takeNotes')}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

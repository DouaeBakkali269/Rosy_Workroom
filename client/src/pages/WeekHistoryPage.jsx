import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWeekPlanHistory } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

const isWeekKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)

function formatWeekRange(weekKey, locale) {
  if (!weekKey || !isWeekKey(weekKey)) return weekKey || ''
  const [year, month, day] = weekKey.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const startLabel = start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

function formatWeekStamp(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default function WeekHistoryPage() {
  const { t, langKey } = useLanguage()
  const [weeks, setWeeks] = useState([])
  const [currentWeekKey, setCurrentWeekKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const localeByLang = { en: 'en-US', fr: 'fr-FR', de: 'de-DE' }
  const locale = localeByLang[langKey] || 'en-US'

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    setIsLoading(true)
    try {
      const data = await getWeekPlanHistory()
      setWeeks(Array.isArray(data?.weeks) ? data.weeks : [])
      setCurrentWeekKey(data?.currentWeekKey || '')
    } catch (error) {
      console.error('Failed to load week history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function openWeek(weekKey) {
    if (!weekKey) return
    if (weekKey === currentWeekKey) {
      navigate('/week-planner')
      return
    }
    navigate(`/week-planner?week=${encodeURIComponent(weekKey)}`)
  }

  return (
    <section className="page-section active">
      <div className="section-header week-planner-header">
        <div>
          <h2>{t('history.title')}</h2>
          <p className="week-range">{t('history.subtitle')}</p>
        </div>
        <button className="btn ghost" onClick={() => navigate('/week-planner')}>{t('history.backToPlanner')}</button>
      </div>

      <div className="week-history-page">
        {isLoading ? (
          <p className="week-loading">{t('history.loading')}</p>
        ) : weeks.length === 0 ? (
          <div className="history-empty-state">
            <p>{t('week.noPastWeeks')}</p>
          </div>
        ) : (
          <div className="history-list history-list-full">
            {weeks.map(week => (
              <button
                key={week.week_key}
                className={`history-item ${week.week_key === currentWeekKey ? 'active' : ''}`}
                onClick={() => openWeek(week.week_key)}
              >
                <span className="history-range">{formatWeekRange(week.week_key, locale)}</span>
                {week.week_key === currentWeekKey && (
                  <span className="history-tag">{t('week.current')}</span>
                )}
                <span className="history-meta">
                  {t('week.updated')} {formatWeekStamp(week.updated_at || week.created_at, locale)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

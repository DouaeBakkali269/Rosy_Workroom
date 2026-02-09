import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWeekPlanHistory } from '../services/api'

const isWeekKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)

function formatWeekRange(weekKey) {
  if (!weekKey || !isWeekKey(weekKey)) return weekKey || ''
  const [year, month, day] = weekKey.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

function formatWeekStamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function WeekHistoryPage() {
  const [weeks, setWeeks] = useState([])
  const [currentWeekKey, setCurrentWeekKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

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
          <h2>Weekly Planner History</h2>
          <p className="week-range">Browse and reopen past weeks</p>
        </div>
        <button className="btn ghost" onClick={() => navigate('/week-planner')}>Back to planner</button>
      </div>

      <div className="week-history-page">
        {isLoading ? (
          <p className="week-loading">Loading history...</p>
        ) : weeks.length === 0 ? (
          <div className="history-empty-state">
            <p>No past weeks yet.</p>
          </div>
        ) : (
          <div className="history-list history-list-full">
            {weeks.map(week => (
              <button
                key={week.week_key}
                className={`history-item ${week.week_key === currentWeekKey ? 'active' : ''}`}
                onClick={() => openWeek(week.week_key)}
              >
                <span className="history-range">{formatWeekRange(week.week_key)}</span>
                {week.week_key === currentWeekKey && (
                  <span className="history-tag">Current</span>
                )}
                <span className="history-meta">
                  Updated {formatWeekStamp(week.updated_at || week.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

import { useLanguage } from '../context/LanguageContext'

const MONTH_KEYS = [
  'money.months.january', 'money.months.february', 'money.months.march',
  'money.months.april', 'money.months.may', 'money.months.june',
  'money.months.july', 'money.months.august', 'money.months.september',
  'money.months.october', 'money.months.november', 'money.months.december',
]

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export default function MonthPicker({ year, month, onChange, cycleStartDay = 1, onSettingsClick, settingsTitle }) {
  const { t } = useLanguage()

  function goToPrev() {
    if (month === 1) {
      onChange(year - 1, 12)
    } else {
      onChange(year, month - 1)
    }
  }

  function goToNext() {
    if (month === 12) {
      onChange(year + 1, 1)
    } else {
      onChange(year, month + 1)
    }
  }

  let label
  if (cycleStartDay === 1) {
    label = `${t(MONTH_KEYS[month - 1])} ${year}`
  } else {
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDay = cycleStartDay - 1
    label = `${SHORT_MONTHS[month - 1]} ${cycleStartDay} – ${SHORT_MONTHS[endMonth - 1]} ${endDay}, ${endYear}`
  }

  return (
    <div className="month-picker">
      <button
        className="month-picker-arrow"
        onClick={goToPrev}
        title={t('money.prevMonth')}
        aria-label={t('money.prevMonth')}
      >
        ‹
      </button>
      <span className="month-picker-label">
        {label}
      </span>
      <button
        className="month-picker-arrow"
        onClick={goToNext}
        title={t('money.nextMonth')}
        aria-label={t('money.nextMonth')}
      >
        ›
      </button>
      {onSettingsClick && (
        <button
          className="month-picker-arrow cycle-settings-btn"
          onClick={onSettingsClick}
          title={settingsTitle}
        >⚙</button>
      )}
    </div>
  )
}

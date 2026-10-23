import { useLanguage } from '../context/LanguageContext'

const MONTH_KEYS = [
  'money.months.january', 'money.months.february', 'money.months.march',
  'money.months.april', 'money.months.may', 'money.months.june',
  'money.months.july', 'money.months.august', 'money.months.september',
  'money.months.october', 'money.months.november', 'money.months.december',
]

export default function MonthPicker({ year, month, onChange }) {
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

  const monthLabel = t(MONTH_KEYS[month - 1])

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
        {monthLabel} {year}
      </span>
      <button
        className="month-picker-arrow"
        onClick={goToNext}
        title={t('money.nextMonth')}
        aria-label={t('money.nextMonth')}
      >
        ›
      </button>
    </div>
  )
}

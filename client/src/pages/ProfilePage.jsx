import { useEffect, useState } from 'react'
import {
  deleteProfileAvatar,
  getCurrentWeekPlan,
  getProfile,
  getProjects,
  getVisionGoals,
  getWishlist,
  updateProfile,
  updateProfilePassword,
  uploadProfileAvatar
} from '../services/api'
import { useLanguage } from '../context/LanguageContext'

export default function ProfilePage({ user, onLogout }) {
  const { t, setLanguage: setAppLanguage, langKey } = useLanguage()
  const username = user?.username || t('profile.fallbackName')
  const [profile, setProfile] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [displayName, setDisplayName] = useState(username)
  const [focus, setFocus] = useState(t('profile.fallbackFocus'))
  const [bio, setBio] = useState('')
  const [mantra, setMantra] = useState('')
  const [birthday, setBirthday] = useState('')
  const [themeMood, setThemeMood] = useState('Strawberry')
  const [language, setProfileLanguage] = useState('English')
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [saved, setSaved] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [stats, setStats] = useState({
    completedTasks: 0,
    goals: 0,
    purchased: 0,
    projects: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [joinedDate, setJoinedDate] = useState('')
  const moodLabel = {
    Strawberry: t('profile.themeStrawberry'),
    'Rose tea': t('profile.themeRoseTea'),
    Vanilla: t('profile.themeVanilla'),
    Matcha: t('profile.themeMatcha')
  }[themeMood] || themeMood || t('profile.themeStrawberry')
  const languageLabel = {
    English: t('profile.langEnglish'),
    French: t('profile.langFrench'),
    German: t('profile.langGerman')
  }[language] || language

  function formatPrettyDate(dateText) {
    if (!dateText) return t('profile.unknownDate')
    const localeByLang = { en: 'en-US', fr: 'fr-FR', de: 'de-DE' }
    const locale = localeByLang[langKey] || 'en-US'
    const parsed = new Date(`${dateText}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return dateText
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(parsed)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const updated = await uploadProfileAvatar(file)
      setAvatarUrl(updated.avatarUrl || '')
      setProfile(updated)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    }
  }

  async function handleSave() {
    const payload = {
      displayName: displayName.trim() || username,
      focus: focus.trim(),
      bio: bio.trim(),
      mantra: mantra.trim(),
      birthday,
      themeMood,
      language
    }
    try {
      const updated = await updateProfile(payload)
      setProfile(updated)
      if (updated?.joinedDate) setJoinedDate(updated.joinedDate)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  async function handleRemoveAvatar() {
    try {
      const updated = await deleteProfileAvatar()
      setAvatarUrl(updated?.avatarUrl || '')
      setProfile(updated || null)
    } catch (error) {
      console.error('Failed to remove avatar:', error)
    }
  }

  async function handlePasswordUpdate() {
    setPasswordMessage('')
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setPasswordMessage(t('profile.passwordRequired'))
      return
    }
    if (passwords.next.length < 8) {
      setPasswordMessage(t('profile.passwordTooShort'))
      return
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage(t('profile.passwordMismatch'))
      return
    }

    try {
      await updateProfilePassword({ currentPassword: passwords.current, newPassword: passwords.next })
      setPasswordMessage(t('profile.passwordUpdated'))
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (error) {
      setPasswordMessage(error.message || t('profile.passwordFailed'))
    }
  }

  function normalizeWeekPayload(payload) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if (Array.isArray(payload.days)) return payload.days
      if (Array.isArray(payload.plan)) return payload.plan
      if (payload.plan && Array.isArray(payload.plan.days)) return payload.plan.days
      if (payload.plan && Array.isArray(payload.plan.plan)) return payload.plan.plan
      return []
    }
    return Array.isArray(payload) ? payload : []
  }

  useEffect(() => {
    let isActive = true
    async function loadStats() {
      setStatsLoading(true)
      try {
        const [weekData, goals, wishlist, projects] = await Promise.all([
          getCurrentWeekPlan(),
          getVisionGoals(),
          getWishlist(),
          getProjects()
        ])

        const days = normalizeWeekPayload(weekData?.plan ?? weekData)
        const completedTasks = days.reduce((total, day) => {
          const tasks = Array.isArray(day.tasks) ? day.tasks : []
          return total + tasks.filter(task => task.done).length
        }, 0)

        const purchased = Array.isArray(wishlist)
          ? wishlist.filter(item => item.status === 'purchased').length
          : 0

        if (isActive) {
          const achievedGoals = Array.isArray(goals)
            ? goals.filter((goal) => Boolean(goal.achieved)).length
            : 0

          setStats({
            completedTasks,
            goals: achievedGoals,
            purchased,
            projects: Array.isArray(projects) ? projects.length : 0
          })
        }
      } catch (error) {
        console.error('Failed to load profile stats:', error)
      } finally {
        if (isActive) setStatsLoading(false)
      }
    }

    loadStats()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadProfile() {
      try {
        const data = await getProfile()
        if (!isActive || !data) return
        setProfile(data)
        setAvatarUrl(data.avatarUrl || '')
        setDisplayName(data.displayName || username)
        setFocus(data.focus || t('profile.fallbackFocus'))
        setBio(data.bio || '')
        setMantra(data.mantra || '')
        setBirthday(data.birthday || '')
        setThemeMood(data.themeMood || 'Strawberry')
        const storedLanguage = localStorage.getItem('appLanguage')
        setProfileLanguage(storedLanguage || data.language || 'English')
        setJoinedDate(data.joinedDate || user?.created_at || user?.createdAt || '')
      } catch (error) {
        console.error('Failed to load profile:', error)
      }
    }

    loadProfile()
    return () => {
      isActive = false
    }
  }, [username, user?.created_at, user?.createdAt])

  return (
    <section className="page-section active profile-page">
      <div className="profile-header">
        <div className="profile-banner">
          <div className="profile-banner-text">
            <p className="profile-kicker">{t('profile.kicker')}</p>
            <h2>{t('profile.title')}</h2>
            <p className="profile-subtitle">{t('profile.subtitle')}</p>
            <div className="profile-chips">
              <span className="profile-chip">{t('profile.mood')}: {moodLabel}</span>
              <span className="profile-chip">{t('profile.language')}: {languageLabel}</span>
              {focus && <span className="profile-chip profile-chip-focus">{focus}</span>}
            </div>
          </div>
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-ring">
              {avatarUrl ? (
                <img className="profile-avatar-img" src={avatarUrl} alt={t('profile.avatarAlt')} />
              ) : (
                <div className="profile-avatar-placeholder">
                  {displayName?.slice(0, 2).toUpperCase() || 'RW'}
                </div>
              )}
            </div>
            <div className="profile-avatar-actions">
              <label
                className="profile-avatar-icon-btn profile-upload-btn"
                title={t('profile.uploadPhoto')}
                aria-label={t('profile.uploadPhoto')}
              >
                <span aria-hidden="true">+</span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>
              {avatarUrl && (
                <button
                  className="profile-avatar-icon-btn profile-avatar-remove-btn"
                  type="button"
                  title={t('profile.removePhoto')}
                  aria-label={t('profile.removePhoto')}
                  onClick={handleRemoveAvatar}
                >
                  <span aria-hidden="true">x</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        <div className="profile-panel">
          <h3>{t('profile.about')}</h3>
          <div className="profile-form">
            <label className="profile-field">
              <span>{t('profile.displayName')}</span>
              <input
                className="input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span>{t('profile.focus')}</span>
              <input
                className="input"
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span>{t('profile.bio')}</span>
              <textarea
                className="input"
                rows="4"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.bioPlaceholder')}
              ></textarea>
            </label>
            <label className="profile-field">
              <span>{t('profile.mantra')}</span>
              <input
                className="input"
                type="text"
                value={mantra}
                onChange={(e) => setMantra(e.target.value)}
                placeholder={t('profile.mantraPlaceholder')}
              />
            </label>
            <label className="profile-field">
              <span>{t('profile.birthday')}</span>
              <input
                className="input"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span>{t('profile.theme')}</span>
              <select
                className="input"
                value={themeMood}
                onChange={(e) => setThemeMood(e.target.value)}
              >
                <option value="Strawberry">{t('profile.themeStrawberry')}</option>
                <option value="Rose tea">{t('profile.themeRoseTea')}</option>
                <option value="Vanilla">{t('profile.themeVanilla')}</option>
                <option value="Matcha">{t('profile.themeMatcha')}</option>
              </select>
            </label>
            <label className="profile-field">
              <span>{t('profile.language')}</span>
              <select
                className="input"
                value={language}
                onChange={(e) => {
                  const next = e.target.value
                  setProfileLanguage(next)
                  setAppLanguage(next)
                }}
              >
                <option value="English">{t('profile.langEnglish')}</option>
                <option value="French">{t('profile.langFrench')}</option>
                <option value="German">{t('profile.langGerman')}</option>
              </select>
            </label>
          </div>
          <div className="profile-actions">
            <button className="btn primary" type="button" onClick={handleSave}>{t('profile.save')}</button>
            {saved && <span className="profile-saved">{t('profile.saved')}</span>}
          </div>
        </div>

        <div className="profile-side">
          <div className="profile-panel profile-panel-note">
            <p className="profile-note-kicker">{t('profile.noteKicker')}</p>
            <p className="profile-note-title">{displayName || username}</p>
            <p className="profile-note-text">
              {t('profile.noteText')}
            </p>
          </div>

          <div className="profile-panel">
            <div className="profile-panel-header">
              <h3>{t('profile.stats')}</h3>
              {statsLoading && <span className="profile-muted">{t('profile.updating')}</span>}
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-icon">{t('profile.statTask')}</span>
                <p className="profile-stat-line">
                  <span className="profile-stat-value">{stats.completedTasks}</span>
                  <span className="profile-stat-label">{t('profile.tasksCompleted')}</span>
                </p>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-icon">{t('profile.statGoal')}</span>
                <p className="profile-stat-line">
                  <span className="profile-stat-value">{stats.goals}</span>
                  <span className="profile-stat-label">{t('profile.goalsAchieved')}</span>
                </p>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-icon">{t('profile.statWish')}</span>
                <p className="profile-stat-line">
                  <span className="profile-stat-value">{stats.purchased}</span>
                  <span className="profile-stat-label">{t('profile.wishlistWins')}</span>
                </p>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-icon">{t('profile.statBuild')}</span>
                <p className="profile-stat-line">
                  <span className="profile-stat-value">{stats.projects}</span>
                  <span className="profile-stat-label">{t('profile.projectsCreated')}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="profile-panel profile-panel-soft profile-panel-compact">
            <h3>{t('profile.security')}</h3>
            <div className="profile-form">
              <label className="profile-field">
                <span>{t('profile.currentPassword')}</span>
                <input
                  className="input"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder="••••••••"
                />
              </label>
              <label className="profile-field">
                <span>{t('profile.newPassword')}</span>
                <input
                  className="input"
                  type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                  placeholder={t('profile.passwordPlaceholderMin')}
                />
              </label>
              <label className="profile-field">
                <span>{t('profile.confirmPassword')}</span>
                <input
                  className="input"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder={t('profile.passwordPlaceholderConfirm')}
                />
              </label>
            </div>
            <div className="profile-actions">
              <button className="btn ghost" type="button" onClick={handlePasswordUpdate}>{t('profile.updatePassword')}</button>
              <button className="btn primary" onClick={onLogout}>{t('profile.logout')}</button>
            </div>
            {passwordMessage && <p className="profile-password-message">{passwordMessage}</p>}
            {joinedDate && (
              <p className="profile-joined-date">{t('profile.joined')} {formatPrettyDate(joinedDate)}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

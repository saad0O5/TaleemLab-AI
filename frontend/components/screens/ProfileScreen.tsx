"use client"

import { useState, useEffect } from 'react'
import { Language, View } from '../../lib/types'
import { resetProgress, getPredictions } from '../../lib/studentModel'
import { useToast } from '../ui/Toast'

interface ProfileScreenProps {
  onViewChange: (view: View) => void
  language?: Language
  onToggleLanguage?: () => void
}

export function ProfileScreen({ onViewChange, language = 'en', onToggleLanguage }: ProfileScreenProps) {
  const [isDark, setIsDark] = useState(false)
  const [board, setBoard] = useState('Federal Board (FBISE)')
  const [grade, setGrade] = useState('Grade 10')
  const [predictionCount, setPredictionCount] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const { addToast } = useToast()

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const entries = getPredictions()
    setPredictionCount(entries.length)
    const correct = entries.filter(e => e.correct).length
    setAccuracy(entries.length > 0 ? Math.round((correct / entries.length) * 100) : 0)
    const distinctDays = new Set(
      entries
        .map(e => e.timestamp ? new Date(e.timestamp).toDateString() : null)
        .filter((d): d is string => d !== null)
    ).size
    setStreakDays(distinctDays > 0 ? distinctDays : (entries.length > 0 ? 1 : 0))
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    html.classList.toggle('dark')
    const nowDark = html.classList.contains('dark')
    setIsDark(nowDark)
    localStorage.setItem('taleemlab_theme', nowDark ? 'dark' : 'light')
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your practical experiment history?')) {
      resetProgress()
      setPredictionCount(0)
      setAccuracy(0)
      setStreakDays(0)
      addToast('History and predictions reset', 'info')
    }
  }

  return (
    <div className="profile-container" style={{ paddingBottom: '90px' }}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="icon-button" onClick={() => onViewChange('dashboard')} type="button">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="dashboard-title">
            <span>{language === 'ur' ? 'پروفائل اور ترتیبات' : 'Student Profile'}</span>
          </div>
        </div>
      </header>

      {/* Avatar Card */}
      <div className="profile-hero-card">
        <div className="profile-avatar-circle">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h3 className="profile-student-name">Matric Science Candidate</h3>
        <p className="profile-student-role">Grade 9–10 Practical Track</p>

        {/* Real Stats Row (Zero hypothetical data) */}
        <div className="profile-stat-row">
          <div className="profile-stat-item">
            <span className="profile-stat-num">{streakDays}</span>
            <span className="profile-stat-lbl">Day Streak</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-num">{predictionCount}</span>
            <span className="profile-stat-lbl">Predictions</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-num">{predictionCount > 0 ? `${accuracy}%` : '—'}</span>
            <span className="profile-stat-lbl">Accuracy</span>
          </div>
        </div>
      </div>

      {/* Academic Settings */}
      <div className="profile-section">
        <h4 className="dashboard-section-title">Academic Board</h4>

        <div className="profile-setting-item">
          <label className="setting-label">Education Board</label>
          <select
            className="setting-select"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
          >
            <option>Federal Board (FBISE)</option>
            <option>Sindh Board (BIEK/BSEK)</option>
            <option>Punjab Board (BISE Lahore/Rwp)</option>
            <option>Khyber Pakhtunkhwa (BISE Peshawar)</option>
          </select>
        </div>

        <div className="profile-setting-item">
          <label className="setting-label">Grade / Class</label>
          <select
            className="setting-select"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <option>Grade 9 (SSC Part-I)</option>
            <option>Grade 10 (SSC Part-II)</option>
          </select>
        </div>
      </div>

      {/* App Preferences */}
      <div className="profile-section">
        <h4 className="dashboard-section-title">App Preferences</h4>

        <div className="profile-toggle-row">
          <div>
            <div className="setting-label">Language / زبان</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Bilingual Urdu & English</div>
          </div>
          {onToggleLanguage && (
            <button className="btn btn-outline btn-sm" onClick={onToggleLanguage} type="button">
              {language === 'en' ? '🇵🇰 اردو' : '🇬🇧 English'}
            </button>
          )}
        </div>

        <div className="profile-toggle-row" style={{ marginTop: '12px' }}>
          <div>
            <div className="setting-label">Appearance</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Toggle Dark Mode</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={toggleTheme} type="button">
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div className="profile-toggle-row" style={{ marginTop: '12px' }}>
          <div>
            <div className="setting-label" style={{ color: 'var(--danger)' }}>Reset History</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Clear local experiment predictions</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleReset} type="button" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

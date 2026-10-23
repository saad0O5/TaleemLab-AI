import { useState, useEffect } from 'react'
import { Icon } from '../icons/Icon'
import { StepIndicator } from './StepIndicator'
import { Language, View } from '../../lib/types'

interface TopBarProps {
  step: 1 | 2 | 3 | 4 | 5
  onToggleTheme?: () => void
  onStepClick?: (step: number) => void
  currentView?: View
  language?: Language
  onToggleLanguage?: () => void
}

export function TopBar({
  step,
  onToggleTheme,
  onStepClick,
  currentView,
  language = 'en',
  onToggleLanguage
}: TopBarProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = onToggleTheme ?? (() => {
    const html = document.documentElement
    html.classList.toggle('dark')
    const nowDark = html.classList.contains('dark')
    setIsDark(nowDark)
    localStorage.setItem('taleemlab_theme', nowDark ? 'dark' : 'light')
  })

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Icon type="flask" size={16} />
        </span>
        <span>{language === 'ur' ? 'تعلِیم' : 'Taleem'}<span className="brand-accent">{language === 'ur' ? 'لیب' : 'Lab'}</span></span>
      </div>

      <StepIndicator step={step} onStepClick={onStepClick} currentView={currentView} />

      <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Language Toggle Pill */}
        {onToggleLanguage && (
          <button
            className="btn btn-outline btn-sm no-print"
            onClick={onToggleLanguage}
            style={{ fontWeight: '800', padding: '4px 10px', fontSize: '12px' }}
            title="Switch Language / زبان تبدیل کریں"
          >
            {language === 'en' ? '🇵🇰 اردو' : '🇬🇧 English'}
          </button>
        )}

        <button
          className="theme-button no-print"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <Icon type={isDark ? 'moon' : 'sun'} size={16} />
        </button>
      </div>
    </header>
  )
}

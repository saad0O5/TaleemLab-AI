import { useState, useEffect } from 'react'
import { Icon } from '../icons/Icon'
import { StepIndicator } from './StepIndicator'
import { View } from '../../lib/types'

interface TopBarProps {
  step: 1 | 2 | 3 | 4
  onToggleTheme?: () => void
  onStepClick?: (step: number) => void
  currentView?: View
}

export function TopBar({ step, onToggleTheme, onStepClick, currentView }: TopBarProps) {
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
        <span>Taleem<span className="brand-accent">Lab</span></span>
      </div>

      <StepIndicator step={step} onStepClick={onStepClick} currentView={currentView} />

      <div className="top-actions">
        <button
          className="theme-button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <Icon type={isDark ? 'moon' : 'sun'} size={16} />
        </button>
      </div>
    </header>
  )
}

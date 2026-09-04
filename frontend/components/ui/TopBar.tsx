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
  const toggleTheme = onToggleTheme ?? (() => {
    document.documentElement.classList.toggle('dark')
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
          <Icon type="sun" size={16} />
        </button>
      </div>
    </header>
  )
}

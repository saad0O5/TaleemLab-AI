"use client"

import { View } from '../../lib/types'

interface BottomNavBarProps {
  currentView: View
  onViewChange: (view: View) => void
}

export function BottomNavBar({ currentView, onViewChange }: BottomNavBarProps) {
  // Determine which tab is active
  const isHome = currentView === 'dashboard' || currentView === 'onboarding'
  const isPractice = currentView === 'simulate' || currentView === 'capture' || currentView === 'confirm'
  const isAnalytics = currentView === 'progress' || currentView === 'evaluation'
  const isProfile = currentView === 'profile'

  return (
    <nav className="bottom-nav-bar no-print" aria-label="Main Navigation">
      <div className="bottom-nav-container">
        {/* Home Tab */}
        <button
          className={`bottom-nav-item ${isHome ? 'active' : ''}`}
          onClick={() => onViewChange('dashboard')}
          type="button"
          aria-label="Home"
        >
          <div className="bottom-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="bottom-nav-label">Home</span>
        </button>

        {/* Practice / Labs Tab */}
        <button
          className={`bottom-nav-item ${isPractice ? 'active' : ''}`}
          onClick={() => onViewChange('simulate')}
          type="button"
          aria-label="Practice Labs"
        >
          <div className="bottom-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
              <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
              <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
            </svg>
          </div>
          <span className="bottom-nav-label">Practice</span>
        </button>

        {/* Analytics Tab */}
        <button
          className={`bottom-nav-item ${isAnalytics ? 'active' : ''}`}
          onClick={() => onViewChange('progress')}
          type="button"
          aria-label="Analytics"
        >
          <div className="bottom-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <span className="bottom-nav-label">Analytics</span>
        </button>

        {/* Profile Tab */}
        <button
          className={`bottom-nav-item ${isProfile ? 'active' : ''}`}
          onClick={() => onViewChange('profile')}
          type="button"
          aria-label="Profile"
        >
          <div className="bottom-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span className="bottom-nav-label">Profile</span>
        </button>
      </div>
    </nav>
  )
}

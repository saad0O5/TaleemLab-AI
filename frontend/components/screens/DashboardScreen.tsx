"use client"

import { useState, useEffect } from 'react'
import { SubjectId, View, Language } from '../../lib/types'
import { ExampleKey } from '../../lib/exampleCircuits'
import { getPredictions, PredictionEntry } from '../../lib/studentModel'

interface DashboardScreenProps {
  onViewChange: (view: View) => void
  onSubjectChange: (sub: SubjectId) => void
  onSelectExample: (key: ExampleKey) => void
  onCaptureClick: () => void
  language?: Language
  onToggleLanguage?: () => void
  studentName?: string
}

export function DashboardScreen({
  onViewChange,
  onSubjectChange,
  onCaptureClick,
  language = 'en',
  onToggleLanguage,
  studentName = 'Student',
}: DashboardScreenProps) {
  const [entries, setEntries] = useState<PredictionEntry[]>([])
  const [activeSubject, setActiveSubject] = useState<SubjectId>('physics')

  useEffect(() => {
    setEntries(getPredictions())
  }, [])

  const handleLaunchLab = (sub: SubjectId) => {
    setActiveSubject(sub)
    onSubjectChange(sub)
    onViewChange('simulate')
  }

  // Calculate real streak from distinct days of predictions
  const distinctDays = new Set(
    entries
      .map(e => e.timestamp ? new Date(e.timestamp).toDateString() : null)
      .filter((d): d is string => d !== null)
  ).size

  const streakDays = distinctDays > 0 ? distinctDays : (entries.length > 0 ? 1 : 0)

  return (
    <div className="dashboard-container">
      {/* Top App Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="icon-button" type="button" aria-label="Menu" onClick={() => onViewChange('profile')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="dashboard-title">
            <span>{language === 'ur' ? 'تعلِیم لیب' : 'TaleemLab'}</span>
          </div>
        </div>

        <div className="header-right">
          {onToggleLanguage && (
            <button
              className="btn btn-outline btn-sm no-print"
              onClick={onToggleLanguage}
              style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '800' }}
            >
              {language === 'en' ? '🇵🇰 اردو' : '🇬🇧 En'}
            </button>
          )}

          <button className="icon-button" type="button" aria-label="Notifications" onClick={() => onViewChange('progress')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {entries.length > 0 && <span className="notification-dot" />}
          </button>
        </div>
      </header>

      {/* Greeting and Real Daily Streak */}
      <section className="dashboard-greeting-row">
        <div className="greeting-text">
          <h2 className="greeting-title">
            {language === 'ur' ? `خوش آمدید، طالب علم!` : `Good Day, ${studentName}!`}
          </h2>
          <p className="greeting-sub">
            {language === 'ur' ? 'میٹرک سائنس پریکٹیکلز کی تیاری جاری رکھیں۔' : 'Matric Science Practical Suite — Grade 9–10.'}
          </p>
        </div>

        {/* Real Streak Pill Badge */}
        <div className="streak-badge" title="Active practice days">
          <span className="streak-icon">🔥</span>
          <div className="streak-content">
            <span className="streak-number">{streakDays}</span>
            <span className="streak-label">{language === 'ur' ? 'دن' : 'Day Streak'}</span>
          </div>
        </div>
      </section>

      {/* Hero Featured Practical Card (Authentic Matric Syllabus Data) */}
      <section className="hero-practical-card">
        <div className="hero-live-badge">
          <span className="live-pulse" />
          <span>{language === 'ur' ? 'نمایاں پریکٹیکل' : 'FEATURED PRACTICAL'}</span>
        </div>

        <h3 className="hero-practical-title">
          {language === 'ur' ? 'فزکس پریکٹیکل: اوہم کے قانون اور ڈی سی سرکٹس کی تصدیق' : 'Physics: Verification of Ohm’s Law & DC Circuits'}
        </h3>

        <div className="hero-meta-row">
          <span className="hero-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            SLO: P-09-F-14
          </span>
          <span className="hero-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Section A · Major Practical
          </span>
        </div>

        <button
          className="hero-start-btn"
          onClick={() => handleLaunchLab('physics')}
          type="button"
        >
          {language === 'ur' ? 'پریکٹیکل لیب شروع کریں' : 'Launch Practical Simulation'}
        </button>
      </section>

      {/* Continue Learning Section (Based on Real History) */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h4 className="dashboard-section-title">
            {language === 'ur' ? 'تعلیم جاری رکھیں' : 'Continue Practicing'}
          </h4>
        </div>

        <div className="continue-card">
          <div className="continue-info">
            <div className="continue-title-row">
              <span className="continue-subject-title">
                {entries.length > 0 
                  ? `Physics Lab: ${entries.length} Predictions Committed`
                  : 'Physics Lab: Ohm’s Law & DC Circuits'}
              </span>
              <span className="continue-percent" style={{ color: 'var(--muted)', fontSize: '11px' }}>
                {entries.length > 0 ? 'Active' : 'Ready'}
              </span>
            </div>
            <div className="continue-progress-track">
              <div 
                className="continue-progress-fill" 
                style={{ width: entries.length > 0 ? `${Math.min(100, entries.length * 20)}%` : '0%' }} 
              />
            </div>
          </div>

          <button
            className="continue-resume-btn"
            onClick={() => handleLaunchLab('physics')}
            type="button"
          >
            {entries.length > 0 ? 'Resume Experiment' : 'Start Experiment'}
          </button>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="dashboard-section">
        <div className="section-header-row">
          <h4 className="dashboard-section-title">
            {language === 'ur' ? 'فوری اقدامات' : 'Quick Actions'}
          </h4>
        </div>

        <div className="quick-actions-grid">
          {/* Action 1: Photograph Notebook */}
          <button className="quick-action-card" onClick={onCaptureClick} type="button">
            <div className="quick-action-icon-wrap icon-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <span className="quick-action-name">
              {language === 'ur' ? 'کاپی اسکین کریں' : 'Scan Notebook'}
            </span>
          </button>

          {/* Action 2: Practice Labs */}
          <button className="quick-action-card" onClick={() => handleLaunchLab('physics')} type="button">
            <div className="quick-action-icon-wrap icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            </div>
            <span className="quick-action-name">
              {language === 'ur' ? 'پریکٹیکل لیب' : 'Practice Lab'}
            </span>
          </button>

          {/* Action 3: Analytics */}
          <button className="quick-action-card" onClick={() => onViewChange('progress')} type="button">
            <div className="quick-action-icon-wrap icon-amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <span className="quick-action-name">
              {language === 'ur' ? 'نتائج و اعداد' : 'Analytics'}
            </span>
          </button>

          {/* Action 4: AI Tutor */}
          <button className="quick-action-card" onClick={() => onViewChange('evaluation')} type="button">
            <div className="quick-action-icon-wrap icon-emerald">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className="quick-action-name">
              {language === 'ur' ? 'اے آئی تشخیص' : 'AI Evaluation'}
            </span>
          </button>
        </div>
      </section>

      {/* 4 Official Matric Science Practicals */}
      <section className="dashboard-section" style={{ paddingBottom: '90px' }}>
        <div className="section-header-row">
          <h4 className="dashboard-section-title">
            {language === 'ur' ? 'میٹرک پریکٹیکل مضامین' : 'Official Matric Practical Labs'}
          </h4>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>Grade 9–10</span>
        </div>

        <div className="subjects-list-grid">
          {/* Physics */}
          <div className="subject-item-card" onClick={() => handleLaunchLab('physics')}>
            <div className="subject-icon-box" style={{ background: '#FFFBEB', color: '#D97706' }}>⚡</div>
            <div className="subject-details">
              <div className="subject-name">Physics — DC Circuits & Ohm’s Law</div>
              <div className="subject-slo">SLO: P-09-F-14 · Verification of V = IR & Series/Parallel</div>
            </div>
            <button className="subject-enter-btn" type="button">→</button>
          </div>

          {/* Chemistry */}
          <div className="subject-item-card" onClick={() => handleLaunchLab('chemistry')}>
            <div className="subject-icon-box" style={{ background: '#ECFDF5', color: '#059669' }}>🧪</div>
            <div className="subject-details">
              <div className="subject-name">Chemistry — Acid-Base Titration</div>
              <div className="subject-slo">SLO: C-10-B-13 · Volumetric Molarity & pH Indicators</div>
            </div>
            <button className="subject-enter-btn" type="button">→</button>
          </div>

          {/* Biology */}
          <div className="subject-item-card" onClick={() => handleLaunchLab('biology')}>
            <div className="subject-icon-box" style={{ background: '#F0FDF4', color: '#16A34A' }}>🧬</div>
            <div className="subject-details">
              <div className="subject-name">Biology — Genetics & Variation</div>
              <div className="subject-slo">SLO: B-09-10-X-02 · Mendel’s Monohybrid & Punnett Square</div>
            </div>
            <button className="subject-enter-btn" type="button">→</button>
          </div>

          {/* Computer Science */}
          <div className="subject-item-card" onClick={() => handleLaunchLab('computer')}>
            <div className="subject-icon-box" style={{ background: '#F5F3FF', color: '#7C3AED' }}>💻</div>
            <div className="subject-details">
              <div className="subject-name">Computer Science — Digital Logic Gates</div>
              <div className="subject-slo">SLO: CS-09-10 · Boolean Logic, Truth Tables & LED Output</div>
            </div>
            <button className="subject-enter-btn" type="button">→</button>
          </div>
        </div>
      </section>
    </div>
  )
}

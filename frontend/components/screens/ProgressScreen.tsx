"use client"

import { useState, useEffect } from 'react'
import { getLearningSummary, StudentProfileForAI } from '../../lib/api'
import { loadFromSupabase } from '../../lib/studentModel'
import {
  StudentModel, getSRMSummary, getConceptLabel, MISCONCEPTIONS, ConceptId,
  getPredictions, getConceptBreakdown, PredictionEntry
} from '../../lib/studentModel'
import { Icon } from '../icons/Icon'
import { View } from '../../lib/types'

interface ProgressScreenProps {
  studentModel: StudentModel
  buildStudentProfile: () => StudentProfileForAI
  onViewChange: (view: View) => void
  onStepClick?: (step: number) => void
}

export function ProgressScreen({ studentModel, buildStudentProfile, onViewChange }: ProgressScreenProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryIsAI, setSummaryIsAI] = useState(false)

  // Try loading from Supabase on mount
  useEffect(() => {
    loadFromSupabase().catch(() => {})
  }, [])

  useEffect(() => {
    const profile = buildStudentProfile()
    getLearningSummary(profile).then(result => {
      if (result) {
        setSummary(result.summary)
        setSummaryIsAI(result.isAI)
      } else {
        setSummary("You are exploring science practical concepts. Make predictions before altering variables to diagnose misconceptions and strengthen scientific intuition.")
      }
    }).catch(() => {
      setSummary("You are exploring science practical concepts. Make predictions before altering variables to build deep intuition.")
    }).finally(() => {
      setSummaryLoading(false)
    })
  }, [buildStudentProfile])

  // Real data derived directly from student model and predictions
  const entries: PredictionEntry[] = getPredictions()
  const breakdown = getConceptBreakdown(entries)
  const totalCorrect = entries.filter(e => e.correct).length
  const totalPredictions = entries.length
  const accuracy = totalPredictions > 0 ? Math.round((totalCorrect / totalPredictions) * 100) : 0

  // Calculate real activity per day of the week from actual timestamps
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const daysCount: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }

  entries.forEach(e => {
    if (e.timestamp) {
      const d = new Date(e.timestamp)
      const day = dayNames[d.getDay()]
      if (daysCount[day] !== undefined) {
        daysCount[day]++
      }
    }
  })

  const maxDayCount = Math.max(1, ...Object.values(daysCount))
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
    const count = daysCount[day] || 0
    return {
      day,
      count,
      // If count is 0, height is 0 so no fake bars appear
      height: count > 0 ? Math.max(15, Math.round((count / maxDayCount) * 100)) : 0,
    }
  })

  // Real Subject status
  const subjectsData = [
    {
      name: 'Physics',
      slo: 'SLO: P-09-F-14 · Ohm’s Law & DC Circuits',
      symbol: '⚡',
      status: totalPredictions > 0 
        ? `${totalPredictions} predictions (${accuracy}% accuracy)` 
        : 'Not started (0 predictions)',
      percent: accuracy,
      barColor: '#F59E0B',
      iconBg: '#FFFBEB',
      action: () => onViewChange('simulate'),
    },
    {
      name: 'Chemistry',
      slo: 'SLO: C-10-B-13 · Acid-Base Volumetric Titration',
      symbol: '🧪',
      status: 'Interactive titration lab ready',
      percent: 0,
      barColor: '#EF4444',
      iconBg: '#FEF2F2',
      action: () => onViewChange('simulate'),
    },
    {
      name: 'Biology',
      slo: 'SLO: B-09-10-X-02 · Genetics & Punnett Square',
      symbol: '🧬',
      status: 'Monohybrid cross simulation ready',
      percent: 0,
      barColor: '#10B981',
      iconBg: '#ECFDF5',
      action: () => onViewChange('simulate'),
    },
    {
      name: 'Computer Science',
      slo: 'SLO: CS-09-10 · Logic Gates & Truth Tables',
      symbol: '💻',
      status: 'Digital gates verification ready',
      percent: 0,
      barColor: '#2A115B',
      iconBg: '#F3EEFB',
      action: () => onViewChange('simulate'),
    },
  ]

  // Real misconceptions from Student Reasoning Model
  const misconceptions = MISCONCEPTIONS
    .map(m => {
      const h = studentModel.misconceptions[m.id]
      if (!h || h.confidence < 0.15) return null
      return { id: m.id, label: m.label, description: m.description, confidence: h.confidence }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.confidence - a.confidence)

  return (
    <div className="analytics-page-container" style={{ paddingBottom: '90px' }}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="icon-button" onClick={() => onViewChange('dashboard')} type="button" aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="dashboard-title">
            <span>Practical Analytics</span>
          </div>
        </div>

        <div className="header-right">
          <button className="icon-button" onClick={() => onViewChange('profile')} type="button" aria-label="Profile">
            <div className="small-avatar-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </button>
        </div>
      </header>

      {/* Main Analytics Content */}
      <div className="analytics-body">
        {/* Real Activity Highlight Card */}
        <div className="study-hours-card">
          <div className="study-hours-header">
            <div>
              <span className="study-hours-eyebrow">PREDICTIONS & EXPERIMENTS</span>
              <div className="study-hours-value">
                {totalPredictions} <span className="study-hours-unit">Predictions</span>
              </div>
            </div>

            <div className="study-hours-trending" style={{ background: totalPredictions > 0 ? '#DCFCE7' : '#F1F3FA', color: totalPredictions > 0 ? '#16A34A' : 'var(--muted)' }}>
              {totalPredictions > 0 ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  <span>{accuracy}% Reasoning Accuracy</span>
                </>
              ) : (
                <span>No recorded sessions yet</span>
              )}
            </div>
          </div>

          {/* Weekly Activity Bar Chart based on real data */}
          <div className="weekly-barchart-container">
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', fontWeight: '600' }}>
              Weekly Activity (Predictions by Day)
            </div>
            <div className="weekly-bars-flex">
              {weekDays.map((d) => (
                <div key={d.day} className="bar-column">
                  <div className="bar-track">
                    {d.height > 0 ? (
                      <div
                        className="bar-fill"
                        style={{ height: `${d.height}%` }}
                        title={`${d.count} predictions on ${d.day}`}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '2px', background: '#CBD5E1' }} />
                    )}
                  </div>
                  <span className="bar-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Wise Breakdown */}
        <div className="subject-wise-section">
          <div className="subject-wise-header">
            <h4 className="section-title-bold">Matric Practical Subjects</h4>
            <button className="view-all-link" onClick={() => onViewChange('simulate')} type="button">
              Open Labs
            </button>
          </div>

          <div className="subject-bars-list">
            {subjectsData.map((sub) => (
              <div key={sub.name} className="subject-stat-card" onClick={sub.action} style={{ cursor: 'pointer' }}>
                <div className="subject-stat-row">
                  <div className="subject-icon-sq" style={{ background: sub.iconBg, color: sub.barColor }}>
                    {sub.symbol}
                  </div>
                  <div className="subject-stat-meta">
                    <div className="subject-stat-name">{sub.name}</div>
                    <div className="subject-stat-time">{sub.status}</div>
                  </div>
                  <div className="subject-stat-percent">
                    {sub.percent > 0 ? `${sub.percent}%` : '—'}
                  </div>
                </div>

                {/* Progress Track */}
                <div className="subject-track">
                  <div
                    className="subject-fill"
                    style={{ width: `${sub.percent}%`, background: sub.barColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Concept Mastery from Student Reasoning Model */}
        {totalPredictions > 0 && (
          <div className="progress-section" style={{ marginTop: '16px' }}>
            <div className="section-label">Real Concept Mastery</div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {Object.entries(breakdown).map(([concept, { correct, total }]) => {
                const ratio = total > 0 ? Math.round((correct / total) * 100) : 0
                return (
                  <div key={concept} className="mastery-bar">
                    <div className="mastery-header">
                      <span>{getConceptLabel(concept as ConceptId)}</span>
                      <span className="mastery-score">{correct}/{total} ({ratio}%)</span>
                    </div>
                    <div className="mastery-track">
                      <div className="mastery-fill" style={{ width: `${ratio}%`, background: 'var(--primary)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Learning Summary */}
        <div className="learning-summary-card" style={{ marginTop: '16px' }}>
          <div className="learning-summary-label">
            <Icon type="lightbulb" size={14} />
            <span>AI Socratic Diagnostics</span>
            {summaryIsAI && <span className="ai-badge">AI</span>}
          </div>
          {summaryLoading ? (
            <div className="learning-summary-loading">
              <div className="ai-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
              <span>Analyzing student model…</span>
            </div>
          ) : (
            <p className="learning-summary-text">{summary}</p>
          )}

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onViewChange('evaluation')}
              type="button"
            >
              Open Full AI Assessment Report
            </button>
          </div>
        </div>

        {/* Active Misconceptions Diagnosed if any */}
        {misconceptions.length > 0 && (
          <div className="progress-section" style={{ marginTop: '16px' }}>
            <div className="section-label">Diagnosed Misconceptions (Bayesian SRM)</div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {misconceptions.map(m => (
                <div key={m.id} className="misconception-card">
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{m.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{m.description}</div>
                  <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px', fontWeight: '600' }}>
                    Diagnosed confidence: {Math.round(m.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

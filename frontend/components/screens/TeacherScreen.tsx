"use client"

import { useState, useEffect } from 'react'
import { View } from '../../lib/types'
import { TeacherStudentData, fetchTeacherData, generateTeacherSummary } from '../../lib/teacherData'
import { Icon } from '../icons/Icon'

interface TeacherScreenProps {
  onViewChange: (view: View) => void
}

export function TeacherScreen({ onViewChange }: TeacherScreenProps) {
  const [students, setStudents] = useState<TeacherStudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetchTeacherData().then(({ students, isMock }) => {
      setStudents(students)
      setIsMock(isMock)
      setLoading(false)
    })
  }, [])

  // Aggregate stats
  const totalStudents = students.length
  const avgAccuracy = students.length > 0
    ? Math.round(students.reduce((s, st) => s + st.accuracy, 0) / students.length)
    : 0
  const totalPredictions = students.reduce((s, st) => s + st.totalPredictions, 0)

  const selected = selectedId ? students.find(s => s.id === selectedId) : null

  // Load AI summary when a student is selected
  useEffect(() => {
    if (!selected || selected.aiSummary || selected.aiSummaryLoading) return
    setStudents(prev => prev.map(s =>
      s.id === selected.id ? { ...s, aiSummaryLoading: true } : s
    ))
    generateTeacherSummary(selected).then(summary => {
      setStudents(prev => prev.map(s =>
        s.id === selected.id
          ? { ...s, aiSummary: summary || s.recentSummary, aiSummaryLoading: false }
          : s
      ))
    })
  }, [selected?.id])

  // Detail view
  if (selected) {
    return (
      <main className="page-shell">
        <div className="teacher-detail">
          <button className="btn-text" onClick={() => setSelectedId(null)}>
            <Icon type="arrow-left" size={14} /> Back to all students
          </button>

          <div className="teacher-detail-header">
            <div className="teacher-detail-avatar">{selected.avatar}</div>
            <div>
              <h2 className="teacher-detail-name">{selected.name}</h2>
              <p className="teacher-detail-meta">
                {selected.totalPredictions} predictions &middot; {selected.accuracy}% accuracy &middot; Last active {selected.lastActive}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="teacher-stats">
            <div className="teacher-stat-card">
              <div className="teacher-stat-value">{selected.totalPredictions}</div>
              <div className="teacher-stat-label">Predictions</div>
            </div>
            <div className="teacher-stat-card">
              <div className="teacher-stat-value">{selected.accuracy}%</div>
              <div className="teacher-stat-label">Accuracy</div>
            </div>
            <div className="teacher-stat-card">
              <div className="teacher-stat-value">{selected.conceptsExplored}/3</div>
              <div className="teacher-stat-label">Concepts</div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="teacher-ai-summary">
            <div className="teacher-ai-label">
              <Icon type="sparkles" size={12} />
              <span>AI Tutor Summary</span>
            </div>
            {selected.aiSummaryLoading ? (
              <div className="ai-dots" style={{ padding: '8px 0' }}>
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            ) : (
              <p className="teacher-ai-text">{selected.aiSummary || selected.recentSummary}</p>
            )}
          </div>

          {/* Misconceptions */}
          {selected.misconceptions.length > 0 && (
            <div>
              <div className="section-label">Detected misconceptions</div>
              <div className="teacher-misconceptions">
                {selected.misconceptions.map(m => (
                  <div key={m.id} className="misconception-card">
                    <div className="misconception-header">
                      <span>{m.label}</span>
                      <span className="misconception-confidence">{Math.round(m.confidence * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-outline" onClick={() => onViewChange('progress')}>
            <Icon type="arrow-left" size={14} />
            Back to my progress
          </button>
        </div>
      </main>
    )
  }

  // Overview view
  return (
    <main className="page-shell">
      <div className="teacher-layout">
        <button className="btn-text" onClick={() => onViewChange('progress')}>
          <Icon type="arrow-left" size={14} /> Back to student view
        </button>

        <div className="teacher-header">
          <p className="eyebrow">Teacher View</p>
          <h1>Class <span>overview</span></h1>
          <p>See how your students are progressing. The AI tutor generates personalized insights for each learner.</p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        ) : (
          <>
            {/* Aggregate stats */}
            <div className="teacher-stats">
              <div className="teacher-stat-card">
                <div className="teacher-stat-value">{totalStudents}</div>
                <div className="teacher-stat-label">Students</div>
              </div>
              <div className="teacher-stat-card">
                <div className="teacher-stat-value">{avgAccuracy}%</div>
                <div className="teacher-stat-label">Avg accuracy</div>
              </div>
              <div className="teacher-stat-card">
                <div className="teacher-stat-value">{totalPredictions}</div>
                <div className="teacher-stat-label">Total predictions</div>
              </div>
            </div>

            {isMock && (
              <div style={{
                fontSize: '11px', color: 'var(--muted)', textAlign: 'center',
                padding: '6px 12px', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)',
              }}>
                Showing demo data. Connect to Supabase to see real student progress.
              </div>
            )}

            {/* Student grid */}
            <div className="student-grid">
              {students.map(s => (
                <div key={s.id} className="student-card" onClick={() => setSelectedId(s.id)}>
                  <div className="student-card-name">{s.name}</div>
                  <div className="student-card-meta">Last active {s.lastActive}</div>
                  <div className="student-card-stats">
                    <div className="student-card-stat">
                      <strong>{s.totalPredictions}</strong>
                      <span>Predictions</span>
                    </div>
                    <div className="student-card-stat">
                      <strong>{s.accuracy}%</strong>
                      <span>Accuracy</span>
                    </div>
                    <div className="student-card-stat">
                      <strong>{s.conceptsExplored}</strong>
                      <span>Concepts</span>
                    </div>
                  </div>
                  {s.misconceptions.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      {s.misconceptions.slice(0, 2).map(m => (
                        <span key={m.id} className={`student-card-badge badge-${s.badge}`}>
                          {m.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="student-card-summary">{s.recentSummary}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

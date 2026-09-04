import { useState, useEffect } from 'react'
import { getLearningSummary, StudentProfileForAI } from '../../lib/api'
import {
  StudentModel, getSRMSummary, getConceptLabel, MISCONCEPTIONS, ConceptId,
  getPredictions, getConceptBreakdown, PredictionEntry
} from '../../lib/studentModel'
import { getDiscoveries } from '../../lib/engagement'
import { TopBar } from '../ui/TopBar'
import { Icon } from '../icons/Icon'
import { View } from '../../lib/types'

const ALL_DISCOVERIES = [
  { id: 'ohms_law', title: "Ohm's Law" },
  { id: 'voltage_intuition', title: 'Voltage Intuition' },
  { id: 'switch_master', title: 'Switch Master' },
  { id: 'circuit_thinker', title: 'Circuit Thinker' },
  { id: 'inverse_relationship', title: 'Inverse Relationship' },
]

interface ProgressScreenProps {
  studentModel: StudentModel
  buildStudentProfile: () => StudentProfileForAI
  onViewChange: (view: View) => void
  onStepClick?: (step: number) => void
}

export function ProgressScreen({ studentModel, buildStudentProfile, onViewChange, onStepClick }: ProgressScreenProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryIsAI, setSummaryIsAI] = useState(false)

  useEffect(() => {
    const profile = buildStudentProfile()
    getLearningSummary(profile).then(result => {
      if (result) {
        setSummary(result.summary)
        setSummaryIsAI(result.isAI)
      } else {
        setSummary("You've been exploring circuit concepts. Keep experimenting to build a deeper understanding of how voltage, resistance, and current interact.")
      }
    }).catch(() => {
      setSummary("You've been exploring circuit concepts. Keep experimenting to build a deeper understanding.")
    }).finally(() => {
      setSummaryLoading(false)
    })
  }, [buildStudentProfile])

  const entries: PredictionEntry[] = getPredictions()
  const breakdown = getConceptBreakdown(entries)
  const totalCorrect = entries.filter(e => e.correct).length
  const totalPredictions = entries.length
  const accuracy = totalPredictions > 0 ? Math.round((totalCorrect / totalPredictions) * 100) : 0

  const srmSummary = getSRMSummary(studentModel)
  const discoveries = getDiscoveries(studentModel)
  const earnedIds = new Set(discoveries.map(d => d.id))

  // Build misconceptions list from student model
  const misconceptions = MISCONCEPTIONS
    .map(m => {
      const h = studentModel.misconceptions[m.id]
      if (!h || h.confidence < 0.15) return null
      return { id: m.id, label: m.label, description: m.description, confidence: h.confidence }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.confidence - a.confidence)

  const conceptLabels: Record<string, string> = { resistance: 'Resistance', voltage: 'Voltage', state: 'Switch' }

  // Use evidence entries for timeline (they have direction + answer)
  const recentEvidence = studentModel.evidence.slice(-10).reverse()

  function masteryLevel(correct: number, total: number): { label: string; className: string; percent: number } {
    if (total === 0) return { label: 'Not started', className: 'level-beginner', percent: 0 }
    const ratio = correct / total
    const percent = Math.round(ratio * 100)
    if (ratio <= 0.25) return { label: 'Just starting', className: 'level-beginner', percent }
    if (ratio <= 0.50) return { label: 'Building understanding', className: 'level-developing', percent }
    if (ratio <= 0.75) return { label: 'Good grasp', className: 'level-proficient', percent }
    return { label: 'Strong understanding', className: 'level-advanced', percent }
  }

  return (
    <main className="page-shell">
      <TopBar step={4} onStepClick={onStepClick} currentView="progress" />

      <div className="page-header">
        <p className="eyebrow">Your Journey</p>
        <h1>Learning <span>progress</span></h1>
        <p>See how your understanding is growing based on your predictions and experiments.</p>
      </div>

      <div className="page-body progress-body">
        {/* Back link */}
        <button className="btn-text" onClick={() => onViewChange('simulate')}>
          &larr; Back to lab
        </button>

        {/* Stats Cards */}
        <div className="progress-stats">
          <div className="progress-stat-card">
            <div className="progress-stat-value">{totalPredictions}</div>
            <div className="progress-stat-label">Total predictions</div>
          </div>
          <div className="progress-stat-card">
            <div className="progress-stat-value">{accuracy}%</div>
            <div className="progress-stat-label">Accuracy</div>
          </div>
          <div className="progress-stat-card">
            <div className="progress-stat-value">{Object.keys(breakdown).filter(k => breakdown[k].total > 0).length}/3</div>
            <div className="progress-stat-label">Concepts explored</div>
          </div>
          <div className="progress-stat-card">
            <div className="progress-stat-value">{totalCorrect}</div>
            <div className="progress-stat-label">Correct answers</div>
          </div>
        </div>

        {/* AI Learning Summary */}
        <div className="learning-summary-card">
          <div className="learning-summary-label">
            <Icon type="lightbulb" size={14} />
            <span>Your tutor says</span>
            {summaryIsAI && <span className="ai-badge">AI</span>}
          </div>
          {summaryLoading ? (
            <div className="learning-summary-loading">
              <div className="ai-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
              <span>Generating your learning summary...</span>
            </div>
          ) : (
            <p className="learning-summary-text">{summary}</p>
          )}
        </div>

        {/* Concept Mastery */}
        <div className="progress-section">
          <div className="section-label">Concept mastery</div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {Object.entries(breakdown).map(([concept, { correct, total }]) => {
              const m = masteryLevel(correct, total)
              return (
                <div key={concept} className="mastery-bar">
                  <div className="mastery-header">
                    <span>{conceptLabels[concept] || getConceptLabel(concept as ConceptId)}</span>
                    <span className="mastery-score">{correct}/{total}</span>
                  </div>
                  <div className="mastery-track">
                    <div className={`mastery-fill ${m.className}`} style={{ width: `${m.percent}%` }} />
                  </div>
                  <div className="mastery-level">{m.label}</div>
                </div>
              )
            })}
            {Object.keys(breakdown).length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No predictions yet. Start experimenting to see your concept mastery.</p>
            )}
          </div>
        </div>

        {/* Misconceptions */}
        {srmSummary.totalPredictions >= 2 && misconceptions.length > 0 && (
          <div className="progress-section">
            <div className="section-label">Areas to explore</div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {misconceptions.slice(0, 4).map(m => (
                <div key={m.id} className="misconception-card">
                  <div className="misconception-header">
                    <span>{m.label}</span>
                    <span className="misconception-confidence">{Math.round(m.confidence * 100)}%</span>
                  </div>
                  <p>{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discovery Milestones */}
        <div className="progress-section">
          <div className="section-label">Discovery milestones</div>
          <div className="discovery-milestones">
            {ALL_DISCOVERIES.map(d => {
              const earned = earnedIds.has(d.id)
              const fullDiscovery = discoveries.find(dd => dd.id === d.id)
              return (
                <div key={d.id} className={`discovery-milestone ${earned ? 'earned' : 'locked'}`}>
                  <div className="discovery-milestone-icon">
                    <Icon type={earned ? 'trophy' : 'check'} size={16} />
                  </div>
                  <div>
                    <div className="discovery-milestone-title">{d.title}</div>
                    {earned && fullDiscovery && (
                      <div className="discovery-milestone-desc">{fullDiscovery.description}</div>
                    )}
                    {!earned && (
                      <div className="discovery-milestone-desc">Keep experimenting to unlock</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Timeline */}
        {recentEvidence.length > 0 && (
          <div className="progress-section">
            <div className="section-label">Recent predictions</div>
            <div className="timeline">
              {recentEvidence.map((entry, i) => (
                <div key={i} className="timeline-entry">
                  <div className={`timeline-dot ${entry.correct ? 'correct' : 'wrong'}`}>
                    {entry.correct ? '\u2713' : '\u2717'}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-concept">{conceptLabels[entry.concept] || entry.concept}</span>
                    <span className="timeline-direction">
                      {entry.direction === 'up' ? '\u2191 increased' : '\u2193 decreased'} &middot; answered {entry.answer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-success" onClick={() => onViewChange('simulate')}>
            Back to lab
          </button>
          <button className="btn btn-outline" onClick={() => onViewChange('capture')}>
            Start new experiment
          </button>
        </div>
      </div>
    </main>
  )
}

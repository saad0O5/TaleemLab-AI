import { useState } from 'react'
import { TopBar } from '../ui/TopBar'
import { Icon } from '../icons/Icon'
import { ExampleKey, curatedExamples } from '../../lib/exampleCircuits'
import { SubjectId, Language } from '../../lib/types'

interface WelcomeScreenProps {
  error: string
  loading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCapture: () => void
  onSelectExample: (key: ExampleKey) => void
  onStepClick?: (step: number) => void
  subject?: SubjectId
  onSubjectChange?: (subject: SubjectId) => void
  onLaunchSubjectLab?: (subject: SubjectId) => void
  language?: Language
  onToggleLanguage?: () => void
}

const PHYSICS_SYMBOLS = [
  { name: 'Battery', example: 'e.g. 9V', glyph: <><line x1="8" y1="4" x2="8" y2="20" strokeWidth="2.5"/><line x1="16" y1="7" x2="16" y2="17" strokeWidth="1.5"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/></> },
  { name: 'Resistor', example: 'e.g. 470Ω', glyph: <><path d="M2 12h3l2-4 2.5 8 2.5-8 2 4h3" /><line x1="2" y1="12" x2="0" y2="12"/><line x1="14" y1="12" x2="16" y2="12"/></> },
  { name: 'Switch', example: 'open or closed', glyph: <><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><line x1="0" y1="12" x2="2.5" y2="12"/><line x1="12" y1="12" x2="16" y2="12"/><line x1="4" y1="12" x2="10" y2="6"/></> },
  { name: 'Bulb', example: 'e.g. 30Ω', glyph: <><circle cx="8" cy="10" r="5"/><line x1="5.5" y1="7.5" x2="10.5" y2="12.5"/><line x1="10.5" y1="7.5" x2="5.5" y2="12.5"/><line x1="6" y1="15" x2="10" y2="15"/><line x1="8" y1="15" x2="8" y2="18"/></> },
  { name: 'Capacitor', example: 'e.g. 100μF', glyph: <><line x1="0" y1="12" x2="6" y2="12"/><line x1="6" y1="6" x2="6" y2="18" strokeWidth="2"/><line x1="10" y1="6" x2="10" y2="18" strokeWidth="2"/><line x1="10" y1="12" x2="16" y2="12"/></> },
  { name: 'Diode', example: '0.7V drop', glyph: <><line x1="0" y1="12" x2="5" y2="12"/><polygon points="5,7 5,17 12,12" fill="currentColor" stroke="none"/><line x1="12" y1="7" x2="12" y2="17" strokeWidth="2"/><line x1="12" y1="12" x2="16" y2="12"/></> },
]

const SUBJECTS: { id: SubjectId; label: string; icon: string; grade: string; desc: string }[] = [
  { id: 'physics', label: 'Physics', icon: '⚡', grade: 'Grade 9-10 Ch. 14', desc: 'DC Circuits & Ohm\'s Law' },
  { id: 'chemistry', label: 'Chemistry', icon: '🧪', grade: 'Grade 10 Ch. 10', desc: 'Titration & pH Indicators' },
  { id: 'biology', label: 'Biology', icon: '🧬', grade: 'Grade 10 Ch. 15', desc: 'Genetics & Punnett Square' },
  { id: 'computer', label: 'Computer Science', icon: '💻', grade: 'Grade 9-10 Logic', desc: 'Logic Gates & Truth Tables' },
]

export function WelcomeScreen({
  error,
  loading,
  fileInputRef,
  onFileChange,
  onCapture,
  onSelectExample,
  onStepClick,
  subject = 'physics',
  onSubjectChange,
  onLaunchSubjectLab,
  language = 'en',
  onToggleLanguage
}: WelcomeScreenProps) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>(subject)

  const handleSelectSubject = (s: SubjectId) => {
    setSelectedSubject(s)
    onSubjectChange?.(s)
  }

  return (
    <main className="page-shell">
      <TopBar
        step={1}
        onStepClick={onStepClick}
        currentView="capture"
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <div className="page-header">
        <p className="eyebrow">Matric Science Practical Suite</p>
        <h1>Choose your <span>practical lab</span></h1>
        <p>Four official practical subjects for Grade 9–10 students. Sketch in your notebook, take a photo, or launch interactive virtual labs.</p>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-danger">
            <Icon type="alert" size={18} />
            <div><strong>Something went wrong.</strong> {error}</div>
          </div>
        )}

        {/* ─── 4-Subject Grid Tabs ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {SUBJECTS.map((sub) => {
            const isSelected = selectedSubject === sub.id
            return (
              <button
                key={sub.id}
                className="card"
                onClick={() => handleSelectSubject(sub.id)}
                style={{
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--surface)' : 'var(--surface-soft)',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                  textAlign: 'left',
                  padding: '14px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease'
                }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--primary)' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px' }}>{sub.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--muted)', background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                    {sub.grade}
                  </span>
                </div>
                <div style={{ fontWeight: '800', fontSize: '14px', color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}>
                  {sub.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  {sub.desc}
                </div>
              </button>
            )
          })}
        </div>

        {/* ─── SUBJECT 1: PHYSICS CONTENT ─── */}
        {selectedSubject === 'physics' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card">
              <div className="section-label">⚡ Physics: How to draw your circuit</div>
              <div className="symbol-grid">
                {PHYSICS_SYMBOLS.map(({ name, example, glyph }) => (
                  <div key={name} className="symbol-card">
                    <svg className="symbol-icon" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyph}</svg>
                    <div>
                      <div className="symbol-name">{name}</div>
                      <div className="symbol-example">{example}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={onFileChange}
            />

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button className="btn btn-success" onClick={onCapture} disabled={loading}>
                <Icon type="camera" size={18} />
                {loading ? 'Analyzing…' : 'Photograph Notebook'}
              </button>

              <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                <Icon type="upload" size={18} />
                Upload Photo
              </button>
            </div>

            {/* Sample Circuits */}
            <div>
              <div className="section-label">Or try a curated circuit experiment</div>
              <div className="welcome-samples">
                {curatedExamples.map(({ key, name, description }) => (
                  <button
                    key={key}
                    className="btn btn-outline"
                    style={{ padding: '14px 12px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', height: 'auto', textAlign: 'left', minHeight: 'auto' }}
                    onClick={() => onSelectExample(key)}
                    disabled={loading}
                  >
                    <span style={{ fontWeight: '800', fontSize: '13px' }}>{name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '400' }}>{description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── SUBJECT 2: CHEMISTRY CONTENT ─── */}
        {selectedSubject === 'chemistry' && (
          <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="section-label">🧪 Chemistry: Acid-Base Titration & pH Indicators</div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Official Grade 10 Practical: Titration of 0.1M HCl against 0.1M NaOH using Phenolphthalein and Litmus indicators.
            </p>

            <div style={{ padding: '16px', background: 'var(--surface-soft)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--teal)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--teal)', marginBottom: '4px' }}>
                Key Learning Outcomes
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--foreground)', display: 'grid', gap: '4px' }}>
                <li>Identify sudden color shift at the <strong>25mL equivalence point</strong></li>
                <li>Understand why equal volumes of strong acid and strong base neutralize ($pH = 7$)</li>
                <li>Compare <strong>Phenolphthalein</strong> (clear $\leftrightarrow$ pink) with <strong>Litmus</strong> (red $\leftrightarrow$ blue)</li>
              </ul>
            </div>

            <button
              className="btn btn-primary"
              style={{ minHeight: '48px', fontSize: '14px' }}
              onClick={() => onLaunchSubjectLab?.('chemistry')}
            >
              🧪 Launch Chemistry Titration Lab
            </button>
          </div>
        )}

        {/* ─── SUBJECT 3: BIOLOGY CONTENT ─── */}
        {selectedSubject === 'biology' && (
          <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="section-label">🧬 Biology: Genetics & Punnett Square Inheritance</div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Official Grade 10 Practical: Monohybrid Cross (Mendel&apos;s Law of Segregation) predicting dominant vs. recessive allele traits.
            </p>

            <div style={{ padding: '16px', background: 'var(--surface-soft)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--warning)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--warning)', marginBottom: '4px' }}>
                Key Learning Outcomes
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--foreground)', display: 'grid', gap: '4px' }}>
                <li>Calculate 3:1 phenotypic ratio ($BB, Bb, bb$)</li>
                <li>Discover why a 25% chance is <strong>probabilistic, not a guaranteed quota</strong></li>
                <li>Simulate 20-offspring real-world random breeding trials</li>
              </ul>
            </div>

            <button
              className="btn btn-primary"
              style={{ minHeight: '48px', fontSize: '14px' }}
              onClick={() => onLaunchSubjectLab?.('biology')}
            >
              🧬 Launch Genetics & Inheritance Lab
            </button>
          </div>
        )}

        {/* ─── SUBJECT 4: COMPUTER SCIENCE CONTENT ─── */}
        {selectedSubject === 'computer' && (
          <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="section-label">💻 Computer Science: Digital Logic Gates & Truth Tables</div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Official Grade 9–10 CS Practical: Boolean logic gates (AND, OR, NOT, NAND, NOR, XOR), binary input switches, and live Truth Table verification.
            </p>

            <div style={{ padding: '16px', background: 'var(--surface-soft)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--primary)', marginBottom: '4px' }}>
                Key Learning Outcomes
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--foreground)', display: 'grid', gap: '4px' }}>
                <li>Verify truth tables in real time by toggling binary switches (0 and 1)</li>
                <li>Observe high-visibility animated signal lines leading to output LED</li>
                <li>Master inverted logic gates: NAND (NOT-AND) and NOR (NOT-OR)</li>
              </ul>
            </div>

            <button
              className="btn btn-primary"
              style={{ minHeight: '48px', fontSize: '14px' }}
              onClick={() => onLaunchSubjectLab?.('computer')}
            >
              💻 Launch Logic Gates Lab
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

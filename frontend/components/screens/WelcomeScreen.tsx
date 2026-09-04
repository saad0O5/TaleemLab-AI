import { TopBar } from '../ui/TopBar'
import { Icon } from '../icons/Icon'
import { ExampleKey, curatedExamples, exampleLabels } from '../../lib/exampleCircuits'
import { View } from '../../lib/types'

interface WelcomeScreenProps {
  error: string
  loading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCapture: () => void
  onSelectExample: (key: ExampleKey) => void
  onStepClick?: (step: number) => void
}

const SYMBOLS = [
  { name: 'Battery', example: 'e.g. 9V', glyph: <><line x1="8" y1="4" x2="8" y2="20" strokeWidth="2.5"/><line x1="16" y1="7" x2="16" y2="17" strokeWidth="1.5"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/></> },
  { name: 'Resistor', example: 'e.g. 470\u03A9', glyph: <><path d="M2 12h3l2-4 2.5 8 2.5-8 2 4h3" /><line x1="2" y1="12" x2="0" y2="12"/><line x1="14" y1="12" x2="16" y2="12"/></> },
  { name: 'Switch', example: 'open or closed', glyph: <><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><line x1="0" y1="12" x2="2.5" y2="12"/><line x1="12" y1="12" x2="16" y2="12"/><line x1="4" y1="12" x2="10" y2="6"/></> },
  { name: 'Bulb', example: 'e.g. 30\u03A9', glyph: <><circle cx="8" cy="10" r="5"/><line x1="5.5" y1="7.5" x2="10.5" y2="12.5"/><line x1="10.5" y1="7.5" x2="5.5" y2="12.5"/><line x1="6" y1="15" x2="10" y2="15"/><line x1="8" y1="15" x2="8" y2="18"/></> },
]

export function WelcomeScreen({ error, loading, fileInputRef, onFileChange, onCapture, onSelectExample, onStepClick }: WelcomeScreenProps) {
  return (
    <main className="page-shell">
      <TopBar step={1} onStepClick={onStepClick} currentView="capture" />

      <div className="page-header">
        <p className="eyebrow">Get Started</p>
        <h1>Start an <span>experiment</span></h1>
        <p>Draw a circuit on paper, then take a photo. The app will turn it into a live simulation you can experiment with.</p>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-danger">
            <Icon type="alert" size={18} />
            <div><strong>Something went wrong.</strong> {error}</div>
          </div>
        )}

        {/* Drawing Guide */}
        <div className="card">
          <div className="section-label">How to draw your circuit</div>
          <div className="symbol-grid">
            {SYMBOLS.map(({ name, example, glyph }) => (
              <div key={name} className="symbol-card">
                <svg className="symbol-icon" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyph}</svg>
                <div>
                  <div className="symbol-name">{name}</div>
                  <div className="symbol-example">{example}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Example circuit illustration */}
          <div style={{ marginTop: '14px', padding: '12px', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Example layout</div>
            <svg viewBox="0 0 220 120" width="100%" style={{ maxWidth: '260px', display: 'block' }} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M30 20H190V100H30Z" strokeDasharray="4 3" opacity="0.4" />
              <line x1="90" y1="12" x2="90" y2="28" strokeWidth="2.5" stroke="var(--primary)" />
              <line x1="100" y1="15" x2="100" y2="25" strokeWidth="1.5" stroke="var(--primary)" />
              <text x="95" y="9" textAnchor="middle" fill="var(--muted)" fontSize="8" stroke="none" fontWeight="700">9V</text>
              <path d="M190 48h-4l-2 4-3-8-3 8-2-4" stroke="var(--primary)" />
              <text x="200" y="62" fill="var(--muted)" fontSize="8" stroke="none" fontWeight="700">470{'\u03A9'}</text>
              <circle cx="110" cy="100" r="8" stroke="var(--primary)" />
              <line x1="106" y1="96" x2="114" y2="104" stroke="var(--primary)" />
              <line x1="114" y1="96" x2="106" y2="104" stroke="var(--primary)" />
              <text x="110" y="117" textAnchor="middle" fill="var(--muted)" fontSize="8" stroke="none" fontWeight="700">Bulb</text>
              <circle cx="30" cy="55" r="2" fill="var(--primary)" stroke="none" />
              <circle cx="30" cy="70" r="2" fill="var(--primary)" stroke="none" />
              <line x1="30" y1="55" x2="38" y2="48" stroke="var(--primary)" />
              <text x="16" y="64" fill="var(--muted)" fontSize="8" stroke="none" fontWeight="700">Switch</text>
            </svg>
          </div>

          <ul className="tips-list">
            <li>Draw components in a <strong>complete loop</strong> with connecting wires</li>
            <li>Label each component with its value (e.g. <strong>9V</strong>, <strong>470{'\u03A9'}</strong>)</li>
            <li>Use standard symbols -- the shapes shown above</li>
            <li>Good lighting, flat photo angle helps the AI read your drawing</li>
          </ul>
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
        <button className="btn btn-success" onClick={onCapture} disabled={loading}>
          <Icon type="camera" size={18} />
          {loading ? 'Analyzing...' : 'Take a photo'}
        </button>

        <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
          <Icon type="upload" size={18} />
          Upload from gallery
        </button>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>Analyzing your diagram...</span>
          </div>
        )}

        {/* Sample Experiments */}
        <div>
          <div className="section-label">Or try a sample experiment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

        {/* Dev testing examples */}
        {typeof window !== 'undefined' && window.location.search.includes('dev=true') && (
          <DevExamples onSelectExample={onSelectExample} loading={loading} />
        )}
      </div>
    </main>
  )
}

function DevExamples({ onSelectExample, loading }: { onSelectExample: (key: ExampleKey) => void; loading: boolean }) {
  return (
    <div style={{ marginTop: '8px' }}>
      <details>
        <summary style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700', cursor: 'pointer' }}>Dev testing examples</summary>
        <div style={{ marginTop: '8px' }}>
          <select
            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--foreground)', width: '100%' }}
            defaultValue=""
            onChange={(e) => { if (e.target.value) { onSelectExample(e.target.value as ExampleKey); e.target.value = '' } }}
            disabled={loading}
          >
            <option value="" disabled>Choose a test case...</option>
            {Object.entries(exampleLabels).map(([key, label]) => <option key={key} value={key}>{label as string}</option>)}
          </select>
        </div>
      </details>
    </div>
  )
}

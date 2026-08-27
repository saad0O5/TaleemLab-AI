import { ExampleKey } from '../../lib/exampleCircuits'
import { Icon } from '../icons/Icon'

interface CaptureScreenProps {
  error: string
  loading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCapture: () => void
  onSelectExample: (key: ExampleKey) => void
}

export function CaptureScreen({ error, loading, fileInputRef, onFileChange, onCapture, onSelectExample }: CaptureScreenProps) {
  return <main className="sim-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">∿</span><span>Taleem<span className="brand-accent">Lab</span></span></div>
      <div className="top-actions">
        <button className="theme-button" onClick={() => document.documentElement.classList.toggle('dark')} aria-label="Toggle theme"><Icon type="sun" size={17} /></button>
        <span className="avatar">AK</span>
      </div>
    </header>
    <div className="sim-header">
      <div>
        <p className="eyebrow">GET STARTED</p>
        <h1>Capture <span>&amp;</span> analyze</h1>
        <p>Bring your hand-drawn DC circuit diagrams to life. Upload or take a photo to analyze it, or try a sample circuit.</p>
      </div>
    </div>
    <div style={{ maxWidth: '600px', margin: '30px auto', padding: '0 20px', display: 'grid', gap: '20px' }}>
      {error && (
        <div style={{ padding: '15px', background: 'var(--surface)', borderLeft: '4px solid var(--danger)', color: 'var(--foreground)', fontSize: '14px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={onFileChange}
      />

      <button 
        className="blue-button"
        style={{ height: '54px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        onClick={onCapture}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : '📷 Capture circuit'}
      </button>
      
      <button 
        className="literal-switch"
        style={{ height: '54px', width: '100%', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
      >
        📁 Upload a photo
      </button>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Analyzing your circuit diagram...</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
        <button 
          style={{ border: 0, background: 'none', color: 'var(--primary)', fontWeight: '800', textDecoration: 'underline', cursor: 'pointer' }}
          onClick={() => onSelectExample('clean_circuit')}
          disabled={loading}
        >
          Try a sample circuit
        </button>
      </div>
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </main>
}

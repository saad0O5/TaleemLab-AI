import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons/Icon'


interface CameraModalProps {
  onCapture: (imageBase64: string) => void
  onClose: () => void
  onFallback: () => void
}

const MAX_DIMENSION = 1920

export function CameraModal({ onCapture, onClose, onFallback }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting')
  const [showSymbols, setShowSymbols] = useState(false)

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      try {
        let stream: MediaStream
        try {
          // Prefer the rear camera on phones; desktops reject facingMode
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (!cancelled) setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Focus management: move focus into the dialog and trap Tab navigation.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const getFocusable = () => Array.from(
      el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((n) => !n.hasAttribute('disabled'))
    const timer = window.setTimeout(() => { getFocusable()[0]?.focus() }, 0)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      el.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [])

  const takePhoto = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg', 0.92))
  }

  return <div
    className="cam-modal-overlay"
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
  >
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label="Take a photo of your circuit" tabIndex={-1} className="cam-modal-card">
      <div className="cam-modal-head">
        <strong className="cam-modal-title">Take a photo of your circuit</strong>
        <button
          onClick={onClose}
          aria-label="Close camera"
          className="cam-close-btn"
        ><Icon type="x" size={18} /></button>
      </div>

      {status === 'error' ? (
        <>
          <p className="cam-error-text">
            The camera couldn't be started — it may be unavailable, in use, or permission was denied.
            You can upload a photo instead.
          </p>
          <div className="cam-actions">
            <button className="blue-button cam-btn-flex" onClick={onFallback}><Icon type="upload" size={14} /> Upload a photo instead</button>
            <button className="literal-switch cam-btn-flex cam-btn-ghost" onClick={onClose}>Close</button>
          </div>
        </>
      ) : (
        <>
          <div className="cam-video-wrap">
            <video ref={videoRef} playsInline muted className="cam-video" />
            {status === 'starting' && (
              <p className="cam-video-starting">Starting camera…</p>
            )}
          </div>
          {/* Compact symbol reference */}
          <div className="cam-symbol-section">
            <button
              onClick={() => setShowSymbols(!showSymbols)}
              className="cam-symbol-toggle"
              aria-expanded={showSymbols}
            >
              <span className="cam-symbol-eyebrow">SYMBOL REFERENCE</span>
              <span className="cam-symbol-chevron"><Icon type={showSymbols ? 'chevron-up' : 'chevron-down'} size={14} /></span>
            </button>
            {showSymbols && (
              <div className="cam-symbol-grid">
                {[
                  { name: 'Battery', glyph: <><line x1="8" y1="4" x2="8" y2="20" strokeWidth="2.5"/><line x1="16" y1="7" x2="16" y2="17" strokeWidth="1.5"/></> },
                  { name: 'Resistor', glyph: <path d="M2 12h3l2-4 2.5 8 2.5-8 2 4h3" /> },
                  { name: 'Switch', glyph: <><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><line x1="4" y1="12" x2="10" y2="6"/></> },
                  { name: 'Bulb', glyph: <><circle cx="8" cy="10" r="5"/><line x1="5.5" y1="7.5" x2="10.5" y2="12.5"/><line x1="10.5" y1="7.5" x2="5.5" y2="12.5"/></> },
                  { name: 'Capacitor', glyph: <><line x1="0" y1="12" x2="6" y2="12"/><line x1="6" y1="6" x2="6" y2="18" strokeWidth="2"/><line x1="10" y1="6" x2="10" y2="18" strokeWidth="2"/><line x1="10" y1="12" x2="16" y2="12"/></> },
                  { name: 'Diode', glyph: <><line x1="0" y1="12" x2="5" y2="12"/><polygon points="5,7 5,17 12,12" fill="currentColor" stroke="none"/><line x1="12" y1="7" x2="12" y2="17" strokeWidth="2"/><line x1="12" y1="12" x2="16" y2="12"/></> },
                ].map(({ name, glyph }) => (
                  <div key={name} className="cam-symbol-item">
                    <svg className="cam-symbol-glyph" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyph}</svg>
                    <span className="cam-symbol-name">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="blue-button cam-btn-photo"
            onClick={takePhoto}
            disabled={status !== 'ready'}
          >
            <Icon type="camera" size={16} /> Take photo
          </button>
        </>
      )}
    </div>
  </div>
}

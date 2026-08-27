import { useEffect, useRef, useState } from 'react'

interface CameraModalProps {
  onCapture: (imageBase64: string) => void
  onClose: () => void
  onFallback: () => void
}

const MAX_DIMENSION = 1920

export function CameraModal({ onCapture, onClose, onFallback }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting')

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
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'grid', placeItems: 'center', padding: '20px', zIndex: 50 }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
  >
    <div style={{ width: '100%', maxWidth: '520px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '18px', display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '15px' }}>Take a photo of your circuit</strong>
        <button
          onClick={onClose}
          aria-label="Close camera"
          style={{ border: 0, background: 'none', color: 'var(--muted)', fontSize: '18px', fontWeight: '800', lineHeight: 1 }}
        >✕</button>
      </div>

      {status === 'error' ? (
        <>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5 }}>
            The camera couldn't be started — it may be unavailable, in use, or permission was denied.
            You can upload a photo instead.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="blue-button" style={{ height: '44px', flex: 1, fontSize: '13px' }} onClick={onFallback}>📁 Upload a photo instead</button>
            <button className="literal-switch" style={{ height: '44px', flex: 1, fontSize: '13px', background: 'var(--surface-soft)', color: 'var(--foreground)', border: '1px solid var(--border)' }} onClick={onClose}>Close</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ position: 'relative', background: '#000', borderRadius: '4px', overflow: 'hidden' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block' }} />
            {status === 'starting' && (
              <p style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', margin: 0, color: '#fff', fontSize: '13px', minHeight: '180px' }}>Starting camera…</p>
            )}
          </div>
          <button
            className="blue-button"
            style={{ height: '48px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            onClick={takePhoto}
            disabled={status !== 'ready'}
          >
            📷 Take photo
          </button>
        </>
      )}
    </div>
  </div>
}

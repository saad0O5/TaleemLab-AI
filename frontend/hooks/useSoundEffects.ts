import { useRef, useEffect } from 'react'

/* ─── Web Audio API sound effects for interaction feedback ─── */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.07) {
  const c = getCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.connect(g)
  g.connect(c.destination)
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
  o.start()
  o.stop(c.currentTime + dur)
}

function sequence(notes: [number, number, number][]) {
  const c = getCtx()
  if (!c) return
  const base = c.currentTime
  notes.forEach(([freq, delay, dur], i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g)
    g.connect(c.destination)
    o.type = 'sine'
    o.frequency.value = freq
    const t = base + delay
    g.gain.setValueAtTime(0.06, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.start(t)
    o.stop(t + dur)
  })
}

export function useSoundEffects() {
  const unlocked = useRef(false)

  // Unlock AudioContext on first user gesture (required by browsers)
  useEffect(() => {
    const unlock = () => {
      if (!unlocked.current) {
        getCtx()
        unlocked.current = true
      }
    }
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  return {
    /** Short high blip — button press, toggle */
    click: () => tone(880, 0.06, 'sine', 0.04),
    /** Two-note ascending chime — correct prediction */
    correct: () => sequence([[523, 0, 0.12], [659, 0.1, 0.18]]),
    /** Single low tone — wrong prediction */
    wrong: () => tone(330, 0.2, 'sine', 0.06),
    /** Three-note celebration — discovery milestone */
    discovery: () => sequence([[523, 0, 0.1], [659, 0.12, 0.1], [784, 0.24, 0.25]]),
    /** Soft descending tone — undo */
    undo: () => tone(440, 0.1, 'triangle', 0.04),
    /** Switch toggle — two quick blips */
    toggle: () => sequence([[600, 0, 0.04], [800, 0.06, 0.06]]),
  }
}

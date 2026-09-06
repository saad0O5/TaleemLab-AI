'use client'

import { useState, useEffect, useRef } from 'react'
import { askAI, CircuitContext, AskAIResponse } from '../../lib/api'
import { useToast } from '../ui/Toast'

export function AIAskCard({ circuitContext, initialQuestion }: { circuitContext: CircuitContext; initialQuestion?: string }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AskAIResponse | null>(null)
  const { addToast } = useToast()

  // When a follow-up question arrives from outside (e.g. AI tutor card),
  // auto-fill the input.
  const prevInitialRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (initialQuestion && initialQuestion !== prevInitialRef.current) {
      setQuestion(initialQuestion)
    }
    prevInitialRef.current = initialQuestion
  }, [initialQuestion])

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true)
    setResponse(null)
    try {
      const result = await askAI(question.trim(), circuitContext)
      setResponse(result)
      addToast('success', 'AI answered your question')
    } catch (err) {
      addToast('error', 'Could not reach the AI tutor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-ask-card">
      <label>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm1 11H7V7h2v4zm0-6H7V3h2v2z" />
        </svg>
        Ask the AI Tutor
      </label>
      <form onSubmit={handleAsk} className="ai-ask-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What happens if I increase the voltage?"
          maxLength={200}
          disabled={loading}
        />
        <button type="submit" disabled={!question.trim() || loading}>
          {loading ? '…' : 'Ask'}
        </button>
      </form>
      {response && (
        <div className="ai-ask-response">
          <p>{response.answer}</p>
          {response.tryThis && (
            <p style={{ marginTop: 8, color: 'var(--teal)', fontSize: 12 }}>
              Try: {response.tryThis}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

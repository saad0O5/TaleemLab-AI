import { Explanation } from '../../lib/types'
import { Icon } from '../icons/Icon'

interface AITutorCardProps {
  explanation: Explanation | null
  aiThinking: boolean
}

export function AITutorCard({ explanation, aiThinking }: AITutorCardProps) {
  // State 1: Empty — no prediction made yet
  if (!explanation && !aiThinking) {
    return (
      <div className="ai-tutor-card ai-empty">
        <div className="ai-tutor-icon">?</div>
        <h2>Your tutor</h2>
        <p>Make a prediction and change a control to see your tutor's response here.</p>
      </div>
    )
  }

  // State 2: Thinking — AI is generating response
  if (aiThinking || (explanation && explanation.text === '')) {
    return (
      <div className="ai-tutor-card ai-thinking">
        <div className="ai-tutor-icon"><Icon type="lightbulb" size={18} /></div>
        <div className="ai-thinking-content">
          <h2>Your tutor is thinking...</h2>
          <div className="ai-dots">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        </div>
      </div>
    )
  }

  if (!explanation) return null

  // State 3: Response — AI or fallback explanation
  const isCorrect = explanation.correct
  const isAI = explanation.isAI

  return (
    <div className={`ai-tutor-card ai-response ${isCorrect ? 'is-correct' : 'is-learning'}`}>
      <div className="ai-tutor-icon">
        <Icon type={isCorrect ? 'check' : 'lightbulb'} size={18} />
      </div>

      <div className="ai-response-content">
        <div className="ai-headline">{isCorrect ? 'You got it!' : 'Not quite'}</div>
        {isAI && <span className="ai-badge">AI Tutor</span>}

        <h2>What happened?</h2>
        <p className="ai-explanation">{explanation.text}</p>

        {explanation.followUp && (
          <div className="ai-follow-up">
            <Icon type="target" size={12} />
            <span>{explanation.followUp}</span>
          </div>
        )}

        {explanation.insight && (
          <div className="ai-insight">
            <Icon type="trophy" size={12} />
            <span>{explanation.insight}</span>
          </div>
        )}
      </div>
    </div>
  )
}

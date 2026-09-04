import { Icon } from '../icons/Icon'

interface ChallengePromptProps {
  prompt: string
}

export function ChallengePrompt({ prompt }: ChallengePromptProps) {
  return (
    <div className="challenge-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <Icon type="target" size={14} />
        <div className="challenge-label">Challenge</div>
      </div>
      <p>{prompt}</p>
    </div>
  )
}

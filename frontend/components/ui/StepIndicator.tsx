import { Icon } from '../icons/Icon'
import { View } from '../../lib/types'

const STEP_LABELS = ['Capture', 'Confirm', 'Simulate', 'Progress'] as const
const STEP_VIEWS: View[] = ['capture', 'confirm', 'simulate', 'progress']

interface StepIndicatorProps {
  step: 1 | 2 | 3 | 4
  onStepClick?: (step: number) => void
  currentView?: View
}

export function StepIndicator({ step, onStepClick, currentView }: StepIndicatorProps) {
  return (
    <div className="steps">
      {[1, 2, 3, 4].map((s, i) => {
        const isDone = s < step
        const isActive = s === step
        const isClickable = onStepClick && (isDone || isActive)

        const handleClick = () => {
          if (isClickable) onStepClick!(s)
        }

        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div className={`step-line${isDone ? ' done' : ''}`} />}
            <div className="step-dot">
              <button
                className={`step-circle${isActive ? ' active' : ''}${isDone ? ' done' : ''}${isClickable ? ' clickable' : ''}`}
                onClick={handleClick}
                disabled={!isClickable}
                aria-label={`Go to ${STEP_LABELS[i]}`}
              >
                {isDone ? <Icon type="check" size={14} /> : s}
              </button>
              <span className={`step-label${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                {STEP_LABELS[i]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { Icon } from '../icons/Icon'

interface DiscoveryCardProps {
  title?: string
  description?: string
  discovery?: { title: string; description: string }
}

export function DiscoveryCard(props: DiscoveryCardProps) {
  const title = props.title ?? props.discovery?.title ?? 'Milestone Unlocked'
  const description = props.description ?? props.discovery?.description ?? ''

  return (
    <div className="discovery-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <Icon type="trophy" size={14} />
        <div className="discovery-label">Discovery</div>
      </div>
      <p><strong>{title}</strong> — {description}</p>
    </div>
  )
}

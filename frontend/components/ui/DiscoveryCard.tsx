import { Icon } from '../icons/Icon'

interface DiscoveryCardProps {
  title: string
  description: string
}

export function DiscoveryCard({ title, description }: DiscoveryCardProps) {
  return (
    <div className="discovery-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <Icon type="trophy" size={14} />
        <div className="discovery-label">Discovery</div>
      </div>
      <p><strong>{title}</strong> -- {description}</p>
    </div>
  )
}

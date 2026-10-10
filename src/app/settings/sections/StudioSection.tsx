import { Section, NotYet } from './Section'

export default function StudioSection({ orgName }: { orgName: string }) {
  return (
    <Section id="studio" title="Studio">
      <p data-testid="settings-studio-org" className="text-sm" style={{ borderBottom: '1px solid var(--hairline, currentColor)' }}>
        These settings govern <strong>{orgName}</strong>.
      </p>
      <div data-testid="settings-studio-why">
        <NotYet>
          Studio controls are not available yet. When they are, each one will name the
          organization it changes.
        </NotYet>
      </div>
    </Section>
  )
}

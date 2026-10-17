import { Section, NotYet } from './Section'

// FR-005/FR-006: one labelled, hairline-ruled line per governed organization — spacing,
// hairlines and labels only, no second accent colour.
export default function StudioSection({ orgs }: { orgs: readonly { id: string; name: string }[] }) {
  return (
    <Section id="studio" title="Studio">
      {orgs.map((o) => (
        <p
          key={o.id}
          data-testid="settings-studio-org"
          className="text-sm pb-2"
          style={{ borderBottom: '1px solid var(--hairline, currentColor)' }}
        >
          These settings govern <strong>{o.name}</strong>.
        </p>
      ))}
      <div data-testid="settings-studio-why">
        <NotYet>
          Studio controls are not available yet. When they are, each one will name the
          organization it changes.
        </NotYet>
      </div>
    </Section>
  )
}

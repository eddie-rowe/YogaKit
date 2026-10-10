import { Section, NotYet } from './Section'

export type OrgMembership = { id: string; name: string; role: string }

export default function OrgMembershipsSection({ orgs }: { orgs: OrgMembership[] }) {
  return (
    <Section id="orgs" title="Organizations">
      <ul className="space-y-2 text-sm">
        {orgs.map((o) => (
          <li key={o.id} className="flex justify-between gap-4">
            <span>{o.name}</span>
            <span className="capitalize" style={{ color: 'var(--muted)' }}>
              {o.role}
            </span>
          </li>
        ))}
      </ul>
      <div data-testid="settings-orgs-why">
        <NotYet>
          Your role is set by the organization&rsquo;s owner, so it changes with them rather than
          here.
        </NotYet>
      </div>
    </Section>
  )
}

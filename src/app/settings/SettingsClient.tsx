'use client'

import Link from 'next/link'

import { SECTIONS, Section, NotYet, type SectionId } from './sections/Section'
import ProfileSection from './sections/ProfileSection'
import AppearanceSection from './sections/AppearanceSection'
import SecuritySection from './sections/SecuritySection'

export interface Membership {
  id: string
  roles: string[]
  status: string
  organizations: { id: string; name: string; org_types: string[] } | null
}

interface Props {
  email: string
  provider: string
  displayName: string
  timezone: string
  memberships: Membership[]
  isStudioLead: boolean
}

export default function SettingsClient({
  email,
  provider,
  displayName,
  timezone,
  memberships,
  isStudioLead,
}: Props) {
  // 006 FR-003/FR-004: these are absent entirely for a solo practitioner, not
  // greyed out and not tooltipped. Someone practising alone should never see
  // studio, cohort or seat language at all — a disabled control still teaches
  // them the app is about something they didn't ask for.
  const hasOrgs = memberships.length > 0
  const visible = new Set<SectionId>(
    SECTIONS.map(s => s.id).filter(id => {
      if (id === 'orgs') return hasOrgs
      if (id === 'studio') return isStudioLead
      return true
    }),
  )

  return (
    <div className="kk-page">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-10">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {email}
          </p>
        </div>

        {/* The index 006 FR-002 requires. Nine sections is under the 8–10 threshold
            where search starts to earn its place, so this is a list of anchors and
            nothing more (docs/design-research/19-settings-profile.md). */}
        <nav data-testid="settings-index" aria-label="Settings sections" className="flex flex-wrap gap-x-4 gap-y-1.5">
          {SECTIONS.filter(s => visible.has(s.id)).map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-sm underline underline-offset-4"
              style={{ color: 'var(--muted)' }}
            >
              {section.title}
            </a>
          ))}
        </nav>

        <ProfileSection displayName={displayName} timezone={timezone} />

        <AppearanceSection />

        <Section id="notifications" title="Notifications">
          <NotYet>
            There is nothing to be notified about yet. Practice reminders arrive with Daily
            Sadhana, and they will be opt-in when they do.
          </NotYet>
        </Section>

        <Section id="privacy" title="Privacy">
          <NotYet>
            Your journal, reflections and notes are yours alone — that is enforced in the
            database, not by this screen, so there is no switch here that could weaken it.
            Controls for what a teacher can see arrive alongside cohorts.
          </NotYet>
        </Section>

        <SecuritySection email={email} provider={provider} />

        <Section id="data" title="Your data">
          <p className="text-sm leading-relaxed">
            Every flow exports to a <code className="text-xs">.krama.json</code> file you own
            outright, from the{' '}
            <Link href="/flows" data-testid="settings-data-export" className="underline underline-offset-4">
              Flows
            </Link>{' '}
            list. Nothing is locked in.
          </p>
          <NotYet>
            Deleting your account isn’t built yet. Until it is, ask and it will be done by hand —
            no waiting period, no retention window.
          </NotYet>
        </Section>

        <Section id="billing" title="Billing">
          <NotYet>
            Nothing is charged and there is nothing to manage. The pose library stays readable
            without an account or a subscription, whatever else changes.
          </NotYet>
        </Section>

        {hasOrgs && (
          <Section id="orgs" title="Organizations">
            <div data-testid="settings-orgs-list" className="space-y-2">
              {memberships.map(m =>
                m.organizations ? (
                  <Link
                    key={m.id}
                    data-testid={`settings-org-${m.organizations.id}`}
                    href={`/org/${m.organizations.id}/members`}
                    className="kk-card px-3 py-2.5 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-medium">{m.organizations.name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {m.roles.join(', ')}
                      {m.status !== 'active' && ` · ${m.status}`}
                    </span>
                  </Link>
                ) : null,
              )}
            </div>
            <Link
              data-testid="settings-org-new"
              href="/org/new"
              className="kk-btn-outline inline-block px-3 py-1.5 text-sm"
            >
              Create an organization
            </Link>
          </Section>
        )}

        {isStudioLead && (
          /* Separated by the heading and the spacing above it only — 006 FR-006
             and SC-004 hold the interface at one accent, so no second colour and
             no boxed "admin" treatment. */
          <Section id="studio" title="Studio">
            <NotYet>
              Rosters and invitations live on each organization’s own page for now. Teaching
              tools — cohorts, shared sequences, seat management — arrive with Daily Sadhana.
            </NotYet>
          </Section>
        )}

        {/* Someone with no organization should still be able to make one; it just
            isn't a settings section until they have. */}
        {!hasOrgs && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Practising on your own needs nothing more than this.{' '}
            <Link data-testid="settings-org-new" href="/org/new" className="underline underline-offset-4">
              Teaching a group?
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

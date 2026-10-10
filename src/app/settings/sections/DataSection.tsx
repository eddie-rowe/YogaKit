import { Section, NotYet } from './Section'

export default function DataSection() {
  return (
    <Section id="data" title="Your data">
      <div data-testid="settings-data-why">
        <NotYet>
          Export and delete are not available from this page yet. Your flows stay yours in the
          meantime, and they remain readable on this device without an account.
        </NotYet>
      </div>
    </Section>
  )
}

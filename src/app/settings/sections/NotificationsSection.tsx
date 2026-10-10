import { Section, NotYet } from './Section'

export default function NotificationsSection() {
  return (
    <Section id="notifications" title="Notifications">
      <div data-testid="settings-notifications-why">
        <NotYet>
          There is nothing to switch on or off here yet. Yoga Kit does not send reminders or email
          you about your practice, so no notification setting exists to change.
        </NotYet>
      </div>
    </Section>
  )
}

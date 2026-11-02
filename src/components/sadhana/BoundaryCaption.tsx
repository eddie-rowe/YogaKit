// Persistent one-line boundary caption for the cohort dashboard (005 T055, FR-057, UX-018).
// Always rendered, no dismiss: the boundary is stated plainly every time a teacher looks.
// Presentational and unmounted — the dashboard route (T052) mounts it.

export const BOUNDARY_CAPTION =
  'You see check-in dates, streaks and milestones, never reflections or notes.'

export default function BoundaryCaption() {
  return (
    <p data-testid="sadhana-boundary-caption" className="text-xs" style={{ color: 'var(--muted)' }}>
      {BOUNDARY_CAPTION}
    </p>
  )
}

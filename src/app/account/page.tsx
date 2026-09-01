import { redirect } from 'next/navigation'

// /account was the stopgap surface 002 never got. /settings replaces it with the
// single indexed shell 006 FR-001 specifies. Kept as a redirect rather than
// deleted: sign-in links of the form ?next=/account are already in the wild, and
// a 404 on the way back from Google reads as a broken login.
export default function AccountPage() {
  redirect('/settings')
}

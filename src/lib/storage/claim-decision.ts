/** Records that the "claim the flows already on this device" question has been
 *  answered, once per device.
 *
 *  Lives in its own module because two surfaces need it and neither should own
 *  the other: onboarding/ClaimFlowsPrompt.tsx sets it, and the Account & security
 *  section of /settings clears it — the re-entry point
 *  docs/design-research/19-settings-profile.md requires, since the prompt
 *  otherwise never returns. */
export const CLAIM_DECISION_KEY = 'krama-claim-flows-decided'

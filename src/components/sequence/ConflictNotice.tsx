'use client'

import { AlertTriangle } from 'lucide-react'

interface ConflictNoticeProps {
  theme: string
  conflictingConstraints: string[]
  suggestedReframe?: string
  onAcceptReframe: () => void
  onChangeTheme: () => void
}

export function ConflictNotice({
  theme,
  conflictingConstraints,
  suggestedReframe,
  onAcceptReframe,
  onChangeTheme,
}: ConflictNoticeProps) {
  const constraintList = conflictingConstraints.join(', ')

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">
            Theme conflict detected
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            Your theme <strong>"{theme}"</strong> conflicts with the following safety
            constraint{conflictingConstraints.length > 1 ? 's' : ''}:{' '}
            <strong>{constraintList}</strong>. These constraints are hard rules — poses
            that conflict cannot appear in the sequence.
          </p>
          {suggestedReframe && (
            <p className="mt-2 text-sm text-amber-800">
              Suggested reframe: <strong>"{suggestedReframe}"</strong>
            </p>
          )}
          <div className="mt-4 flex gap-3">
            {suggestedReframe && (
              <button
                type="button"
                onClick={onAcceptReframe}
                className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                Use suggested reframe
              </button>
            )}
            <button
              type="button"
              onClick={onChangeTheme}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              Change theme
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

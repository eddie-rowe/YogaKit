'use client'

export type DurationResolution = 'accept-compressed' | 'extend-duration' | 'reduce-count'

interface DurationConflictNoticeProps {
  requestedDuration: number
  actualHoldMinutes: number
  onResolve: (resolution: DurationResolution, newDuration?: number) => void
}

export function DurationConflictNotice({
  requestedDuration,
  actualHoldMinutes,
  onResolve,
}: DurationConflictNoticeProps) {
  const suggestedDuration = Math.ceil((actualHoldMinutes / 0.8) / 15) * 15

  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-orange-600" aria-hidden="true">
          ⏱
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-orange-900">
            Duration conflict
          </h3>
          <p className="mt-1 text-sm text-orange-800">
            The generated sequence holds total{' '}
            <strong>{actualHoldMinutes} minutes</strong>, which is outside the ±25%
            tolerance for your requested <strong>{requestedDuration}-minute</strong>{' '}
            class. Choose how to proceed:
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onResolve('accept-compressed')}
              className="rounded-md border border-orange-400 bg-white px-3 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Accept compressed version
            </button>
            <button
              type="button"
              onClick={() => onResolve('extend-duration', suggestedDuration)}
              className="rounded-md border border-orange-400 bg-white px-3 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Extend to {suggestedDuration} min
            </button>
            <button
              type="button"
              onClick={() => onResolve('reduce-count')}
              className="rounded-md bg-orange-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Reduce pose count
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import type { DistributionSlice } from '@/lib/pose-library/sequence-stats'

interface Props {
  title: string
  slices: DistributionSlice[]
}

const R = 44       // donut radius
const STROKE = 14  // ring thickness
const CX = 60      // SVG centre x
const CY = 60      // SVG centre y
const CIRCUMFERENCE = 2 * Math.PI * R

export default function UsagePie({ title, slices }: Props) {
  if (slices.length === 0) return null

  // Build arc segments via stroke-dasharray on stacked circles
  const arcs: { offset: number; dash: number; color: string }[] = []
  let cursor = 0
  for (const slice of slices) {
    const dash = (slice.pct / 100) * CIRCUMFERENCE
    arcs.push({ offset: CIRCUMFERENCE - cursor, dash, color: slice.color })
    cursor += dash
  }

  const topLabel = slices[0]
  const ariaLabel = `${title}: ${slices.slice(0, 3).map(s => `${s.label} ${s.pct}%`).join(', ')}${slices.length > 3 ? ', and more' : ''}`

  return (
    <div className="flex flex-col items-center gap-3 min-w-[160px]">
      {/* Title */}
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest text-center">{title}</p>

      {/* Donut */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={STROKE}
        />

        {/* Segments — painted from 12 o'clock (rotate -90°) */}
        <g transform={`rotate(-90 ${CX} ${CY})`}>
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>

        {/* Centre label — top slice */}
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#1c1917" fontFamily="inherit">
          {topLabel.pct}%
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" fontSize="8" fill="#78716c" fontFamily="inherit">
          {topLabel.label}
        </text>
      </svg>

      {/* Legend */}
      <ul className="w-full space-y-1">
        {slices.map(slice => (
          <li key={slice.key} className="flex items-center gap-1.5 text-xs text-stone-600">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="truncate flex-1">{slice.label}</span>
            <span className="font-medium text-stone-500 tabular-nums">{slice.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

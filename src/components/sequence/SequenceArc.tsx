'use client'

type IntensityCurve = 'bell' | 'plateau' | 'gradual-ramp' | 'front-loaded' | 'back-loaded'

interface Props {
  intensityCurve?: IntensityCurve
  accentColor: string
}

const CURVE_PROFILES: Record<IntensityCurve, number[]> = {
  'bell':         [0.20, 0.65, 1.00, 0.50, 0.15],
  'plateau':      [0.35, 0.70, 0.70, 0.70, 0.25],
  'gradual-ramp': [0.25, 0.50, 0.75, 0.90, 0.30],
  'front-loaded': [0.80, 1.00, 0.65, 0.40, 0.20],
  'back-loaded':  [0.20, 0.35, 0.55, 1.00, 0.35],
}

const POSITIONS = ['Opening', 'Building', 'Peak', 'Cooldown', 'Integration']

export default function SequenceArc({ intensityCurve = 'bell', accentColor }: Props) {
  const intensities = CURVE_PROFILES[intensityCurve]

  const W = 300
  const H = 60
  const padX = 24
  const padY = 8
  const usableW = W - 2 * padX
  const usableH = H - 2 * padY

  const points = intensities.map((intensity, i) => ({
    x: padX + (i / (intensities.length - 1)) * usableW,
    y: padY + (1 - intensity) * usableH,
  }))

  // Smooth cubic bezier path — horizontal tangents at each point
  const step = usableW / (intensities.length - 1)
  const cp = step / 3

  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    d += ` C ${prev.x + cp},${prev.y} ${curr.x - cp},${curr.y} ${curr.x},${curr.y}`
  }

  // Closed fill path
  const fill = `${d} L ${points[points.length - 1].x},${H} L ${points[0].x},${H} Z`

  return (
    <div className="px-1 py-2">
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        className="w-full"
        aria-label={`Sequence arc: ${intensityCurve} intensity curve`}
        role="img"
      >
        <defs>
          <linearGradient id="arcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Fill */}
        <path d={fill} fill="url(#arcFill)" />

        {/* Stroke */}
        <path d={d} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots at key positions */}
        {points.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="3" fill={accentColor} opacity="0.8" />
        ))}

        {/* Position labels */}
        {points.map((pt, i) => (
          <text
            key={i}
            x={pt.x}
            y={H + 14}
            textAnchor="middle"
            fontSize="7"
            fill="#8a7d73"
            fontFamily="inherit"
          >
            {POSITIONS[i]}
          </text>
        ))}
      </svg>
    </div>
  )
}

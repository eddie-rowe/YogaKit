'use client'

import { MERIDIAN_PATH_MAP, CHAKRA_DOTS, ELEMENT_COLORS } from '@/lib/pose-library/body-map'
import type { FiveElement, ChakraName } from '@/lib/pose-types'

interface BodySvgProps {
  view: 'front' | 'back'
  activeTab: 'muscles' | 'meridians' | 'joints' | 'chakras'
  activeRegions: Set<string>
  deepRegions: Set<string>
  activeJoints: Array<{ cx: number; cy: number }>
  activeMeridians: string[]
  activeChakras: ChakraName[]
  element: FiveElement | null
}

// Shared body silhouette — same outline for front and back
function BodySilhouette() {
  const fill = '#f5f4f2'
  const stroke = '#dcd8d3'
  const sw = '1.2'
  const props = { fill, stroke, strokeWidth: sw }

  return (
    <g className="body-silhouette">
      {/* Head */}
      <ellipse cx="100" cy="44" rx="22" ry="26" {...props} />
      {/* Neck */}
      <rect x="91" y="67" width="18" height="17" rx="6" {...props} />
      {/* Torso */}
      <path
        d="M 42,83 L 158,83 C 168,87 174,97 174,112 L 175,158 C 175,170 170,180 162,192 L 152,208 C 148,218 138,222 128,222 L 72,222 C 62,222 52,218 48,208 L 38,192 C 30,180 25,170 25,158 L 26,112 C 26,97 32,87 42,83 Z"
        {...props}
      />
      {/* Left upper arm */}
      <path
        d="M 42,86 L 23,102 C 17,111 13,126 15,142 L 19,176 C 21,186 29,191 37,187 L 48,176 L 50,140 L 44,100 Z"
        {...props}
      />
      {/* Right upper arm */}
      <path
        d="M 158,86 L 177,102 C 183,111 187,126 185,142 L 181,176 C 179,186 171,191 163,187 L 152,176 L 150,140 L 156,100 Z"
        {...props}
      />
      {/* Left forearm */}
      <path
        d="M 19,176 C 15,184 11,197 11,210 L 11,248 C 11,260 16,268 23,270 L 31,270 C 38,270 43,263 43,256 L 44,218 L 43,187 Z"
        {...props}
      />
      {/* Right forearm */}
      <path
        d="M 181,176 C 185,184 189,197 189,210 L 189,248 C 189,260 184,268 177,270 L 169,270 C 162,270 157,263 157,256 L 156,218 L 157,187 Z"
        {...props}
      />
      {/* Left hand */}
      <ellipse cx="20" cy="280" rx="9" ry="12" {...props} />
      {/* Right hand */}
      <ellipse cx="180" cy="280" rx="9" ry="12" {...props} />
      {/* Left thigh */}
      <path
        d="M 72,222 L 58,238 L 56,288 L 57,330 C 57,337 63,343 71,343 L 91,343 C 99,343 103,337 103,330 L 103,238 L 101,222 Z"
        {...props}
      />
      {/* Right thigh */}
      <path
        d="M 128,222 L 142,238 L 144,288 L 143,330 C 143,337 137,343 129,343 L 109,343 C 101,343 97,337 97,330 L 97,238 L 99,222 Z"
        {...props}
      />
      {/* Left shin */}
      <path
        d="M 71,343 L 64,360 L 63,400 L 64,432 C 64,440 69,445 77,445 L 88,445 C 96,445 100,440 100,432 L 100,360 L 91,343 Z"
        {...props}
      />
      {/* Right shin */}
      <path
        d="M 129,343 L 136,360 L 137,400 L 136,432 C 136,440 131,445 123,445 L 112,445 C 104,445 100,440 100,432 L 100,360 L 109,343 Z"
        {...props}
      />
      {/* Left foot */}
      <ellipse cx="80" cy="458" rx="17" ry="11" {...props} />
      {/* Right foot */}
      <ellipse cx="120" cy="458" rx="17" ry="11" {...props} />
    </g>
  )
}

// All muscle region paths — keyed by region ID
const MUSCLE_PATHS: Record<string, React.ReactNode> = {
  // FRONT VIEW — lower body
  'region-quadriceps-l': <path key="qL" d="M 74,232 L 62,244 L 60,290 L 61,330 C 61,337 67,341 74,341 L 89,341 C 96,341 101,337 101,330 L 101,244 L 95,232 Z" />,
  'region-quadriceps-r': <path key="qR" d="M 126,232 L 101,244 L 101,330 C 101,337 104,341 111,341 L 126,341 C 133,341 139,337 139,330 L 140,290 L 138,244 Z" />,
  'region-adductors-l':  <path key="adL" d="M 88,234 L 100,240 L 100,330 L 91,340 L 82,330 L 82,240 Z" />,
  'region-adductors-r':  <path key="adR" d="M 112,234 L 100,240 L 100,330 L 109,340 L 118,330 L 118,240 Z" />,
  'region-it-band-l':    <path key="itL" d="M 60,244 L 55,300 L 56,335 L 66,342 L 68,310 L 65,250 Z" />,
  'region-it-band-r':    <path key="itR" d="M 140,244 L 145,300 L 144,335 L 134,342 L 132,310 L 135,250 Z" />,
  'region-abductors-l':  <path key="abL" d="M 58,202 L 52,220 L 54,238 L 66,242 L 72,228 L 72,208 Z" />,
  'region-abductors-r':  <path key="abR" d="M 142,202 L 148,220 L 146,238 L 134,242 L 128,228 L 128,208 Z" />,
  'region-tibialis-l':   <rect key="tibL" x="63" y="354" width="16" height="76" rx="7" />,
  'region-tibialis-r':   <rect key="tibR" x="121" y="354" width="16" height="76" rx="7" />,
  'region-ankle-l':      <ellipse key="ankL" cx="69" cy="440" rx="9" ry="7" />,
  'region-ankle-r':      <ellipse key="ankR" cx="131" cy="440" rx="9" ry="7" />,
  // FRONT VIEW — hip/core
  'region-psoas':        <path key="psoas" d="M 76,202 L 82,220 L 100,224 L 118,220 L 124,202 C 118,193 110,189 100,189 C 90,189 82,193 76,202 Z" />,
  'region-iliacus-l':    <path key="ilL" d="M 62,200 L 72,222 L 100,222 L 100,197 C 90,193 72,196 62,200 Z" />,
  'region-iliacus-r':    <path key="ilR" d="M 138,200 L 128,222 L 100,222 L 100,197 C 110,193 128,196 138,200 Z" />,
  // FRONT VIEW — upper body
  'region-pecs-l':       <path key="pecL" d="M 68,90 L 100,100 L 100,152 L 66,154 C 50,150 40,140 40,126 C 40,110 52,93 68,90 Z" />,
  'region-pecs-r':       <path key="pecR" d="M 132,90 L 100,100 L 100,152 L 134,154 C 150,150 160,140 160,126 C 160,110 148,93 132,90 Z" />,
  'region-ant-delt-l':   <path key="adeltL" d="M 38,86 L 27,106 L 33,120 L 44,114 L 46,94 Z" />,
  'region-ant-delt-r':   <path key="adeltR" d="M 162,86 L 173,106 L 167,120 L 156,114 L 154,94 Z" />,
  'region-obliques-l':   <path key="oblL" d="M 30,140 L 27,178 L 40,208 L 50,216 L 50,198 L 40,176 L 38,145 Z" />,
  'region-obliques-r':   <path key="oblR" d="M 170,140 L 173,178 L 160,208 L 150,216 L 150,198 L 160,176 L 162,145 Z" />,
  'region-intercostals-l': <path key="icL" d="M 42,100 L 38,116 L 37,148 L 46,158 L 62,150 L 64,120 L 58,100 Z" />,
  'region-intercostals-r': <path key="icR" d="M 158,100 L 162,116 L 163,148 L 154,158 L 138,150 L 136,120 L 142,100 Z" />,
  'region-diaphragm':    <path key="diaph" d="M 42,154 L 42,168 L 100,172 L 158,168 L 158,154 L 100,158 Z" />,
  'region-forearm-l':    <path key="faL" d="M 16,188 L 12,215 L 12,246 L 18,256 L 28,250 L 30,220 L 24,192 Z" />,
  'region-forearm-r':    <path key="faR" d="M 184,188 L 188,215 L 188,246 L 182,256 L 172,250 L 170,220 L 176,192 Z" />,

  // BACK VIEW — lower body
  'region-hamstrings-l': <path key="hamL" d="M 74,232 L 62,244 L 60,290 L 61,330 C 61,337 67,341 74,341 L 89,341 C 96,341 101,337 101,330 L 101,244 L 95,232 Z" />,
  'region-hamstrings-r': <path key="hamR" d="M 126,232 L 101,244 L 101,330 C 101,337 104,341 111,341 L 126,341 C 133,341 139,337 139,330 L 140,290 L 138,244 Z" />,
  'region-glutes':       <path key="glutes" d="M 60,208 C 55,220 54,234 58,244 C 62,254 72,260 82,258 L 100,254 L 118,258 C 128,260 138,254 142,244 C 146,234 145,220 140,208 Z" />,
  'region-calves-l':     <path key="cavL" d="M 64,354 L 60,390 L 62,422 C 62,432 68,437 76,436 L 87,435 C 94,434 100,428 100,422 L 100,390 L 95,354 Z" />,
  'region-calves-r':     <path key="cavR" d="M 136,354 L 140,390 L 138,422 C 138,432 132,437 124,436 L 113,435 C 106,434 100,428 100,422 L 100,390 L 105,354 Z" />,
  'region-achilles-l':   <rect key="achL" x="72" y="432" width="14" height="16" rx="5" />,
  'region-achilles-r':   <rect key="achR" x="114" y="432" width="14" height="16" rx="5" />,
  'region-plantar-l':    <ellipse key="planL" cx="80" cy="463" rx="14" ry="7" />,
  'region-plantar-r':    <ellipse key="planR" cx="120" cy="463" rx="14" ry="7" />,
  'region-piriformis-l': <path key="pirL" d="M 68,214 L 60,226 L 66,238 L 80,234 L 86,222 L 82,212 Z" />,
  'region-piriformis-r': <path key="pirR" d="M 132,214 L 140,226 L 134,238 L 120,234 L 114,222 L 118,212 Z" />,
  // BACK VIEW — spine/upper body
  'region-lumbar':       <rect key="lumb" x="88" y="176" width="24" height="34" rx="7" />,
  'region-thoracic':     <rect key="thor" x="86" y="110" width="28" height="66" rx="6" />,
  'region-cervical':     <rect key="cerv" x="90" y="70" width="20" height="22" rx="5" />,
  'region-erectors-l':   <rect key="erL" x="87" y="96" width="11" height="108" rx="4" />,
  'region-erectors-r':   <rect key="erR" x="102" y="96" width="11" height="108" rx="4" />,
  'region-lats-l':       <path key="latL" d="M 44,92 L 34,112 L 32,148 L 35,188 L 46,202 L 58,196 L 64,170 L 58,132 L 52,108 Z" />,
  'region-lats-r':       <path key="latR" d="M 156,92 L 166,112 L 168,148 L 165,188 L 154,202 L 142,196 L 136,170 L 142,132 L 148,108 Z" />,
  'region-rhomboids':    <path key="rhom" d="M 82,98 L 80,108 L 80,136 L 100,142 L 120,136 L 120,108 L 118,98 L 100,104 Z" />,
  'region-trapezius':    <path key="trap" d="M 88,72 L 64,88 L 48,98 L 52,110 L 82,104 L 100,98 L 118,104 L 148,110 L 152,98 L 136,88 L 112,72 L 100,68 Z" />,
  'region-post-delt-l':  <path key="pdeltL" d="M 38,86 L 26,108 L 32,122 L 43,116 L 46,96 Z" />,
  'region-post-delt-r':  <path key="pdeltR" d="M 162,86 L 174,108 L 168,122 L 157,116 L 154,96 Z" />,
  'region-sacrum':       <ellipse key="sacrum" cx="100" cy="214" rx="14" ry="10" />,
}

export default function BodySvg({
  view,
  activeTab,
  activeRegions,
  deepRegions,
  activeJoints,
  activeMeridians,
  activeChakras,
  element,
}: BodySvgProps) {
  const showMuscles   = activeTab === 'muscles'
  const showMeridians = activeTab === 'meridians'
  const showJoints    = activeTab === 'joints'
  const showChakras   = activeTab === 'chakras'

  return (
    <svg
      viewBox="0 0 200 500"
      className="w-full h-auto max-h-[480px]"
      aria-label={`Body diagram — ${view} view, showing ${activeTab}`}
    >
      <defs>
        <radialGradient id="chakra-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Layer 1: body silhouette */}
      <BodySilhouette />

      {/* Layer 2: muscle regions */}
      {showMuscles && Object.entries(MUSCLE_PATHS).map(([id, pathNode]) => {
        const isActive = activeRegions.has(id)
        const isDeep   = deepRegions.has(id)
        if (!isActive) return null
        return (
          <g
            key={id}
            fill={isDeep ? 'none' : '#818cf8'}
            stroke={isDeep ? '#818cf8' : 'none'}
            strokeWidth={isDeep ? 1.5 : 0}
            strokeDasharray={isDeep ? '3 2' : undefined}
            opacity={isDeep ? 0.7 : 0.5}
            style={{ transition: 'opacity var(--duration-base) var(--ease-standard)' }}
          >
            {pathNode}
          </g>
        )
      })}

      {/* Layer 3: meridian lines */}
      {showMeridians && activeMeridians.map(slug => {
        const paths = MERIDIAN_PATH_MAP[slug] ?? []
        return paths
          .filter(p => p.view === view || p.view === 'both')
          .map((p, i) => (
            <path
              key={`${slug}-${i}`}
              d={p.d}
              fill="none"
              stroke={ELEMENT_COLORS[p.element]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
              style={{ transition: 'opacity var(--duration-base) var(--ease-standard)' }}
            />
          ))
      })}

      {/* Layer 4: joint dots */}
      {showJoints && activeJoints.map(({ cx, cy }, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="5"
          fill="#475569"
          opacity={0.8}
          style={{ transition: 'opacity var(--duration-base) var(--ease-standard)' }}
        />
      ))}

      {/* Layer 5: chakra dots */}
      {showChakras && CHAKRA_DOTS.map(dot => {
        const isActive = activeChakras.includes(dot.name)
        return (
          <g key={dot.name} style={{ transition: 'opacity var(--duration-base) var(--ease-standard)' }} opacity={isActive ? 1 : 0.15}>
            <circle
              cx={dot.cx}
              cy={dot.cy}
              r="10"
              fill={dot.color}
              opacity={0.25}
              filter="url(#glow)"
            />
            <circle
              cx={dot.cx}
              cy={dot.cy}
              r="5"
              fill={dot.color}
              opacity={0.9}
            />
          </g>
        )
      })}
    </svg>
  )
}

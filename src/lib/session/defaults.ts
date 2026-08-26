import type { SessionContext } from '@/lib/pipeline/types'
import type { Style, Season, ExperienceLevel, IntensityCurve } from '@/lib/pose-types'

// Maps style to preferred season default when teacher has not specified
const STYLE_DEFAULT_SEASON: Record<Style, Season> = {
  yin: 'winter',
  restorative: 'winter',
  vinyasa: 'spring',
  ashtanga: 'summer',
}

// Maps style to default intensity curve
const STYLE_DEFAULT_CURVE: Record<Style, IntensityCurve> = {
  yin: 'plateau',
  restorative: 'plateau',
  vinyasa: 'bell',
  ashtanga: 'bell',
}

// Maps style to default duration
const STYLE_DEFAULT_DURATION: Record<Style, number> = {
  yin: 75,
  restorative: 60,
  vinyasa: 60,
  ashtanga: 90,
}

export function resolveDefaults(partial: Partial<SessionContext>): SessionContext {
  const style = partial.style ?? 'yin'
  const experienceLevel: ExperienceLevel = partial.experienceLevel ?? 'mixed'
  const season = partial.season ?? STYLE_DEFAULT_SEASON[style]
  const intensityCurve = partial.intensityCurve ?? STYLE_DEFAULT_CURVE[style]
  const durationMinutes = partial.durationMinutes ?? STYLE_DEFAULT_DURATION[style]

  return {
    style,
    experienceLevel,
    season,
    intensityCurve,
    durationMinutes,
    timeOfDay: partial.timeOfDay,
    ageRange: partial.ageRange,
    fitnessLevel: partial.fitnessLevel,
    numberOfStudents: partial.numberOfStudents,
    roomTemperature: partial.roomTemperature,
    classFormat: partial.classFormat,
    targetSystem: partial.targetSystem,
    meridianFocus: partial.meridianFocus,
    elementFocus: partial.elementFocus,
    doshaEmphasis: partial.doshaEmphasis,
    goal: partial.goal,
    theme: partial.theme,
    poseComplexity: partial.poseComplexity,
    yinYangBalance: partial.yinYangBalance,
    density: partial.density,
    hardConstraints: partial.hardConstraints ?? {
      contraindications: [],
      propsAvailable: ['mat', 'blanket', 'block', 'strap', 'bolster'],
    },
  }
}

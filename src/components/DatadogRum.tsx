'use client'

import { useEffect } from 'react'
import { datadogRum } from '@datadog/browser-rum'

export function DatadogRum() {
  useEffect(() => {
    const applicationId = process.env.NEXT_PUBLIC_DATADOG_APP_ID
    const clientToken = process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN
    if (!applicationId || !clientToken || datadogRum.getInternalContext()) return

    datadogRum.init({
      applicationId,
      clientToken,
      site: process.env.NEXT_PUBLIC_DATADOG_SITE ?? 'datadoghq.com',
      service: 'yogakit',
      env: process.env.NEXT_PUBLIC_DATADOG_ENV ?? 'production',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 0,
      trackUserInteractions: false,
      trackResources: false,
      trackLongTasks: false,
      defaultPrivacyLevel: 'mask',
    })
  }, [])

  return null
}

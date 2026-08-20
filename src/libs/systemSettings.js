import 'server-only'

import { DEFAULT_BRANDING, SYSTEM_SETTING_ID } from '@/configs/branding'
import { prisma } from '@/libs/prisma'

export const getBrandingSettings = async () => {
  try {
    const settings = await prisma.systemsetting.findUnique({
      where: { id: SYSTEM_SETTING_ID },
      select: {
        lightLogoUrl: true,
        darkLogoUrl: true,
        faviconUrl: true
      }
    })

    if (!settings) return DEFAULT_BRANDING

    return settings
  } catch {
    return DEFAULT_BRANDING
  }
}

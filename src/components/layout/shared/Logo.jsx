'use client'

// MUI Imports
import { useColorScheme } from '@mui/material/styles'

// Context Imports
import { useBranding } from '@/contexts/BrandingProvider'

const Logo = () => {
  const { mode } = useColorScheme()
  const { lightLogoUrl, darkLogoUrl } = useBranding()
  const isDarkMode = mode === 'dark'

  return (
    <span
      className='brand-logo-container flex items-center'
      data-active-mode={isDarkMode ? 'dark' : 'light'}
      suppressHydrationWarning
    >
      {lightLogoUrl && (
        <img className='brand-logo brand-logo-light' src={lightLogoUrl} alt='Company logo' draggable={false} />
      )}
      {darkLogoUrl && (
        <img className='brand-logo brand-logo-dark' src={darkLogoUrl} alt='Company logo' draggable={false} />
      )}
    </span>
  )
}

export default Logo

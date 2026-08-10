'use client'

// React Imports
import { createContext, useContext } from 'react'

// Config Imports
import { DEFAULT_BRANDING } from '@/configs/branding'

const BrandingContext = createContext(DEFAULT_BRANDING)

export const BrandingProvider = ({ branding, children }) => (
  <BrandingContext.Provider value={branding || DEFAULT_BRANDING}>{children}</BrandingContext.Provider>
)

export const useBranding = () => useContext(BrandingContext)

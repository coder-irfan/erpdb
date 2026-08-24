'use client'

import { useEffect, useMemo, useState } from 'react'

const normalizeAssetPath = value => {
  const source = String(value || '').trim()

  if (!source) return null
  if (/^(?:data:image\/|https?:\/\/|blob:)/i.test(source)) return source

  return source.startsWith('/') ? source : `/${source.replace(/^\.\//, '')}`
}

const PrintLogo = ({ setup, companyName }) => {
  const sources = useMemo(
    () => [...new Set([setup?.company_logo, setup?.print_logo, setup?.lightLogoUrl].map(normalizeAssetPath).filter(Boolean))],
    [setup?.company_logo, setup?.lightLogoUrl, setup?.print_logo]
  )

  const [sourceIndex, setSourceIndex] = useState(0)

  useEffect(() => setSourceIndex(0), [sources])

  const source = sources[sourceIndex]

  if (!source) return <span className='text-lg font-bold tracking-wide text-gray-800'>{companyName}</span>

  return (
    <img
      src={source}
      alt={companyName}
      decoding='sync'
      fetchPriority='high'
      loading='eager'
      className='max-h-10 w-auto max-w-40 object-contain object-left'
      onError={() => setSourceIndex(index => index + 1)}
    />
  )
}

export default PrintLogo

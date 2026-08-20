'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import MuiBreadcrumbs from '@mui/material/Breadcrumbs'

const LOCALES = new Set(['en', 'fa', 'ps'])

const formatSegment = segment =>
  decodeURIComponent(segment)
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())

const Breadcrumbs = () => {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const locale = LOCALES.has(segments[0]) ? segments.shift() : 'en'

  if (segments[0] === 'dashboard') segments.shift()

  if (segments.at(-1) === 'print') return null
  if (segments.length === 0) return null

  return (
    <MuiBreadcrumbs
      separator={<span aria-hidden='true'>/</span>}
      aria-label='Breadcrumb'
      className='mb-4 text-xs text-muted-foreground text-textSecondary md:text-sm'
    >
      <Link href={`/${locale}/dashboard`} className='inline-flex items-center gap-1 text-inherit hover:text-primary'>
        <i className='tabler-home text-base' aria-hidden='true' />
        <span>Dashboard</span>
      </Link>
      {segments.map((segment, index) => {
        const isActive = index === segments.length - 1
        const key = segments.slice(0, index + 1).join('/')
        const label = formatSegment(segment)

        return isActive ? (
          <span key={key} className='font-semibold text-foreground text-textPrimary' aria-current='page'>
            {label}
          </span>
        ) : (
          <span key={key} className='text-muted-foreground text-textSecondary'>
            {label}
          </span>
        )
      })}
    </MuiBreadcrumbs>
  )
}

export default Breadcrumbs

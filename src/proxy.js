// Next Imports
import { NextResponse } from 'next/server'

// Third-party Imports
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

// Config Imports
import { i18n } from '@/configs/i18n'

const getPreferredLocale = request => {
  const acceptLanguage = request.headers.get('accept-language') || ''

  try {
    const languages = new Negotiator({ headers: { 'accept-language': acceptLanguage } }).languages()

    return match(languages, i18n.locales, i18n.defaultLocale)
  } catch {
    return i18n.defaultLocale
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl
  const segments = pathname.split('/').filter(Boolean)
  const leadingLocales = []

  while (i18n.locales.includes(segments[0])) {
    leadingLocales.push(segments.shift())
  }

  if (leadingLocales.length > 1) {
    const normalizedUrl = request.nextUrl.clone()
    const activeLocale = leadingLocales.at(-1)

    normalizedUrl.pathname = `/${[activeLocale, ...segments].join('/')}`

    return NextResponse.redirect(normalizedUrl)
  }

  if (leadingLocales.length === 1) {
    return NextResponse.next()
  }

  const localizedUrl = request.nextUrl.clone()
  const locale = getPreferredLocale(request)

  localizedUrl.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`

  return NextResponse.redirect(localizedUrl)
}

export const config = {
  matcher: [
    '/((?!api|front-pages|images|uploads|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'
  ]
}

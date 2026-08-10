// Next Imports
import { NextResponse } from 'next/server'

// Third-party Imports
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { getToken } from 'next-auth/jwt'

// Config Imports
import { i18n } from '@/configs/i18n'

const publicRoutes = new Set(['/login', '/forgot-password', '/reset-password', '/auth/accept-invite'])

const getPreferredLocale = request => {
  const acceptLanguage = request.headers.get('accept-language') || ''

  try {
    const languages = new Negotiator({ headers: { 'accept-language': acceptLanguage } }).languages()

    return match(languages, i18n.locales, i18n.defaultLocale)
  } catch {
    return i18n.defaultLocale
  }
}

const getActiveToken = async request => {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    return token?.accountStatus === 'ACTIVE' ? token : null
  } catch {
    return null
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    const token = await getActiveToken(request)

    return token ? NextResponse.next() : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    const routePath = `/${segments.join('/')}`

    if (publicRoutes.has(routePath)) {
      return NextResponse.next()
    }

    const token = await getActiveToken(request)

    if (token) {
      return NextResponse.next()
    }

    const loginUrl = request.nextUrl.clone()

    loginUrl.pathname = `/${leadingLocales[0]}/login`
    loginUrl.search = ''
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`)

    return NextResponse.redirect(loginUrl)
  }

  const localizedUrl = request.nextUrl.clone()
  const locale = getPreferredLocale(request)

  localizedUrl.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`

  return NextResponse.redirect(localizedUrl)
}

export const config = {
  matcher: ['/((?!front-pages|images|uploads|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)']
}

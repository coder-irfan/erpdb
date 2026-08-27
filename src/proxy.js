// Next Imports
import { NextResponse } from 'next/server'

// Third-party Imports
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { getToken } from 'next-auth/jwt'

// Config Imports
import { i18n } from '@/configs/i18n'

const publicRoutes = new Set(['/login', '/forgot-password', '/reset-password', '/auth/accept-invite'])

const routeMatches = (routePath, basePath) => routePath === basePath || routePath.startsWith(`${basePath}/`)

const routePermissionRules = [
  {
    matches: routePath =>
      routeMatches(routePath, '/setup/audit-logs') ||
      routeMatches(routePath, '/options/audit-logs') ||
      routeMatches(routePath, '/settings/audit-logs'),
    permissions: ['audit:read']
  },
  {
    matches: routePath => routeMatches(routePath, '/setup/roles') || routeMatches(routePath, '/settings/roles'),
    permissions: ['settings_roles:manage']
  },
  { matches: routePath => routeMatches(routePath, '/setup'), permissions: ['setup:manage', 'settings:manage'] },
  {
    matches: routePath => routeMatches(routePath, '/options/finance-management/inventory'),
    permissions: ['finance_inventory:read']
  },
  { matches: routePath => routeMatches(routePath, '/options/hrm/leave-types'), permissions: ['hrm_leave:read'] },
  { matches: routePath => routeMatches(routePath, '/options'), permissions: ['options:read'] },
  { matches: routePath => routeMatches(routePath, '/finance/inventory'), permissions: ['finance_inventory:read'] },
  { matches: routePath => routeMatches(routePath, '/finance/loans'), permissions: ['finance_loan:read'] },
  { matches: routePath => routeMatches(routePath, '/finance/reports'), permissions: ['finance_reports:read'] },
  { matches: routePath => routeMatches(routePath, '/finance'), permissions: ['finance:read'] },
  {
    matches: routePath => routeMatches(routePath, '/hrm/staff') || routeMatches(routePath, '/hrm/staff-list'),
    permissions: ['hrm_staff:read']
  },
  { matches: routePath => routeMatches(routePath, '/hrm/contracts'), permissions: ['hrm_contract:read'] },
  { matches: routePath => routeMatches(routePath, '/hrm/leaves'), permissions: ['hrm_leave:read'] },
  { matches: routePath => routeMatches(routePath, '/hrm/timesheets'), permissions: ['hrm_timesheet:read'] },
  {
    matches: routePath => routeMatches(routePath, '/hrm/payroll'),
    permissions: ['hrm_payroll:read', 'finance_salary:read']
  },
  { matches: routePath => routeMatches(routePath, '/hrm/reports'), permissions: ['hrm_reports:read'] },
  { matches: routePath => routeMatches(routePath, '/projects'), permissions: ['projects:read'] },
  { matches: routePath => routeMatches(routePath, '/tasks'), permissions: ['tasks:read', 'tasks:read_assigned'] },
  { matches: routePath => routeMatches(routePath, '/crm/leads'), permissions: ['crm_lead:read'] },
  { matches: routePath => routeMatches(routePath, '/crm/clients'), permissions: ['crm_client:read'] },
  { matches: routePath => routeMatches(routePath, '/crm/visitors'), permissions: ['crm_visitor:read'] },
  {
    matches: routePath => routeMatches(routePath, '/contracts') || routeMatches(routePath, '/contract'),
    permissions: ['contracts:read']
  },
  { matches: routePath => routeMatches(routePath, '/dashboard'), permissions: ['dashboard:read'] }
]

const hasPermission = (permissions, permission) => {
  if (permissions.includes(permission)) return true

  const [resource, action] = permission.split(':')
  const moduleName = resource?.split('_')[0]
  const globalPermission = moduleName && action ? `${moduleName}:${action}` : null

  return Boolean(globalPermission && permissions.includes(globalPermission))
}

export const isRouteAuthorized = (routePath, token) => {
  const rule = routePermissionRules.find(candidate => candidate.matches(routePath))

  if (!rule || token?.roles?.includes('super_admin')) return true

  const permissions = Array.isArray(token?.permissions) ? token.permissions : []

  return rule.permissions.some(permission => hasPermission(permissions, permission))
}

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
      if (!isRouteAuthorized(routePath, token)) {
        const forbiddenUrl = request.nextUrl.clone()

        forbiddenUrl.pathname = `/${leadingLocales[0]}/403`
        forbiddenUrl.search = ''

        return NextResponse.rewrite(forbiddenUrl, { status: 403 })
      }

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

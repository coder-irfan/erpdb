import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { runContractExpirationAuditCore } from '@/libs/contractExpirationAudit'

export const dynamic = 'force-dynamic'

const isAuthorized = request => {
  const configuredSecret = process.env.CRON_SECRET

  if (!configuredSecret) return false

  const authorization = request.headers.get('authorization') || ''
  const headerSecret = request.headers.get('x-cron-secret')
  const suppliedSecret = authorization.startsWith('Bearer ') ? authorization.slice(7) : headerSecret

  if (!suppliedSecret) return false

  const expected = Buffer.from(configuredSecret)
  const received = Buffer.from(suppliedSecret)

  return expected.length === received.length && timingSafeEqual(expected, received)
}

const runAudit = async request => {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron request.' }, { status: 401 })
  }

  try {
    const data = await runContractExpirationAuditCore()

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ success: false, error: 'Contract expiration audit failed.' }, { status: 500 })
  }
}

export const GET = runAudit
export const POST = runAudit

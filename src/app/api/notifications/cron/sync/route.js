import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { syncActionableNotifications } from '@/libs/actionableNotifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

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

const sync = async request => {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron request.' }, { status: 401 })
  }

  try {
    const generated = await syncActionableNotifications()

    return NextResponse.json({ success: true, generated, executedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ success: false, error: 'Notification synchronization failed.' }, { status: 500 })
  }
}

export const GET = sync
export const POST = sync

import 'server-only'

import { getCompanySetupRecord } from '@/libs/companySetup'
import { sendContractExpirationEmail } from '@/libs/mailer'
import { prisma } from '@/libs/prisma'
import { toUtcDateOnly } from '@/utils/contractDuration'

const REMINDERS = [
  { days: 30, type: '30_DAY' },
  { days: 15, type: '15_DAY' },
  { days: 3, type: '3_DAY' }
]

const getTargetRange = (now, days) => {
  const start = toUtcDateOnly(now)

  start.setUTCDate(start.getUTCDate() + days)

  const end = new Date(start)

  end.setUTCDate(end.getUTCDate() + 1)

  return { start, end }
}

export const runContractExpirationAuditCore = async ({ locale = 'en', initiatedBy = null, now = new Date() } = {}) => {
  const ranges = REMINDERS.map(reminder => ({ ...reminder, ...getTargetRange(now, reminder.days) }))

  const [contracts, setup] = await Promise.all([
    prisma.contract.findMany({
      where: {
        status: { is: { value: 'ACTIVE' } },
        OR: ranges.map(range => ({ end_date: { gte: range.start, lt: range.end } }))
      },
      select: {
        id: true,
        contract_number: true,
        title: true,
        end_date: true,
        client: { select: { company_name: true, primary_contact_name: true, email: true } }
      }
    }),
    getCompanySetupRecord()
  ])

  const result = { checked: contracts.length, sent: 0, skipped: 0, failed: 0, locale }

  for (const contract of contracts) {
    const reminder = ranges.find(range => contract.end_date >= range.start && contract.end_date < range.end)

    if (!reminder) continue

    const existing = await prisma.contractNotification.findFirst({
      where: { contract_id: contract.id, reminder_type: reminder.type },
      select: { id: true }
    })

    if (existing) {
      result.skipped += 1
      continue
    }

    try {
      await sendContractExpirationEmail({
        toEmail: contract.client.email,
        clientName: contract.client.primary_contact_name || contract.client.company_name,
        contractNumber: contract.contract_number,
        contractTitle: contract.title,
        endDate: contract.end_date,
        remainingDays: reminder.days,
        companyName: setup.company_name
      })

      await prisma.contractNotification.create({
        data: {
          contract_id: contract.id,
          reminder_type: reminder.type,
          recipient_email: contract.client.email,
          status: 'SENT'
        }
      })
      result.sent += 1
    } catch (error) {
      if (error?.code === 'P2002') result.skipped += 1
      else result.failed += 1
    }
  }

  await prisma.auditLog.create({
    data: {
      user_id: initiatedBy,
      action: 'CONTRACT_EXPIRATION_AUDIT_RUN',
      module: 'CONTRACTS',
      details: result
    }
  })

  return result
}

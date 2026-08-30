import 'server-only'

import { getCompanySetupRecord } from '@/libs/companySetup'
import { sendContractExpirationEmail, sendContractRenewalReviewEmail } from '@/libs/mailer'
import { prisma } from '@/libs/prisma'
import { getRemainingDays, toUtcDateOnly } from '@/utils/contractDuration'

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

const getRecipients = contract => {
  const accountManager = contract.account_manager || contract.client?.account_manager

  const externalParty = contract.vendor
    ? {
        email: contract.vendor.email,
        name: contract.vendor.contact_name || contract.vendor.company_name,
        role: 'VENDOR'
      }
    : contract.client?.email
      ? {
          email: contract.client.email,
          name: contract.client.primary_contact_name || contract.client.company_name,
          role: 'CLIENT'
        }
      : null

  const recipients = [
    externalParty,
    accountManager?.email
      ? {
          email: accountManager.email,
          name: `${accountManager.first_name} ${accountManager.last_name}`.trim(),
          role: 'ACCOUNT_MANAGER'
        }
      : null
  ].filter(Boolean)

  return [
    ...new Map(
      recipients
        .filter(recipient => recipient.email && !recipient.email.toLowerCase().endsWith('.invalid'))
        .map(recipient => [recipient.email.toLowerCase(), recipient])
    ).values()
  ]
}

const expireEndedContracts = async ({ today, expiredStatusId, initiatedBy }) => {
  const contracts = await prisma.contract.findMany({
    where: {
      auto_renew: false,
      end_date: { lt: today },
      status: { is: { value: 'ACTIVE' } }
    },
    select: { id: true, contract_number: true, end_date: true }
  })

  let expired = 0

  for (const contract of contracts) {
    const didExpire = await prisma.$transaction(async transaction => {
      const update = await transaction.contract.updateMany({
        where: { id: contract.id, status: { is: { value: 'ACTIVE' } }, auto_renew: false, end_date: { lt: today } },
        data: { status_id: expiredStatusId, renewal_status: 'EXPIRED' }
      })

      if (update.count === 0) return false

      await transaction.auditlog.create({
        data: {
          user_id: initiatedBy,
          action: 'CONTRACT_EXPIRED',
          module: 'CONTRACTS',
          details: {
            contractId: contract.id,
            contractNumber: contract.contract_number,
            endDate: contract.end_date.toISOString(),
            source: 'DAILY_CONTRACT_CRON'
          }
        }
      })

      return true
    })

    if (didExpire) expired += 1
  }

  return expired
}

const dispatchNotification = async ({ contract, recipient, reminderType, send, result }) => {
  const existing = await prisma.contractnotification.findFirst({
    where: {
      contract_id: contract.id,
      reminder_type: reminderType,
      recipient_email: recipient.email
    },
    select: { id: true }
  })

  if (existing) {
    result.skipped += 1

    return false
  }

  try {
    await send()
    await prisma.contractnotification.create({
      data: {
        contract_id: contract.id,
        reminder_type: reminderType,
        recipient_email: recipient.email,
        status: 'SENT'
      }
    })
    result.sent += 1

    return true
  } catch {
    result.failed += 1

    return false
  }
}

export const runContractExpirationAuditCore = async ({ locale = 'en', initiatedBy = null, now = new Date() } = {}) => {
  const today = toUtcDateOnly(now)
  const ranges = REMINDERS.map(reminder => ({ ...reminder, ...getTargetRange(now, reminder.days) }))

  const [expiredStatus, setup] = await Promise.all([
    prisma.option.findFirst({
      where: { category: 'CONTRACT_STATUS', value: 'EXPIRED', is_active: true },
      select: { id: true }
    }),
    getCompanySetupRecord()
  ])

  if (!expiredStatus) throw new Error('The active EXPIRED contract status is not configured.')

  const expired = await expireEndedContracts({ today, expiredStatusId: expiredStatus.id, initiatedBy })

  const contracts = await prisma.contract.findMany({
    where: {
      status: { is: { value: 'ACTIVE' } },
      OR: [
        { auto_renew: true },
        ...ranges.map(range => ({ end_date: { gte: range.start, lt: range.end } }))
      ]
    },
    select: {
      id: true,
      contract_number: true,
      title: true,
      end_date: true,
      auto_renew: true,
      renewal_status: true,
      client: {
        select: {
          company_name: true,
          primary_contact_name: true,
          email: true,
          account_manager: { select: { first_name: true, last_name: true, email: true } }
        }
      },
      vendor: {
        select: { company_name: true, contact_name: true, email: true }
      },
      account_manager: { select: { first_name: true, last_name: true, email: true } }
    }
  })

  const result = {
    checked: contracts.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    expired,
    renewalReviews: 0,
    locale
  }

  for (const contract of contracts) {
    const remainingDays = getRemainingDays(contract.end_date, now)
    const recipients = getRecipients(contract)

    if (contract.auto_renew && remainingDays <= 30) {
      let reviewSent = false

      for (const recipient of recipients) {
        const sent = await dispatchNotification({
          contract,
          recipient,
          reminderType: 'RENEWAL_REVIEW',
          result,
          send: () =>
            sendContractRenewalReviewEmail({
              toEmail: recipient.email,
              recipientName: recipient.name,
              recipientRole: recipient.role,
              contractNumber: contract.contract_number,
              contractTitle: contract.title,
              endDate: contract.end_date,
              remainingDays,
              companyName: setup.company_name
            })
        })

        reviewSent ||= sent
      }

      if (reviewSent) {
        await prisma.$transaction([
          prisma.contract.update({ where: { id: contract.id }, data: { renewal_status: 'REVIEW_REQUIRED' } }),
          prisma.auditlog.create({
            data: {
              user_id: initiatedBy,
              action: 'RENEWAL_REVIEW',
              module: 'CONTRACTS',
              details: {
                contractId: contract.id,
                contractNumber: contract.contract_number,
                endDate: contract.end_date.toISOString(),
                remainingDays,
                recipientCount: recipients.length,
                source: 'DAILY_CONTRACT_CRON'
              }
            }
          })
        ])
        result.renewalReviews += 1
      }

      continue
    }

    const reminder = ranges.find(range => contract.end_date >= range.start && contract.end_date < range.end)

    if (!reminder) continue

    for (const recipient of recipients) {
      await dispatchNotification({
        contract,
        recipient,
        reminderType: reminder.type,
        result,
        send: () =>
          sendContractExpirationEmail({
            toEmail: recipient.email,
            clientName: recipient.name,
            contractNumber: contract.contract_number,
            contractTitle: contract.title,
            endDate: contract.end_date,
            remainingDays: reminder.days,
            companyName: setup.company_name
          })
      })
    }
  }

  await prisma.auditlog.create({
    data: {
      user_id: initiatedBy,
      action: 'CONTRACT_EXPIRATION_AUDIT_RUN',
      module: 'CONTRACTS',
      details: result
    }
  })

  return result
}

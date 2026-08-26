import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { ATTENDANCE_WRITE_PERMISSIONS, calculateHours, normalizeAttendanceInput, parseDate } from '@/libs/hrmTimesheets'
import { prisma } from '@/libs/prisma'
import { createTimesheetSchema, DATE_PATTERN } from '@/schemas/hrm/timesheets'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'

const MAX_BULK_RECORDS = 1_000
const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')

export async function POST(request) {
  const authorization = await authorizeAction(ATTENDANCE_WRITE_PERMISSIONS)
  let payload

  try {
    payload = await request.json()
  } catch {
    return responseError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const locale = localeFrom(payload?.locale)
  const dictionary = (await getDictionary(locale)).hrmTimesheets

  if (!authorization.authorized) {
    return responseError(
      authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden,
      authorization.code === 'UNAUTHENTICATED' ? 401 : 403,
      authorization.code
    )
  }

  if (!hasAnyPermission(authorization.session, ['hrm:write'])) {
    return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
  }

  const date = payload?.date

  if (!DATE_PATTERN.test(date || '') || !parseDate(date)) {
    return responseError(dictionary.validation.dateInvalid, 400, 'INVALID_DATE')
  }

  if (!Array.isArray(payload?.records) || payload.records.length === 0 || payload.records.length > MAX_BULK_RECORDS) {
    return responseError(dictionary.validation.invalidSubmission, 400, 'INVALID_BULK_RECORDS')
  }

  const staffIds = new Set()
  const records = []

  for (const item of payload.records) {
    const validation = safeParse(createTimesheetSchema(dictionary.validation), {
      staff_id: item?.staff_id,
      status: item?.status,
      date,
      check_in_time: item?.check_in_time || '',
      check_out_time: item?.check_out_time || '',
      notes: item?.notes || ''
    })

    if (!validation.success) {
      return responseError(
        validation.issues[0]?.message || dictionary.validation.invalidSubmission,
        400,
        'VALIDATION_ERROR'
      )
    }

    if (staffIds.has(validation.output.staff_id)) {
      return responseError(dictionary.validation.invalidSubmission, 400, 'DUPLICATE_STAFF')
    }

    const hours = calculateHours(date, validation.output.check_in_time, validation.output.check_out_time)

    if (Number.isNaN(hours)) {
      return responseError(dictionary.validation.checkoutBeforeCheckin, 400, 'INVALID_TIME_RANGE')
    }

    staffIds.add(validation.output.staff_id)
    records.push(validation.output)
  }

  try {
    const day = parseDate(date)
    const ids = [...staffIds]

    const [activeStaff, existing] = await Promise.all([
      prisma.hrmstaff.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, select: { id: true } }),
      prisma.hrmstafftimesheet.findMany({
        where: { date: day, staff_id: { in: ids } },
        select: { staff_id: true, leave_id: true }
      })
    ])

    if (activeStaff.length !== ids.length) {
      return responseError(dictionary.messages.staffNotFound, 404, 'STAFF_NOT_FOUND')
    }

    const existingByStaffId = new Map(existing.map(item => [item.staff_id, item]))
    const editableRecords = records.filter(item => !existingByStaffId.get(item.staff_id)?.leave_id)
    const createdCount = editableRecords.filter(item => !existingByStaffId.has(item.staff_id)).length

    const operations = editableRecords.map(item =>
      prisma.hrmstafftimesheet.upsert({
        where: { staff_id_date: { staff_id: item.staff_id, date: day } },
        create: {
          staff_id: item.staff_id,
          date: day,
          ...normalizeAttendanceInput(item, date)
        },
        update: normalizeAttendanceInput(item, date)
      })
    )

    operations.push(
      prisma.auditlog.create({
        data: {
          user_id: authorization.session.user.id,
          action: 'ATTENDANCE_BULK_SAVED',
          module: 'HRM',
          details: { date, requestedCount: records.length, savedCount: editableRecords.length, createdCount }
        }
      })
    )

    await prisma.$transaction(operations)

    return Response.json({
      success: true,
      data: { count: editableRecords.length, createdCount, lockedCount: records.length - editableRecords.length },
      message:
        dictionary.messages.bulkSaved?.replace('{count}', String(editableRecords.length)) ||
        `${editableRecords.length} attendance records saved.`
    })
  } catch {
    return responseError(dictionary.messages.operationFailed, 500, 'BULK_ATTENDANCE_FAILED')
  }
}

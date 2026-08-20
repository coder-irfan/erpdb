import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import {
  ATTENDANCE_DELETE_PERMISSIONS,
  ATTENDANCE_WRITE_PERMISSIONS,
  calculateHours,
  dateToString,
  normalizeAttendance,
  normalizeAttendanceInput,
  attendanceSelect
} from '@/libs/hrmTimesheets'
import { prisma } from '@/libs/prisma'
import { updateTimesheetSchema } from '@/schemas/hrm/timesheets'
import { getDictionary } from '@/utils/getDictionary'

const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')

export async function PUT(request, context) {
  const { id } = await context.params
  const authorization = await authorizeAction(ATTENDANCE_WRITE_PERMISSIONS)
  let payload

  try {
    payload = await request.json()
  } catch {
    return responseError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const dictionary = (await getDictionary(localeFrom(payload?.locale))).hrmTimesheets

  if (!authorization.authorized) {
    return responseError(
      authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden,
      authorization.code === 'UNAUTHENTICATED' ? 401 : 403,
      authorization.code
    )
  }

  const validation = safeParse(updateTimesheetSchema(dictionary.validation), {
    status: payload?.status,
    check_in_time: payload?.check_in_time || '',
    check_out_time: payload?.check_out_time || '',
    notes: payload?.notes || ''
  })

  if (!validation.success) return responseError(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    const existing = await prisma.hrmstafftimesheet.findUnique({ where: { id }, select: { id: true, date: true } })

    if (!existing) return responseError(dictionary.messages.notFound, 404, 'TIMESHEET_NOT_FOUND')

    const date = dateToString(existing.date)
    const hours = calculateHours(date, validation.output.check_in_time, validation.output.check_out_time)

    if (Number.isNaN(hours)) return responseError(dictionary.validation.checkoutBeforeCheckin, 400, 'INVALID_TIME_RANGE')

    const record = await prisma.$transaction(async transaction => {
      const updated = await transaction.hrmstafftimesheet.update({
        where: { id },
        data: normalizeAttendanceInput(validation.output, date),
        select: attendanceSelect
      })

      await transaction.auditlog.create({
        data: {
          user_id: authorization.session.user.id,
          action: 'ATTENDANCE_UPDATED',
          module: 'HRM',
          details: { timesheetId: id, staffId: updated.staff_id, date, status: updated.status }
        }
      })

      return updated
    })

    return Response.json({ success: true, data: normalizeAttendance(record), message: dictionary.messages.updated })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return responseError(dictionary.messages.notFound, 404, 'TIMESHEET_NOT_FOUND')
    }

    return responseError(dictionary.messages.operationFailed, 500, 'ATTENDANCE_UPDATE_FAILED')
  }
}

export async function DELETE(request, context) {
  const { id } = await context.params
  const authorization = await authorizeAction(ATTENDANCE_DELETE_PERMISSIONS)
  const dictionary = (await getDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))).hrmTimesheets

  if (!authorization.authorized) {
    return responseError(
      authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden,
      authorization.code === 'UNAUTHENTICATED' ? 401 : 403,
      authorization.code
    )
  }

  try {
    await prisma.$transaction(async transaction => {
      const deleted = await transaction.hrmstafftimesheet.delete({ where: { id }, select: { staff_id: true, date: true } })

      await transaction.auditlog.create({
        data: {
          user_id: authorization.session.user.id,
          action: 'ATTENDANCE_DELETED',
          module: 'HRM',
          details: { timesheetId: id, staffId: deleted.staff_id, date: dateToString(deleted.date) }
        }
      })
    })

    return Response.json({ success: true, message: dictionary.messages.deleted })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return responseError(dictionary.messages.notFound, 404, 'TIMESHEET_NOT_FOUND')
    }

    return responseError(dictionary.messages.operationFailed, 500, 'ATTENDANCE_DELETE_FAILED')
  }
}

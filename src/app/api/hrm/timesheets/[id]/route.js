import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import {
  ATTENDANCE_DELETE_PERMISSIONS,
  ATTENDANCE_WRITE_PERMISSIONS,
  calculateHours,
  dateToString,
  getAttendanceDateGuard,
  normalizeAttendance,
  normalizeAttendanceInput,
  attendanceSelect
} from '@/libs/hrmTimesheets'
import { getCurrentStaff } from '@/libs/hrmLeaves'
import { hasActiveStaffContract } from '@/libs/hrmContractAccess'
import { prisma } from '@/libs/prisma'
import { updateTimesheetSchema } from '@/schemas/hrm/timesheets'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission, hasAttendancePayrollOverrideRole } from '@/utils/rbac'

const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')

export async function PUT(request, context) {
  const { id } = await context.params
  const authorization = await authorizeAction()
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

  const canOverridePayrollLock = hasAttendancePayrollOverrideRole(authorization.session)

  if (!canOverridePayrollLock && !hasAnyPermission(authorization.session, ATTENDANCE_WRITE_PERMISSIONS)) {
    return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
  }

  const canManage = canOverridePayrollLock || hasAnyPermission(authorization.session, ['hrm:write'])
  const currentStaff = canManage ? null : await getCurrentStaff(authorization.session.user.id)

  if (!canManage && !currentStaff) return responseError(dictionary.messages.forbidden, 403, 'STAFF_PROFILE_REQUIRED')

  const validation = safeParse(updateTimesheetSchema(dictionary.validation), {
    status: payload?.status,
    check_in_time: payload?.check_in_time || '',
    check_out_time: payload?.check_out_time || '',
    notes: payload?.notes || ''
  })

  if (!validation.success) return responseError(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    const existing = await prisma.hrmstafftimesheet.findUnique({ where: { id }, select: { id: true, staff_id: true, date: true, leave_id: true } })

    if (!existing) return responseError(dictionary.messages.notFound, 404, 'TIMESHEET_NOT_FOUND')
    if (!canManage && existing.staff_id !== currentStaff.id) return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
    if (existing.leave_id) return responseError(dictionary.messages.forbidden, 409, 'APPROVED_LEAVE_LOCKED')

    const guard = await getAttendanceDateGuard(dateToString(existing.date))

    const payrollOverride =
      payload?.payrollOverride === true && canOverridePayrollLock

    if (guard.isFuture) return responseError(dictionary.messages.futureDateBlocked, 409, guard.code)
    if (guard.payrollLocked && !payrollOverride) return responseError(dictionary.messages.payrollLocked, 409, guard.code)

    if (!(await hasActiveStaffContract(prisma, { staffId: existing.staff_id, startDate: existing.date }))) {
      return responseError('Attendance is blocked outside an active contract period.', 409, 'CONTRACT_INACTIVE')
    }

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
          details: {
            timesheetId: id,
            staffId: updated.staff_id,
            date,
            status: updated.status,
            payrollOverride: guard.payrollLocked && payrollOverride
          }
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

  const canManage = hasAnyPermission(authorization.session, ['hrm:delete'])
  const currentStaff = canManage ? null : await getCurrentStaff(authorization.session.user.id)

  if (!canManage && !currentStaff) return responseError(dictionary.messages.forbidden, 403, 'STAFF_PROFILE_REQUIRED')

  try {
    const existing = await prisma.hrmstafftimesheet.findUnique({
      where: { id },
      select: { id: true, staff_id: true, date: true, leave_id: true }
    })

    if (!existing) return responseError(dictionary.messages.notFound, 404, 'TIMESHEET_NOT_FOUND')
    if (!canManage && existing.staff_id !== currentStaff.id) return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
    if (existing.leave_id) return responseError(dictionary.messages.forbidden, 409, 'APPROVED_LEAVE_LOCKED')

    const guard = await getAttendanceDateGuard(dateToString(existing.date))

    const payrollOverride =
      request.nextUrl.searchParams.get('payroll_override') === 'true' &&
      hasAttendancePayrollOverrideRole(authorization.session)

    if (guard.isFuture) return responseError(dictionary.messages.futureDateBlocked, 409, guard.code)
    if (guard.payrollLocked && !payrollOverride) return responseError(dictionary.messages.payrollLocked, 409, guard.code)

    await prisma.$transaction(async transaction => {
      const deleted = await transaction.hrmstafftimesheet.delete({ where: { id }, select: { staff_id: true, date: true } })

      await transaction.auditlog.create({
        data: {
          user_id: authorization.session.user.id,
          action: 'ATTENDANCE_DELETED',
          module: 'HRM',
          details: {
            timesheetId: id,
            staffId: deleted.staff_id,
            date: dateToString(deleted.date),
            payrollOverride: guard.payrollLocked && payrollOverride
          }
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

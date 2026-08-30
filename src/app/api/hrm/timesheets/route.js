import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import {
  ATTENDANCE_READ_PERMISSIONS,
  ATTENDANCE_WRITE_PERMISSIONS,
  calculateHours,
  getAttendanceDashboard,
  getAttendanceDateGuard,
  getKabulToday,
  normalizeAttendance,
  normalizeAttendanceInput,
  parseDate,
  resolveOpenProjectTimeTarget,
  attendanceSelect
} from '@/libs/hrmTimesheets'
import { getCurrentStaff } from '@/libs/hrmLeaves'
import { activeStaffContractRelation } from '@/libs/hrmContractAccess'
import { prisma } from '@/libs/prisma'
import { ATTENDANCE_STATUSES, createTimesheetSchema, DATE_PATTERN } from '@/schemas/hrm/timesheets'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission, hasAttendancePayrollOverrideRole } from '@/utils/rbac'

const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const MAX_PAGE_SIZE = 100

export async function GET(request) {
  const authorization = await authorizeAction(ATTENDANCE_READ_PERMISSIONS)
  const params = request.nextUrl.searchParams
  const locale = localeFrom(params.get('locale'))
  const dictionary = (await getDictionary(locale)).hrmTimesheets

  if (!authorization.authorized) {
    return responseError(
      authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden,
      authorization.code === 'UNAUTHENTICATED' ? 401 : 403,
      authorization.code
    )
  }

  const canManage = hasAnyPermission(authorization.session, ['hrm:read'])
  const currentStaff = canManage ? null : await getCurrentStaff(authorization.session.user.id)

  if (!canManage && !currentStaff) {
    return responseError(dictionary.messages.forbidden, 403, 'STAFF_PROFILE_REQUIRED')
  }

  const date = params.get('date') || getKabulToday()
  const monthValue = Number.parseInt(params.get('month'), 10)
  const yearValue = Number.parseInt(params.get('year'), 10)
  const month = Number.isInteger(monthValue) && monthValue >= 1 && monthValue <= 12 ? monthValue : null
  const year = Number.isInteger(yearValue) && yearValue >= 2000 && yearValue <= 2200 ? yearValue : null
  const staffId = params.get('staff_id')?.trim() || ''
  const status = ATTENDANCE_STATUSES.includes(params.get('status')) ? params.get('status') : ''
  const search = params.get('search')?.trim() || ''
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(params.get('limit') || '10', 10) || 10))

  if (!DATE_PATTERN.test(date) || !parseDate(date)) {
    return responseError(dictionary.validation.dateInvalid, 400, 'INVALID_DATE')
  }

  try {
    const data = await getAttendanceDashboard({
      date,
      month,
      year,
      staffId,
      status,
      search,
      page,
      limit,
      scopeStaffId: canManage ? null : currentStaff.id
    })

    return Response.json({ success: true, data })
  } catch {
    return responseError(dictionary.messages.loadFailed, 500, 'TIMESHEETS_LOAD_FAILED')
  }
}

export async function POST(request) {
  const authorization = await authorizeAction()
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

  const canOverridePayrollLock = hasAttendancePayrollOverrideRole(authorization.session)

  if (!canOverridePayrollLock && !hasAnyPermission(authorization.session, ATTENDANCE_WRITE_PERMISSIONS)) {
    return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
  }

  const canManage = canOverridePayrollLock || hasAnyPermission(authorization.session, ['hrm:write'])
  const currentStaff = canManage ? null : await getCurrentStaff(authorization.session.user.id)

  if (!canManage && !currentStaff) {
    return responseError(dictionary.messages.forbidden, 403, 'STAFF_PROFILE_REQUIRED')
  }

  const date = payload?.date || getKabulToday()

  if (!DATE_PATTERN.test(date) || !parseDate(date)) {
    return responseError(dictionary.validation.dateInvalid, 400, 'INVALID_DATE')
  }

  const guard = await getAttendanceDateGuard(date)

  const payrollOverride =
    payload?.payrollOverride === true && canOverridePayrollLock

  if (guard.isFuture) return responseError(dictionary.messages.futureDateBlocked, 409, guard.code)
  if (guard.payrollLocked && !payrollOverride) return responseError(dictionary.messages.payrollLocked, 409, guard.code)

  if (payload?.bulkRemainingAbsent === true) {
    if (!canManage) return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')

    if (!guard.isWorkingDay) {
      return Response.json({ success: true, data: { count: 0 }, message: dictionary.messages.noRemainingStaff })
    }

    try {
      const day = parseDate(date)

      const [activeStaff, marked] = await Promise.all([
        prisma.hrmstaff.findMany({
          where: { status: 'ACTIVE', contracts: activeStaffContractRelation({ startDate: day }) },
          select: { id: true }
        }),
        prisma.hrmstafftimesheet.findMany({ where: { date: day }, select: { staff_id: true } })
      ])

      const markedIds = new Set(marked.map(record => record.staff_id))
      const remaining = activeStaff.filter(staff => !markedIds.has(staff.id))

      if (remaining.length === 0) {
        return Response.json({ success: true, data: { count: 0 }, message: dictionary.messages.noRemainingStaff })
      }

      await prisma.$transaction(async transaction => {
        await transaction.hrmstafftimesheet.createMany({
          data: remaining.map(staff => ({ staff_id: staff.id, date: day, status: 'ABSENT' })),
          skipDuplicates: true
        })
        await transaction.auditlog.create({
          data: {
            user_id: authorization.session.user.id,
            action: 'ATTENDANCE_BULK_ABSENT',
            module: 'HRM',
            details: { date, requestedCount: remaining.length, payrollOverride: guard.payrollLocked && payrollOverride }
          }
        })
      })

      return Response.json({
        success: true,
        data: { count: remaining.length },
        message: dictionary.messages.bulkAbsent.replace('{count}', String(remaining.length))
      })
    } catch {
      return responseError(dictionary.messages.operationFailed, 500, 'BULK_ATTENDANCE_FAILED')
    }
  }

  const validation = safeParse(createTimesheetSchema(dictionary.validation), {
    staff_id: canManage ? payload?.staff_id : currentStaff.id,
    status: payload?.status,
    date,
    check_in_time: payload?.check_in_time || '',
    check_out_time: payload?.check_out_time || '',
    project_id: payload?.project_id || '',
    task_id: payload?.task_id || '',
    notes: payload?.notes || ''
  })

  if (!validation.success) {
    return responseError(validation.issues[0]?.message || dictionary.validation.invalidSubmission, 400, 'VALIDATION_ERROR')
  }

  const hours = calculateHours(date, validation.output.check_in_time, validation.output.check_out_time)

  if (Number.isNaN(hours)) return responseError(dictionary.validation.checkoutBeforeCheckin, 400, 'INVALID_TIME_RANGE')

  try {
    const attendanceDate = parseDate(date)

    const [staff, approvedLeave, timeTarget] = await Promise.all([
      prisma.hrmstaff.findFirst({
        where: {
          id: validation.output.staff_id,
          status: 'ACTIVE',
          contracts: activeStaffContractRelation({ startDate: attendanceDate })
        },
        select: { id: true }
      }),
      prisma.hrmstaffleave.findFirst({
        where: {
          staff_id: validation.output.staff_id,
          start_date: { lte: attendanceDate },
          end_date: { gte: attendanceDate },
          status: { is: { category: 'LEAVE_STATUS', value: 'APPROVED' } }
        },
        select: { id: true }
      }),
      resolveOpenProjectTimeTarget({ projectId: validation.output.project_id, taskId: validation.output.task_id })
    ])

    if (!staff) return responseError(dictionary.messages.staffNotFound, 404, 'STAFF_NOT_FOUND')
    if (approvedLeave) return responseError('Manual work entries are blocked on approved leave dates.', 409, 'APPROVED_LEAVE_LOCKED')

    if (!timeTarget.valid) {
      return responseError(timeTarget.code === 'PROJECT_TIMESHEETS_LOCKED' ? 'This project is completed and no longer accepts timesheets.' : 'Select a valid project and task.', 409, timeTarget.code)
    }

    const record = await prisma.$transaction(async transaction => {
      const created = await transaction.hrmstafftimesheet.create({
        data: {
          staff_id: validation.output.staff_id,
          date: attendanceDate,
          project_id: timeTarget.project_id,
          task_id: timeTarget.task_id,
          ...normalizeAttendanceInput(validation.output, date)
        },
        select: attendanceSelect
      })

      await transaction.auditlog.create({
        data: {
          user_id: authorization.session.user.id,
          action: 'ATTENDANCE_CREATED',
          module: 'HRM',
          details: {
            timesheetId: created.id,
            staffId: created.staff_id,
            date,
            status: created.status,
            payrollOverride: guard.payrollLocked && payrollOverride
          }
        }
      })

      return created
    })

    return Response.json({ success: true, data: normalizeAttendance(record), message: dictionary.messages.created }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return responseError(dictionary.messages.duplicate, 409, 'DUPLICATE_ATTENDANCE')
    }

    return responseError(dictionary.messages.operationFailed, 500, 'ATTENDANCE_CREATE_FAILED')
  }
}

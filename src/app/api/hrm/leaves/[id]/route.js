import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import {
  LEAVE_DELETE_PERMISSIONS,
  LEAVE_WRITE_PERMISSIONS,
  calculateLeaveDays,
  createLeaveAttendance,
  getCurrentStaff,
  leaveSelect,
  normalizeLeave,
  parseLeaveDate
} from '@/libs/hrmLeaves'
import { prisma } from '@/libs/prisma'
import { createLeaveSchema } from '@/schemas/hrm/leaves'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function PUT(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try {
    payload = await request.json()
  } catch {
    return responseError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const authorization = await authorizeAction([])
  const dictionary = (await getDictionary(localeFrom(payload?.locale))).hrmLeaves

  if (!authorization.authorized) return responseError(dictionary.messages.unauthenticated, 401, 'UNAUTHENTICATED')

  const currentStaff = await getCurrentStaff(authorization.session.user.id)
  const canManage = hasAnyPermission(authorization.session, LEAVE_WRITE_PERMISSIONS)
  const existing = await prisma.hrmstaffleave.findUnique({ where: { id }, select: leaveSelect })

  if (!existing) return responseError(dictionary.messages.notFound, 404, 'LEAVE_NOT_FOUND')

  if (!canManage && (!currentStaff || existing.staff_id !== currentStaff.id || existing.status.value !== 'PENDING')) {
    return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
  }

  const validation = safeParse(createLeaveSchema(dictionary.validation), {
    staff_id: canManage ? payload?.staff_id : existing.staff_id,
    leave_type_id: payload?.leave_type_id,
    start_date: payload?.start_date,
    end_date: payload?.end_date,
    status_id: payload?.status_id || '',
    reason: payload?.reason || ''
  })

  if (!validation.success) return responseError(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  const totalDays = calculateLeaveDays(validation.output.start_date, validation.output.end_date)

  if (totalDays < 1) return responseError(dictionary.validation.dateRangeInvalid, 400, 'INVALID_DATE_RANGE')

  try {
    const [staff, leaveType] = await Promise.all([
      prisma.hrmstaff.findFirst({ where: { id: validation.output.staff_id, status: { not: 'TERMINATED' } }, select: { id: true } }),
      prisma.option.findFirst({ where: { id: validation.output.leave_type_id, category: 'LEAVE_TYPE', is_active: true }, select: { id: true } })
    ])

    if (!staff) return responseError(dictionary.messages.staffNotFound, 404, 'STAFF_NOT_FOUND')
    if (!leaveType && existing.leave_type_id !== validation.output.leave_type_id) return responseError(dictionary.messages.leaveTypeNotFound, 404, 'LEAVE_TYPE_NOT_FOUND')

    const updated = await prisma.$transaction(async transaction => {
      if (existing.status.value === 'APPROVED') {
        await transaction.hrmstafftimesheet.deleteMany({ where: { notes: `Approved leave request ${id}`, status: 'LEAVE' } })
      }

      const leave = await transaction.hrmstaffleave.update({
        where: { id },
        data: {
          staff_id: validation.output.staff_id,
          leave_type_id: validation.output.leave_type_id,
          start_date: parseLeaveDate(validation.output.start_date),
          end_date: parseLeaveDate(validation.output.end_date),
          total_days: totalDays,
          reason: validation.output.reason || null
        },
        select: leaveSelect
      })

      if (existing.status.value === 'APPROVED') await createLeaveAttendance(transaction, leave)

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'LEAVE_UPDATED', module: 'HRM', details: { leaveId: id, staffId: leave.staff_id, totalDays } } })

      return leave
    })

    return Response.json({ success: true, data: normalizeLeave(updated), message: dictionary.messages.updated })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return responseError(dictionary.messages.notFound, 404, 'LEAVE_NOT_FOUND')

    return responseError(dictionary.messages.operationFailed, 500, 'LEAVE_UPDATE_FAILED')
  }
}

export async function DELETE(request, routeContext) {
  const { id } = await routeContext.params
  const authorization = await authorizeAction([])
  const dictionary = (await getDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))).hrmLeaves

  if (!authorization.authorized) return responseError(dictionary.messages.unauthenticated, 401, 'UNAUTHENTICATED')

  const currentStaff = await getCurrentStaff(authorization.session.user.id)
  const canDelete = hasAnyPermission(authorization.session, LEAVE_DELETE_PERMISSIONS)
  const existing = await prisma.hrmstaffleave.findUnique({ where: { id }, select: { staff_id: true, status: { select: { value: true } } } })

  if (!existing) return responseError(dictionary.messages.notFound, 404, 'LEAVE_NOT_FOUND')

  if (!canDelete && (!currentStaff || existing.staff_id !== currentStaff.id || existing.status.value !== 'PENDING')) {
    return responseError(dictionary.messages.forbidden, 403, 'FORBIDDEN')
  }

  try {
    await prisma.$transaction([
      prisma.hrmstafftimesheet.deleteMany({ where: { notes: `Approved leave request ${id}`, status: 'LEAVE' } }),
      prisma.hrmstaffleave.delete({ where: { id } }),
      prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'LEAVE_DELETED', module: 'HRM', details: { leaveId: id, staffId: existing.staff_id } } })
    ])

    return Response.json({ success: true, message: dictionary.messages.deleted })
  } catch {
    return responseError(dictionary.messages.operationFailed, 500, 'LEAVE_DELETE_FAILED')
  }
}

import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { activeStaffContractRelation } from '@/libs/hrmContractAccess'
import {
  LEAVE_DELETE_PERMISSIONS,
  LEAVE_WRITE_PERMISSIONS,
  calculateLeaveWorkingDays,
  createLeaveAttendance,
  getCurrentStaff,
  getHolidayDateKeys,
  hasOverlappingLeave,
  leaveSelect,
  normalizeLeave,
  parseLeaveDate,
  removeLeaveAttendance,
  validateLeaveEntitlement
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
    total_days: payload?.total_days == null ? String(Number(existing.total_days)) : String(payload.total_days),
    status_id: payload?.status_id || '',
    is_paid: payload?.is_paid ?? existing.is_paid,
    reason: payload?.reason || ''
  })

  if (!validation.success) return responseError(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    const [staff, leaveType] = await Promise.all([
      prisma.hrmstaff.findFirst({
        where: {
          id: validation.output.staff_id,
          status: 'ACTIVE',
          contracts: activeStaffContractRelation({
            startDate: parseLeaveDate(validation.output.start_date),
            endDate: parseLeaveDate(validation.output.end_date)
          })
        },
        select: { id: true }
      }),
      prisma.option.findFirst({ where: { id: validation.output.leave_type_id, category: 'LEAVE_TYPE', is_active: true }, select: { id: true, is_paid_leave: true } })
    ])

    if (!staff) return responseError(dictionary.messages.staffNotFound, 404, 'STAFF_NOT_FOUND')
    if (!leaveType && existing.leave_type_id !== validation.output.leave_type_id) return responseError(dictionary.messages.leaveTypeNotFound, 404, 'LEAVE_TYPE_NOT_FOUND')

    const startDate = parseLeaveDate(validation.output.start_date)
    const endDate = parseLeaveDate(validation.output.end_date)
    const holidays = await getHolidayDateKeys(prisma, startDate, endDate)
    const totalDays = calculateLeaveWorkingDays(startDate, endDate, holidays)

    if (totalDays < 1) return responseError(dictionary.validation.dateRangeInvalid, 400, 'INVALID_DATE_RANGE')

    const updated = await prisma.$transaction(async transaction => {
      const overlap = await hasOverlappingLeave(transaction, {
        staffId: validation.output.staff_id,
        startDate,
        endDate,
        excludeId: id
      })

      if (overlap) {
        const error = new Error('OVERLAPPING_LEAVE')

        error.code = 'OVERLAPPING_LEAVE'
        throw error
      }

      const entitlement = await validateLeaveEntitlement(transaction, {
        staffId: validation.output.staff_id,
        leaveTypeId: validation.output.leave_type_id,
        startDate,
        endDate,
        excludeLeaveId: id
      })

      if (!entitlement.valid) {
        const error = new Error(entitlement.code)

        error.code = entitlement.code
        error.entitlement = entitlement
        throw error
      }

      if (existing.status.value === 'APPROVED') {
        await removeLeaveAttendance(transaction, id)
      }

      const leave = await transaction.hrmstaffleave.update({
        where: { id },
        data: {
          staff_id: validation.output.staff_id,
          leave_type_id: validation.output.leave_type_id,
          start_date: startDate,
          end_date: endDate,
          total_days: new Prisma.Decimal(totalDays),
          is_paid: canManage ? validation.output.is_paid : leaveType?.is_paid_leave ?? existing.is_paid,
          reason: validation.output.reason || null
        },
        select: leaveSelect
      })

      if (existing.status.value === 'APPROVED') await createLeaveAttendance(transaction, leave)

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'LEAVE_UPDATED', module: 'HRM', details: { leaveId: id, staffId: leave.staff_id, totalDays } } })

      return leave
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return Response.json({ success: true, data: normalizeLeave(updated), message: dictionary.messages.updated })
  } catch (error) {
    if (error?.code === 'OVERLAPPING_LEAVE') {
      return responseError(dictionary.messages.overlappingLeave, 409, 'OVERLAPPING_LEAVE')
    }

    if (error?.code === 'LEAVE_BALANCE_EXCEEDED') {
      return responseError(`Requested leave exceeds the remaining yearly balance (${error.entitlement.balance.remaining} days).`, 409, 'LEAVE_BALANCE_EXCEEDED')
    }

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
    await prisma.$transaction(async transaction => {
      await removeLeaveAttendance(transaction, id)
      await transaction.hrmstaffleave.delete({ where: { id } })
      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'LEAVE_DELETED', module: 'HRM', details: { leaveId: id, staffId: existing.staff_id } } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return Response.json({ success: true, message: dictionary.messages.deleted })
  } catch {
    return responseError(dictionary.messages.operationFailed, 500, 'LEAVE_DELETE_FAILED')
  }
}

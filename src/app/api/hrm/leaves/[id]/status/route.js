import { Prisma } from '@prisma/client'

import { authorizeAction } from '@/libs/actionAuthorization'
import { LEAVE_WRITE_PERMISSIONS, createLeaveAttendance, getCurrentStaff, hasOverlappingLeave, leaveSelect, normalizeLeave, removeLeaveAttendance } from '@/libs/hrmLeaves'
import { prisma } from '@/libs/prisma'
import { LEAVE_DECISIONS } from '@/schemas/hrm/leaves'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function PATCH(request, routeContext) {
  const { id } = await routeContext.params
  let payload

  try {
    payload = await request.json()
  } catch {
    return responseError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const authorization = await authorizeAction(LEAVE_WRITE_PERMISSIONS)
  const dictionary = (await getDictionary(localeFrom(payload?.locale))).hrmLeaves

  if (!authorization.authorized) {
    return responseError(
      authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden,
      authorization.code === 'UNAUTHENTICATED' ? 401 : 403,
      authorization.code
    )
  }

  if (!LEAVE_DECISIONS.includes(payload?.status)) return responseError(dictionary.validation.statusInvalid, 400, 'INVALID_STATUS')

  const [status, currentStaff, existing] = await Promise.all([
    prisma.option.findFirst({ where: { category: 'LEAVE_STATUS', value: payload.status, is_active: true }, select: { id: true } }),
    getCurrentStaff(authorization.session.user.id),
    prisma.hrmstaffleave.findUnique({ where: { id }, select: leaveSelect })
  ])

  if (!status) return responseError(dictionary.messages.statusNotFound, 409, 'STATUS_NOT_CONFIGURED')
  if (!existing) return responseError(dictionary.messages.notFound, 404, 'LEAVE_NOT_FOUND')
  if (payload.status === 'APPROVED' && currentStaff?.id === existing.staff_id) {
    return responseError(dictionary.messages.selfApprovalBlocked, 403, 'SELF_APPROVAL_BLOCKED')
  }

  try {
    const updated = await prisma.$transaction(async transaction => {
      if (payload.status === 'APPROVED') {
        const overlap = await hasOverlappingLeave(transaction, {
          staffId: existing.staff_id,
          startDate: existing.start_date,
          endDate: existing.end_date,
          excludeId: id
        })

        if (overlap) {
          const error = new Error('OVERLAPPING_LEAVE')

          error.code = 'OVERLAPPING_LEAVE'
          throw error
        }
      }

      await removeLeaveAttendance(transaction, id)

      const leave = await transaction.hrmstaffleave.update({
        where: { id },
        data: {
          status_id: status.id,
          approved_by_id: currentStaff?.id || null,
          approved_by_user_id: authorization.session.user.id
        },
        select: leaveSelect
      })

      if (payload.status === 'APPROVED') await createLeaveAttendance(transaction, leave)

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: `LEAVE_${payload.status}`, module: 'HRM', details: { leaveId: id, staffId: leave.staff_id, approvedByStaffId: currentStaff?.id || null } } })

      return leave
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return Response.json({ success: true, data: normalizeLeave(updated), message: payload.status === 'APPROVED' ? dictionary.messages.approved : dictionary.messages.rejected })
  } catch (error) {
    if (error?.code === 'OVERLAPPING_LEAVE') {
      return responseError(dictionary.messages.overlappingLeave, 409, 'OVERLAPPING_LEAVE')
    }

    return responseError(dictionary.messages.operationFailed, 500, 'LEAVE_STATUS_UPDATE_FAILED')
  }
}

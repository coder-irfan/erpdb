import { authorizeAction } from '@/libs/actionAuthorization'
import { getCurrentStaff, getLeaveBalance, LEAVE_WRITE_PERMISSIONS } from '@/libs/hrmLeaves'
import { prisma } from '@/libs/prisma'
import { hasAnyPermission } from '@/utils/rbac'

const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function GET(request) {
  const authorization = await authorizeAction([])

  if (!authorization.authorized) return responseError('Unauthorized.', 401, 'UNAUTHENTICATED')

  const params = request.nextUrl.searchParams
  const currentStaff = await getCurrentStaff(authorization.session.user.id)
  const canManage = hasAnyPermission(authorization.session, LEAVE_WRITE_PERMISSIONS)
  const staffId = canManage ? params.get('staff_id') : currentStaff?.id
  const leaveTypeId = params.get('leave_type_id')
  const year = Number.parseInt(params.get('year') || String(new Date().getUTCFullYear()), 10)
  const excludeLeaveId = params.get('exclude_leave_id') || null

  if (!staffId || !leaveTypeId || !Number.isInteger(year)) {
    return responseError('Staff member, leave type, and year are required.', 400, 'VALIDATION_ERROR')
  }

  const balance = await getLeaveBalance(prisma, { staffId, leaveTypeId, year, excludeLeaveId })

  if (!balance) return responseError('Leave type not found.', 404, 'LEAVE_TYPE_NOT_FOUND')

  return Response.json({ success: true, data: balance })
}

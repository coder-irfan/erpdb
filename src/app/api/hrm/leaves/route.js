import { Prisma } from '@prisma/client'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import {
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
import { getKabulToday } from '@/utils/leaveDates'
import { hasAnyPermission } from '@/utils/rbac'

const PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })

const getContext = async locale => {
  const authorization = await authorizeAction([])
  const dictionary = (await getDictionary(locale)).hrmLeaves

  if (!authorization.authorized) return { authorization, dictionary, staff: null, canManage: false }

  const staff = await getCurrentStaff(authorization.session.user.id)
  const canManage = hasAnyPermission(authorization.session, LEAVE_WRITE_PERMISSIONS)

  return { authorization, dictionary, staff, canManage }
}

export async function GET(request) {
  const params = request.nextUrl.searchParams
  const locale = localeFrom(params.get('locale'))
  const context = await getContext(locale)

  if (!context.authorization.authorized) return responseError(context.dictionary.messages.unauthenticated, 401, 'UNAUTHENTICATED')
  if (!context.canManage && !context.staff) return responseError(context.dictionary.messages.staffProfileRequired, 403, 'STAFF_PROFILE_REQUIRED')

  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(params.get('limit') || String(PAGE_SIZE), 10) || PAGE_SIZE))
  const staffId = context.canManage ? params.get('staff_id') || '' : context.staff.id
  const search = params.get('search')?.trim() || ''
  const searchTokens = search.split(/\s+/).filter(Boolean)
  const leaveTypeId = params.get('leave_type_id') || ''
  const statusId = params.get('status_id') || ''
  const startDate = params.get('start_date') || ''
  const endDate = params.get('end_date') || ''
  const todayValue = getKabulToday()
  const todayDate = parseLeaveDate(todayValue)
  const monthStart = parseLeaveDate(`${todayValue.slice(0, 7)}-01`)
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0))

  const where = {
    ...(search && {
      OR: [
        { reason: { contains: search } },
        {
          staff: {
            is: {
              AND: searchTokens.map(token => ({
                OR: [
                  { first_name: { contains: token } },
                  { last_name: { contains: token } },
                  { email: { contains: token } },
                  { position: { contains: token } }
                ]
              }))
            }
          }
        }
      ]
    }),
    ...(staffId && { staff_id: staffId }),
    ...(leaveTypeId && { leave_type_id: leaveTypeId }),
    ...(statusId && { status_id: statusId }),
    ...(startDate && { end_date: { gte: parseLeaveDate(startDate) } }),
    ...(endDate && { start_date: { lte: parseLeaveDate(endDate) } })
  }

  const scopeWhere = context.canManage ? {} : { staff_id: context.staff.id }

  try {
    const [leaves, totalCount, statuses, leaveTypes, staffOptions, pendingCount, todayLeaves, approvedMonth] =
      await Promise.all([
        prisma.hrmstaffleave.findMany({
          where,
          select: leaveSelect,
          orderBy: [{ created_at: 'desc' }],
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.hrmstaffleave.count({ where }),
        prisma.option.findMany({ where: { category: 'LEAVE_STATUS', is_active: true }, select: { id: true, label: true, value: true }, orderBy: { sort_order: 'asc' } }),
        prisma.option.findMany({ where: { category: 'LEAVE_TYPE', is_active: true }, select: { id: true, label: true, value: true }, orderBy: { sort_order: 'asc' } }),
        prisma.hrmstaff.findMany({
          where: context.canManage ? { status: { not: 'TERMINATED' } } : { id: context.staff.id },
          select: { id: true, first_name: true, last_name: true, position: true },
          orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
        }),
        prisma.hrmstaffleave.count({ where: { ...scopeWhere, status: { is: { value: 'PENDING', category: 'LEAVE_STATUS' } } } }),
        prisma.hrmstaffleave.findMany({ where: { ...scopeWhere, status: { is: { value: 'APPROVED', category: 'LEAVE_STATUS' } }, start_date: { lte: todayDate }, end_date: { gte: todayDate } }, distinct: ['staff_id'], select: { staff_id: true } }),
        prisma.hrmstaffleave.findMany({ where: { ...scopeWhere, status: { is: { value: 'APPROVED', category: 'LEAVE_STATUS' } }, start_date: { lte: monthEnd }, end_date: { gte: monthStart } }, select: { start_date: true, end_date: true } })
      ])

    const monthlyDays = approvedMonth.reduce((total, leave) => {
      const clippedStart = leave.start_date < monthStart ? monthStart : leave.start_date
      const clippedEnd = leave.end_date > monthEnd ? monthEnd : leave.end_date

      return total + Math.floor((clippedEnd.getTime() - clippedStart.getTime()) / 86_400_000) + 1
    }, 0)

    return Response.json({
      success: true,
      data: {
        leaves: leaves.map(normalizeLeave),
        totalCount,
        page,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        options: {
          statuses,
          leaveTypes,
          staff: staffOptions.map(item => ({ ...item, full_name: `${item.first_name} ${item.last_name}`.trim() }))
        },
        summary: { pending: pendingCount, onLeaveToday: todayLeaves.length, monthlyDays },
        currentStaffId: context.staff?.id || null,
        canManage: context.canManage
      }
    })
  } catch {
    return responseError(context.dictionary.messages.loadFailed, 500, 'LEAVE_LOAD_FAILED')
  }
}

export async function POST(request) {
  let payload

  try {
    payload = await request.json()
  } catch {
    return responseError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const locale = localeFrom(payload?.locale)
  const context = await getContext(locale)

  if (!context.authorization.authorized) return responseError(context.dictionary.messages.unauthenticated, 401, 'UNAUTHENTICATED')
  if (!context.canManage && !context.staff) return responseError(context.dictionary.messages.staffProfileRequired, 403, 'STAFF_PROFILE_REQUIRED')

  const validation = safeParse(createLeaveSchema(context.dictionary.validation), {
    staff_id: context.canManage ? payload?.staff_id : context.staff.id,
    leave_type_id: payload?.leave_type_id,
    start_date: payload?.start_date,
    end_date: payload?.end_date,
    status_id: payload?.status_id || '',
    reason: payload?.reason || ''
  })

  if (!validation.success) return responseError(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  const totalDays = calculateLeaveDays(validation.output.start_date, validation.output.end_date)

  if (totalDays < 1) return responseError(context.dictionary.validation.dateRangeInvalid, 400, 'INVALID_DATE_RANGE')

  try {
    const [staff, leaveType, pendingStatus, selectedStatus] = await Promise.all([
      prisma.hrmstaff.findFirst({ where: { id: validation.output.staff_id, status: { not: 'TERMINATED' } }, select: { id: true } }),
      prisma.option.findFirst({ where: { id: validation.output.leave_type_id, category: 'LEAVE_TYPE', is_active: true }, select: { id: true } }),
      prisma.option.findFirst({ where: { category: 'LEAVE_STATUS', value: 'PENDING', is_active: true }, select: { id: true, value: true } }),
      context.canManage && payload?.status_id
        ? prisma.option.findFirst({ where: { id: payload.status_id, category: 'LEAVE_STATUS', value: { in: ['PENDING', 'APPROVED'] }, is_active: true }, select: { id: true, value: true } })
        : null
    ])

    const status = selectedStatus || pendingStatus
    const isApproved = status?.value === 'APPROVED'

    if (!staff) return responseError(context.dictionary.messages.staffNotFound, 404, 'STAFF_NOT_FOUND')
    if (!leaveType) return responseError(context.dictionary.messages.leaveTypeNotFound, 404, 'LEAVE_TYPE_NOT_FOUND')
    if (context.canManage && payload?.status_id && !selectedStatus) return responseError(context.dictionary.validation.statusInvalid, 400, 'INVALID_STATUS')
    if (!status) return responseError(context.dictionary.messages.statusNotFound, 409, 'STATUS_NOT_CONFIGURED')

    const created = await prisma.$transaction(async transaction => {
      const leave = await transaction.hrmstaffleave.create({
        data: {
          staff_id: validation.output.staff_id,
          leave_type_id: validation.output.leave_type_id,
          status_id: status.id,
          start_date: parseLeaveDate(validation.output.start_date),
          end_date: parseLeaveDate(validation.output.end_date),
          total_days: totalDays,
          reason: validation.output.reason || null,
          approved_by_id: isApproved ? context.staff?.id || null : null,
          approved_by_user_id: isApproved ? context.authorization.session.user.id : null
        },
        select: leaveSelect
      })

      if (isApproved) await createLeaveAttendance(transaction, leave)

      await transaction.auditlog.create({ data: { user_id: context.authorization.session.user.id, action: 'LEAVE_CREATED', module: 'HRM', details: { leaveId: leave.id, staffId: leave.staff_id, totalDays } } })

      return leave
    })

    return Response.json({ success: true, data: normalizeLeave(created), message: context.dictionary.messages.created }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return responseError(context.dictionary.messages.invalidRelations, 409, 'INVALID_RELATIONS')

    return responseError(context.dictionary.messages.operationFailed, 500, 'LEAVE_CREATE_FAILED')
  }
}

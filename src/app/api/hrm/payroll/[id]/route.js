import { authorizeAction } from '@/libs/actionAuthorization'
import { PAYROLL_DELETE_PERMISSIONS } from '@/libs/hrmPayroll'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function DELETE(request, routeContext) {
  const { id } = await routeContext.params
  const dictionary = (await getDictionary(localeFrom(request.nextUrl.searchParams.get('locale')))).hrmPayroll
  const authorization = await authorizeAction(PAYROLL_DELETE_PERMISSIONS)

  if (!authorization.authorized) return responseError(authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden, authorization.code === 'UNAUTHENTICATED' ? 401 : 403, authorization.code)

  try {
    const payroll = await prisma.hrmpayroll.findUnique({ where: { id }, select: { id: true, staff_id: true, status: { select: { value: true } } } })

    if (!payroll) return responseError(dictionary.messages.notFound, 404, 'PAYROLL_NOT_FOUND')
    if (payroll.status.value === 'PAID') return responseError(dictionary.messages.paidDeleteBlocked, 409, 'PAID_PAYROLL_PROTECTED')

    await prisma.$transaction([
      prisma.hrmpayroll.delete({ where: { id } }),
      prisma.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'PAYROLL_DELETED', module: 'HRM', details: { payrollId: id, staffId: payroll.staff_id } } })
    ])

    return Response.json({ success: true, message: dictionary.messages.deleted })
  } catch {
    return responseError(dictionary.messages.operationFailed, 500, 'PAYROLL_DELETE_FAILED')
  }
}

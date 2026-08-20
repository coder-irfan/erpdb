import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import { getCurrentStaffId, normalizePayroll, payrollSelect, PAYROLL_WRITE_PERMISSIONS } from '@/libs/hrmPayroll'
import { prisma } from '@/libs/prisma'
import { createPayrollPaymentSchema } from '@/schemas/hrm/payroll'
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

  const dictionary = (await getDictionary(localeFrom(payload?.locale))).hrmPayroll
  const authorization = await authorizeAction(PAYROLL_WRITE_PERMISSIONS)

  if (!authorization.authorized) return responseError(authorization.code === 'UNAUTHENTICATED' ? dictionary.messages.unauthenticated : dictionary.messages.forbidden, authorization.code === 'UNAUTHENTICATED' ? 401 : 403, authorization.code)

  const validation = safeParse(createPayrollPaymentSchema(dictionary.validation), { payment_method_id: payload?.payment_method_id || '' })

  if (!validation.success) return responseError(validation.issues[0]?.message, 400, 'VALIDATION_ERROR')

  try {
    const [payroll, paidStatus, paymentMethod, currentStaffId] = await Promise.all([
      prisma.hrmpayroll.findUnique({ where: { id }, select: { id: true, status: { select: { value: true } } } }),
      prisma.option.findFirst({ where: { category: 'PAYROLL_STATUS', value: 'PAID', is_active: true }, select: { id: true } }),
      prisma.option.findFirst({ where: { id: validation.output.payment_method_id, category: 'PAYROLL_PAYMENT_METHOD', is_active: true }, select: { id: true } }),
      getCurrentStaffId(authorization.session.user.id)
    ])

    if (!payroll) return responseError(dictionary.messages.notFound, 404, 'PAYROLL_NOT_FOUND')
    if (!paidStatus) return responseError(dictionary.messages.statusNotFound, 409, 'STATUS_NOT_CONFIGURED')
    if (!paymentMethod) return responseError(dictionary.messages.paymentMethodNotFound, 400, 'PAYMENT_METHOD_NOT_FOUND')

    const updated = await prisma.$transaction(async transaction => {
      const record = await transaction.hrmpayroll.update({ where: { id }, data: { status_id: paidStatus.id, payment_method_id: paymentMethod.id, payment_date: new Date(), processed_by_id: currentStaffId }, select: payrollSelect })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'PAYROLL_PAID', module: 'HRM', details: { payrollId: id, paymentMethodId: paymentMethod.id, processedByStaffId: currentStaffId } } })

      return record
    })

    return Response.json({ success: true, data: normalizePayroll(updated), message: dictionary.messages.paid })
  } catch {
    return responseError(dictionary.messages.operationFailed, 500, 'PAYROLL_PAYMENT_FAILED')
  }
}

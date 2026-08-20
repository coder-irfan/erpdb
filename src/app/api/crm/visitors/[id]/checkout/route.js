import { authorizeAction } from '@/libs/actionAuthorization'
import { CRM_VISITOR_WRITE_PERMISSIONS, normalizeVisitor, visitorInclude } from '@/libs/crmVisitors'
import { prisma } from '@/libs/prisma'
import { getDictionary } from '@/utils/getDictionary'

const localeFrom = value => (['en', 'fa', 'ps'].includes(value) ? value : 'en')
const errorResponse = (error, status, code) => Response.json({ success: false, error, code }, { status })

export async function PATCH(request, context) {
  const locale = localeFrom(request.nextUrl.searchParams.get('locale'))
  const [authorization, appDictionary] = await Promise.all([authorizeAction(CRM_VISITOR_WRITE_PERMISSIONS), getDictionary(locale)])
  const dictionary = appDictionary.crmVisitors

  if (!authorization.authorized) return errorResponse(authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)

  try {
    const { id } = await context.params
    const visitor = await prisma.crmvisitor.findUnique({ where: { id }, select: { id: true, status: true } })

    if (!visitor) return errorResponse(dictionary.messages.notFound, 404, 'VISITOR_NOT_FOUND')
    if (visitor.status === 'COMPLETED') return errorResponse(dictionary.messages.alreadyCheckedOut, 409, 'ALREADY_CHECKED_OUT')

    const updated = await prisma.$transaction(async transaction => {
      const record = await transaction.crmvisitor.update({ where: { id }, data: { status: 'COMPLETED', check_out_time: new Date() }, include: visitorInclude })

      await transaction.auditlog.create({ data: { user_id: authorization.session.user.id, action: 'CRM_VISITOR_CHECKED_OUT', module: 'CRM', details: { visitorId: id } } })

      return record
    })

    return Response.json({ success: true, data: normalizeVisitor(updated), message: dictionary.messages.checkedOut })
  } catch (error) {
    console.error('CRM visitor checkout failed', error)

    return errorResponse(dictionary.messages.operationFailed, 500, 'VISITOR_CHECKOUT_FAILED')
  }
}


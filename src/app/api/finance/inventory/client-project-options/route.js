import { authorizeAction } from '@/libs/actionAuthorization'
import { getInventoryDictionary } from '@/data/dictionaries/inventory'
import { INVENTORY_READ_PERMISSIONS } from '@/libs/inventory'
import { prisma } from '@/libs/prisma'

export async function GET(request) {
  const locale = ['en', 'fa', 'ps'].includes(request.nextUrl.searchParams.get('locale'))
    ? request.nextUrl.searchParams.get('locale')
    : 'en'

  const dictionary = getInventoryDictionary(locale)
  const authorization = await authorizeAction(INVENTORY_READ_PERMISSIONS)

  if (!authorization.authorized) {
    return Response.json(
      { success: false, error: authorization.code === 'FORBIDDEN' ? dictionary.messages.forbidden : dictionary.messages.unauthenticated },
      { status: authorization.code === 'FORBIDDEN' ? 403 : 401 }
    )
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        client: { is: { status: 'ACTIVE' } },
        status: { is: { value: { notIn: ['COMPLETED', 'CANCELLED'] } } }
      },
      select: {
        id: true,
        project_code: true,
        title: true,
        client: { select: { id: true, company_name: true } }
      },
      orderBy: [{ client: { company_name: 'asc' } }, { title: 'asc' }],
      take: 1000
    })

    return Response.json({ success: true, data: { projects } })
  } catch {
    return Response.json({ success: false, error: dictionary.adjust.projectLoadFailed }, { status: 500 })
  }
}

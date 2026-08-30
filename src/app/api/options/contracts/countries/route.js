import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'

const READ_PERMISSIONS = ['options:read', 'contracts:read', 'contracts:write']

export async function GET() {
  const authorization = await authorizeAction(READ_PERMISSIONS)

  if (!authorization.authorized) {
    return Response.json(
      { success: false, code: authorization.code, error: 'Countries could not be loaded.' },
      { status: authorization.code === 'FORBIDDEN' ? 403 : 401 }
    )
  }

  try {
    const options = await prisma.option.findMany({
      where: { category: 'COUNTRY', is_active: true },
      select: { id: true, label: true, value: true, description: true, is_default: true, sort_order: true },
      orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
    })

    return Response.json({ success: true, data: { options } })
  } catch {
    return Response.json(
      { success: false, code: 'COUNTRIES_LOAD_FAILED', error: 'Countries could not be loaded.' },
      { status: 500 }
    )
  }
}

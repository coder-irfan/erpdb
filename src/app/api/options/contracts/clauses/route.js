import { authorizeAction } from '@/libs/actionAuthorization'
import { prisma } from '@/libs/prisma'

const READ_PERMISSIONS = ['options:read', 'options:write', 'contracts:read', 'contracts:write', 'hrm:read']

export async function GET() {
  const authorization = await authorizeAction(READ_PERMISSIONS)

  if (!authorization.authorized) {
    return Response.json(
      { success: false, code: authorization.code, error: 'Legal clauses could not be loaded.' },
      { status: authorization.code === 'FORBIDDEN' ? 403 : 401 }
    )
  }

  try {
    const clauses = await prisma.option.findMany({
      where: { category: 'CONTRACT_CLAUSE', is_active: true },
      select: {
        id: true,
        label: true,
        value: true,
        description: true,
        is_default: true,
        sort_order: true,
        updated_at: true
      },
      orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
    })

    return Response.json({ success: true, data: { clauses } })
  } catch {
    return Response.json(
      { success: false, code: 'LEGAL_CLAUSES_LOAD_FAILED', error: 'Legal clauses could not be loaded.' },
      { status: 500 }
    )
  }
}

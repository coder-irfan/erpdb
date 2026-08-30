import { createFinanceExpense, getFinanceExpenses } from '@/actions/financeExpense'

export async function GET(request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  const result = await getFinanceExpenses(params)

  return Response.json(result, { status: result.success ? 200 : result.code === 'FORBIDDEN' ? 403 : 401 })
}

export async function POST(request) {
  const result = await createFinanceExpense(await request.json())

  return Response.json(result, { status: result.success ? 201 : result.code === 'FORBIDDEN' ? 403 : 400 })
}

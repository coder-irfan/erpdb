import {
  approveFinanceExpense,
  deleteFinanceExpense,
  getFinanceExpenseDetail,
  markFinanceExpensePaid,
  rejectFinanceExpense,
  updateFinanceExpense
} from '@/actions/financeExpense'

const responseStatus = result => {
  if (result.success) return 200
  if (result.code === 'NOT_FOUND') return 404
  if (result.code === 'FORBIDDEN') return 403
  if (result.code === 'UNAUTHENTICATED') return 401

  return 400
}

export async function GET(_request, context) {
  const { id } = await context.params
  const result = await getFinanceExpenseDetail(id)

  return Response.json(result, { status: responseStatus(result) })
}

export async function PUT(request, context) {
  const { id } = await context.params
  const result = await updateFinanceExpense(id, await request.json())

  return Response.json(result, { status: responseStatus(result) })
}

export async function PATCH(request, context) {
  const { id } = await context.params
  const payload = await request.json()
  const transition = String(payload.transition || '').toUpperCase()

  const result = transition === 'APPROVE'
    ? await approveFinanceExpense(id, payload)
    : transition === 'REJECT'
      ? await rejectFinanceExpense(id, payload)
      : transition === 'PAY'
        ? await markFinanceExpensePaid(id, payload)
        : { success: false, code: 'INVALID_TRANSITION', error: 'Select APPROVE, REJECT, or PAY.' }

  return Response.json(result, { status: responseStatus(result) })
}

export async function DELETE(_request, context) {
  const { id } = await context.params
  const result = await deleteFinanceExpense(id)

  return Response.json(result, { status: responseStatus(result) })
}

import 'server-only'

import {
  SYSTEM_CONTRACT_PAYMENT_INCOME_OPTION,
  SYSTEM_INVOICE_STATUS_OPTIONS,
  SYSTEM_PAYMENT_METHOD_OPTIONS,
  getSystemOptionDefinition
} from '@/data/systemOptions'

export const ensureSystemOption = async (client, category, value) => {
  const definition = getSystemOptionDefinition(category, value)

  if (!definition) throw new Error(`Unknown system option: ${category}.${value}`)

  return client.option.upsert({
    where: { category_value: { category, value } },
    update: { ...definition, is_active: true },
    create: { category, ...definition, is_active: true },
    select: { id: true, label: true, value: true, is_default: true }
  })
}

export const ensureInvoicePaymentSystemOptions = async client => {
  const statuses = []
  const paymentMethods = []

  for (const status of SYSTEM_INVOICE_STATUS_OPTIONS) {
    statuses.push(await ensureSystemOption(client, 'INVOICE_STATUS', status.value))
  }

  for (const method of SYSTEM_PAYMENT_METHOD_OPTIONS) {
    paymentMethods.push(await ensureSystemOption(client, 'PAYMENT_METHOD', method.value))
  }

  const incomeType = await ensureSystemOption(
    client,
    'INCOME_TYPE',
    SYSTEM_CONTRACT_PAYMENT_INCOME_OPTION.value
  )

  return {
    statuses,
    paymentMethods,
    defaultPaymentMethod: paymentMethods.find(method => method.is_default) || paymentMethods[0],
    incomeType
  }
}

export const resolveInvoicePaymentSystemOptions = async (client, paymentMethodId) => {
  const systemOptions = await ensureInvoicePaymentSystemOptions(client)
  const requestedPaymentMethod = paymentMethodId
    ? await client.option.findFirst({
        where: { id: paymentMethodId, category: 'PAYMENT_METHOD', is_active: true },
        select: { id: true, label: true, value: true, is_default: true }
      })
    : null

  return {
    paymentMethod: requestedPaymentMethod || systemOptions.defaultPaymentMethod,
    incomeType: systemOptions.incomeType
  }
}

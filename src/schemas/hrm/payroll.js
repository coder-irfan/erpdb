import { maxValue, minValue, number, object, optional, pipe, string, trim } from 'valibot'

const defaults = {
  monthInvalid: 'Select a valid payroll month.',
  yearInvalid: 'Select a valid payroll year.',
  paymentMethodRequired: 'Select a payment method.'
}

export const createPayrollPeriodSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({
    month: pipe(number(messages.monthInvalid), minValue(1, messages.monthInvalid), maxValue(12, messages.monthInvalid)),
    year: pipe(
      number(messages.yearInvalid),
      minValue(2000, messages.yearInvalid),
      maxValue(2200, messages.yearInvalid)
    ),
    staff_id: optional(pipe(string(), trim()), '')
  })
}

export const createPayrollPaymentSchema = customMessages => {
  const messages = { ...defaults, ...customMessages }

  return object({ payment_method_id: pipe(string(messages.paymentMethodRequired), trim()) })
}

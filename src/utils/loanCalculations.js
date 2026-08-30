import { toFiniteNumber } from './formatCurrency'

export const addUtcMonths = (value, months) => {
  const date = new Date(value)
  const day = date.getUTCDate()

  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()

  date.setUTCDate(Math.min(day, lastDay))

  return date
}

export const calculateAmortizationSchedule = ({ principal, annualInterestRate, tenureMonths, issueDate }) => {
  const amount = toFiniteNumber(principal)
  const annualRate = toFiniteNumber(annualInterestRate)
  const months = Math.max(0, Math.trunc(toFiniteNumber(tenureMonths)))
  const start = new Date(issueDate)

  if (amount <= 0 || months <= 0 || Number.isNaN(start.getTime())) return []

  const monthlyRate = annualRate / 1200

  const regularPayment = monthlyRate > 0
    ? amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
    : amount / months

  const roundedPayment = Number(regularPayment.toFixed(2))
  let balance = Number(amount.toFixed(2))

  return Array.from({ length: months }, (_, index) => {
    const interest = Number((monthlyRate > 0 ? balance * monthlyRate : 0).toFixed(2))

    const principalPayment = index === months - 1
      ? balance
      : Math.min(balance, Number((roundedPayment - interest).toFixed(2)))

    const payment = Number((principalPayment + interest).toFixed(2))
    const opening = balance

    balance = Number(Math.max(0, balance - principalPayment).toFixed(2))

    return {
      installment_number: index + 1,
      due_date: addUtcMonths(start, index + 1),
      opening_principal: opening,
      principal_amount: principalPayment,
      interest_amount: interest,
      payment_amount: payment,
      remaining_principal: balance
    }
  })
}

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

export const calculateAmortizationSchedule = ({
  principal,
  annualInterestRate,
  tenureMonths,
  repaymentStartDate,
  issueDate
}) => {
  const amount = toFiniteNumber(principal)
  const annualRate = toFiniteNumber(annualInterestRate)
  const months = Math.max(0, Math.trunc(toFiniteNumber(tenureMonths)))
  const start = repaymentStartDate ? new Date(repaymentStartDate) : addUtcMonths(issueDate, 1)

  if (amount <= 0 || months <= 0 || Number.isNaN(start.getTime())) return []

  const monthlyRate = annualRate / 1200

  const regularPayment =
    monthlyRate > 0 ? (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)) : amount / months

  const roundedPayment = Math.round(regularPayment)
  let balance = Number(amount.toFixed(2))

  return Array.from({ length: months }, (_, index) => {
    const interest = Math.round(monthlyRate > 0 ? balance * monthlyRate : 0)

    const principalPayment = index === months - 1 ? balance : Math.min(balance, Math.max(0, roundedPayment - interest))

    const payment = principalPayment + interest
    const opening = balance

    balance = index === months - 1 ? 0 : Math.max(0, balance - principalPayment)

    return {
      installment_number: index + 1,
      due_date: addUtcMonths(start, index),
      opening_principal: opening,
      principal_amount: principalPayment,
      interest_amount: interest,
      payment_amount: payment,
      remaining_principal: balance
    }
  })
}

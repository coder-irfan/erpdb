import { maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim } from 'valibot'

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const NUMBER_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/

export const financeSalaryMonthSchema = messages =>
  object({
    month: pipe(string(messages.monthInvalid), trim(), regex(MONTH_PATTERN, messages.monthInvalid))
  })

export const financeSalaryAdjustmentSchema = messages =>
  object({
    worked_days: pipe(string(messages.daysInvalid), trim(), regex(NUMBER_PATTERN, messages.daysInvalid)),
    off_days: pipe(string(messages.daysInvalid), trim(), regex(NUMBER_PATTERN, messages.daysInvalid)),
    bonus_amount: pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    loan_deduction: pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    timesheet_summary: optional(pipe(string(), trim(), maxLength(5000, messages.notesTooLong))),
    currency: picklist(['AFN', 'USD'], messages.currencyInvalid),
    exchange_rate: pipe(string(messages.rateInvalid), trim(), nonEmpty(messages.rateInvalid), regex(NUMBER_PATTERN, messages.rateInvalid))
  })

export const createFinanceSalarySchema = messages =>
  object({
    staff_id: pipe(string(messages.required), trim(), nonEmpty(messages.required)),
    timesheet_month: pipe(string(messages.monthInvalid), trim(), regex(MONTH_PATTERN, messages.monthInvalid)),
    worked_days: pipe(string(messages.daysInvalid), trim(), regex(NUMBER_PATTERN, messages.daysInvalid)),
    off_days: pipe(string(messages.daysInvalid), trim(), regex(NUMBER_PATTERN, messages.daysInvalid)),
    bonus_amount: pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    loan_deduction: pipe(string(messages.numberInvalid), trim(), regex(NUMBER_PATTERN, messages.numberInvalid)),
    timesheet_summary: optional(pipe(string(), trim(), maxLength(5000, messages.notesTooLong)), ''),
    currency: picklist(['AFN', 'USD'], messages.currencyInvalid),
    exchange_rate: pipe(string(messages.rateInvalid), trim(), nonEmpty(messages.rateInvalid), regex(NUMBER_PATTERN, messages.rateInvalid))
  })

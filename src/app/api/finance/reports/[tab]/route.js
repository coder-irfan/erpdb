import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { prisma } from '@/libs/prisma'
import { toFiniteNumber } from '@/utils/formatCurrency'

const REPORT_TABS = new Set(['income', 'expenses', 'salary', 'inventory', 'loans'])
const REPORT_PERMISSIONS = ['finance_reports:read', 'finance:read']
const SUPPORTED_CURRENCIES = new Set(['AFN', 'USD'])

const responseError = (error, status, code) => Response.json({ success: false, error, code }, { status })
const money = value => Number(toFiniteNumber(value).toFixed(2))
const dateKey = value => (value ? new Date(value).toISOString().slice(0, 10) : null)
const staffName = staff => (staff ? `${staff.first_name} ${staff.last_name}`.trim() : '')

const parseDate = (value, endOfDay = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null

  const parsed = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)

  return Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value ? null : parsed
}

const monthsBetween = (start, end) => {
  const months = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))

  while (cursor <= last && months.length < 120) {
    months.push(cursor.toISOString().slice(0, 7))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

const transactionToUsd = (amount, currency, exchangeRate) => {
  const numericAmount = toFiniteNumber(amount)
  const rate = toFiniteNumber(exchangeRate)

  if (String(currency).toUpperCase() === 'USD') return numericAmount

  return rate > 0 ? numericAmount / rate : 0
}

const usdToDisplay = (amountUsd, displayCurrency, reportRate) =>
  displayCurrency === 'AFN' ? amountUsd * reportRate : amountUsd

const convertAmount = (amount, currency, lockedRate, displayCurrency, reportRate) => {
  const usd = transactionToUsd(amount, currency, lockedRate)

  return { usd: money(usd), display: money(usdToDisplay(usd, displayCurrency, reportRate)) }
}

const optionName = option => option?.label || option?.value || ''
const addToMap = (map, key, value) => map.set(key || 'Uncategorized', (map.get(key || 'Uncategorized') || 0) + value)

const sortedMapChart = map => {
  const entries = [...map.entries()].sort(([left], [right]) => left.localeCompare(right))

  return { categories: entries.map(([key]) => key), values: entries.map(([, value]) => money(value)) }
}

const distributionChart = map => {
  const entries = [...map.entries()].sort((left, right) => right[1] - left[1])

  return { labels: entries.map(([key]) => key), series: entries.map(([, value]) => money(value)) }
}

const getIncomeReport = async ({ start, end, displayCurrency, reportRate }) => {
  const records = await prisma.financeincome.findMany({
    where: { created_at: { gte: start, lte: end } },
    select: {
      id: true,
      name: true,
      status: true,
      pay_details: true,
      total_amount: true,
      currency: true,
      exchange_rate: true,
      created_at: true,
      income_type: { select: { label: true, value: true } },
      client: { select: { company_name: true, primary_contact_name: true } },
      project: { select: { project_code: true, title: true } },
      contract: { select: { contract_number: true } },
      invoice: { select: { invoice_number: true } }
    },
    orderBy: { created_at: 'desc' }
  })

  let totalUsd = 0
  const monthlyTotals = new Map()
  const sourceTotals = new Map()

  const rows = records.map(record => {
    const converted = convertAmount(record.total_amount, record.currency, record.exchange_rate, displayCurrency, reportRate)

    totalUsd += converted.usd
    addToMap(monthlyTotals, dateKey(record.created_at).slice(0, 7), converted.display)
    addToMap(sourceTotals, optionName(record.income_type), converted.display)

    return {
      id: record.id,
      date: dateKey(record.created_at),
      reference:
        record.invoice?.invoice_number || record.contract?.contract_number || record.project?.project_code || record.id.slice(-8).toUpperCase(),
      name: record.name,
      source: optionName(record.income_type),
      source_detail: record.client?.company_name || record.project?.title || record.client?.primary_contact_name || '',
      amount_local: money(record.total_amount),
      currency: record.currency,
      amount_usd: converted.usd,
      amount_display: converted.display,
      payment_method: record.pay_details || '',
      status: record.status
    }
  })

  return {
    summary: {
      gross_income: money(usdToDisplay(totalUsd, displayCurrency, reportRate)),
      transaction_count: rows.length,
      average_transaction: money(usdToDisplay(rows.length ? totalUsd / rows.length : 0, displayCurrency, reportRate))
    },
    rows,
    charts: {
      trend: { type: 'bar', ...sortedMapChart(monthlyTotals), series_key: 'income' },
      distribution: { type: 'donut', ...distributionChart(sourceTotals) }
    }
  }
}

const getExpenseReport = async ({ start, end, displayCurrency, reportRate }) => {
  const records = await prisma.financeexpense.findMany({
    where: { expense_date: { gte: start, lte: end } },
    select: {
      id: true,
      details: true,
      expense_date: true,
      sub_total: true,
      currency: true,
      exchange_rate: true,
      expense_type: { select: { label: true, value: true } },
      payment_method: { select: { label: true, value: true } },
      project: { select: { project_code: true, title: true } },
      spent_by: { select: { first_name: true, last_name: true } }
    },
    orderBy: { expense_date: 'desc' }
  })

  let totalUsd = 0
  const categoryTotals = new Map()
  const monthlyTotals = new Map()

  const rows = records.map(record => {
    const converted = convertAmount(record.sub_total, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const category = optionName(record.expense_type)

    totalUsd += converted.usd
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + converted.usd)
    addToMap(monthlyTotals, dateKey(record.expense_date).slice(0, 7), converted.display)

    return {
      id: record.id,
      date: dateKey(record.expense_date),
      title: record.details,
      category,
      payee: staffName(record.spent_by) || record.project?.title || '',
      amount_local: money(record.sub_total),
      amount_display: converted.display,
      currency: record.currency,
      payment_method: optionName(record.payment_method),
      status: 'RECORDED'
    }
  })

  const topCategory = [...categoryTotals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || ''

  return {
    summary: {
      operational_expense: money(usdToDisplay(totalUsd, displayCurrency, reportRate)),
      top_expense_category: topCategory,
      approved_count: rows.length,
      pending_count: 0
    },
    rows,
    charts: {
      trend: { type: 'bar', ...sortedMapChart(monthlyTotals), series_key: 'expenses' },
      distribution: {
        type: 'donut',
        ...distributionChart(new Map([...categoryTotals].map(([key, value]) => [key, usdToDisplay(value, displayCurrency, reportRate)])))
      }
    }
  }
}

const getSalaryReport = async ({ start, end, displayCurrency, reportRate }) => {
  const records = await prisma.financesalary.findMany({
    where: { timesheet_month: { in: monthsBetween(start, end) } },
    select: {
      id: true,
      timesheet_month: true,
      base_salary: true,
      bonus_amount: true,
      loan_deduction: true,
      payable_amount: true,
      currency: true,
      exchange_rate: true,
      status: true,
      staff: { select: { id: true, first_name: true, last_name: true, position: true } }
    },
    orderBy: [{ timesheet_month: 'desc' }, { staff: { first_name: 'asc' } }]
  })

  let paidUsd = 0
  let deductionsUsd = 0
  const paidStaff = new Set()
  const monthlyBase = new Map()
  const monthlyBonus = new Map()
  const monthlyDeductions = new Map()

  const rows = records.map(record => {
    const base = convertAmount(record.base_salary, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const bonus = convertAmount(record.bonus_amount, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const deduction = convertAmount(record.loan_deduction, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const payable = convertAmount(record.payable_amount, record.currency, record.exchange_rate, displayCurrency, reportRate)

    deductionsUsd += deduction.usd
    addToMap(monthlyBase, record.timesheet_month, base.display)
    addToMap(monthlyBonus, record.timesheet_month, bonus.display)
    addToMap(monthlyDeductions, record.timesheet_month, deduction.display)

    if (String(record.status).toUpperCase() === 'PAID') {
      paidUsd += payable.usd
      paidStaff.add(record.staff?.id || record.id)
    }

    return {
      id: record.id,
      staff_name: staffName(record.staff),
      designation: record.staff?.position || '',
      month: record.timesheet_month,
      currency: record.currency,
      base_salary: base.display,
      bonus: bonus.display,
      deductions: deduction.display,
      net_paid: payable.display,
      status: record.status
    }
  })

  return {
    summary: {
      payroll_disbursed: money(usdToDisplay(paidUsd, displayCurrency, reportRate)),
      total_deductions: money(usdToDisplay(deductionsUsd, displayCurrency, reportRate)),
      active_staff_paid: paidStaff.size
    },
    rows,
    charts: {
      trend: {
        type: 'bar',
        stacked: true,
        categories: sortedMapChart(monthlyBase).categories,
        series: [
          { key: 'baseSalary', data: sortedMapChart(monthlyBase).values },
          { key: 'bonuses', data: sortedMapChart(monthlyBonus).values },
          { key: 'deductions', data: sortedMapChart(monthlyDeductions).values }
        ]
      }
    }
  }
}

const getInventoryReport = async ({ end, displayCurrency, reportRate }) => {
  const records = await prisma.inventory.findMany({
    where: { created_at: { lte: end } },
    select: {
      id: true,
      sku_code: true,
      name: true,
      quantity_in_stock: true,
      unit_price: true,
      currency: true,
      exchange_rate: true,
      reorder_level: true,
      category: { select: { label: true, value: true } },
      status: { select: { label: true, value: true } }
    },
    orderBy: { name: 'asc' }
  })

  let valuationUsd = 0
  let lowStockCount = 0
  const categoryQuantities = new Map()

  const rows = records.map(record => {
    const quantity = Number(record.quantity_in_stock || 0)
    const unit = convertAmount(record.unit_price, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const total = convertAmount(toFiniteNumber(record.unit_price) * quantity, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const lowStock = quantity <= Number(record.reorder_level || 0)

    valuationUsd += total.usd
    if (lowStock) lowStockCount += 1
    addToMap(categoryQuantities, optionName(record.category), quantity)

    return {
      id: record.id,
      sku: record.sku_code,
      name: record.name,
      category: optionName(record.category),
      quantity,
      unit_cost: unit.display,
      total_value: total.display,
      reorder_level: record.reorder_level,
      reorder_status: quantity === 0 ? 'OUT_OF_STOCK' : lowStock ? 'LOW_STOCK' : optionName(record.status) || 'IN_STOCK'
    }
  })

  return {
    summary: {
      stock_valuation: money(usdToDisplay(valuationUsd, displayCurrency, reportRate)),
      sku_count: rows.length,
      low_stock_count: lowStockCount
    },
    rows,
    charts: {
      trend: {
        type: 'bar',
        categories: [...rows].sort((left, right) => right.total_value - left.total_value).slice(0, 10).map(row => row.name),
        values: [...rows].sort((left, right) => right.total_value - left.total_value).slice(0, 10).map(row => row.total_value),
        series_key: 'stockValue'
      },
      distribution: { type: 'donut', ...distributionChart(categoryQuantities), value_kind: 'quantity' }
    }
  }
}

const getLoansReport = async ({ start, end, displayCurrency, reportRate }) => {
  const records = await prisma.financeloan.findMany({
    where: { issue_date: { gte: start, lte: end } },
    select: {
      id: true,
      loan_number: true,
      loan_type: true,
      entity_name: true,
      total_amount: true,
      repaid_amount: true,
      remaining_balance: true,
      monthly_deduction: true,
      currency: true,
      exchange_rate: true,
      issue_date: true,
      staff: { select: { first_name: true, last_name: true } },
      status: { select: { label: true, value: true } }
    },
    orderBy: { issue_date: 'desc' }
  })

  let activeUsd = 0
  let repaidUsd = 0
  let monthlyUsd = 0
  let issuedUsd = 0
  let remainingUsd = 0

  const rows = records.map(record => {
    const total = convertAmount(record.total_amount, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const repaid = convertAmount(record.repaid_amount, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const remaining = convertAmount(record.remaining_balance, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const monthly = convertAmount(record.monthly_deduction, record.currency, record.exchange_rate, displayCurrency, reportRate)
    const status = optionName(record.status)
    const isActive = ['ACTIVE', 'APPROVED'].includes(String(record.status?.value || status).toUpperCase())

    if (isActive) activeUsd += remaining.usd
    issuedUsd += total.usd
    repaidUsd += repaid.usd
    remainingUsd += remaining.usd
    monthlyUsd += monthly.usd

    return {
      id: record.id,
      loan_number: record.loan_number,
      borrower: staffName(record.staff) || record.entity_name || '',
      type: record.loan_type,
      total: total.display,
      repaid: repaid.display,
      remaining: remaining.display,
      issue_date: dateKey(record.issue_date),
      status
    }
  })

  return {
    summary: {
      active_loan_balance: money(usdToDisplay(activeUsd, displayCurrency, reportRate)),
      total_repaid: money(usdToDisplay(repaidUsd, displayCurrency, reportRate)),
      monthly_recovery: money(usdToDisplay(monthlyUsd, displayCurrency, reportRate))
    },
    rows,
    charts: {
      distribution: {
        type: 'donut',
        labels: ['issued', 'repaid', 'remaining'],
        series: [issuedUsd, repaidUsd, remainingUsd].map(value => money(usdToDisplay(value, displayCurrency, reportRate)))
      }
    }
  }
}

const reportLoaders = {
  income: getIncomeReport,
  expenses: getExpenseReport,
  salary: getSalaryReport,
  inventory: getInventoryReport,
  loans: getLoansReport
}

export async function GET(request, context) {
  const authorization = await authorizeAction(REPORT_PERMISSIONS)

  if (!authorization.authorized) {
    return responseError(authorization.error, authorization.code === 'FORBIDDEN' ? 403 : 401, authorization.code)
  }

  const { tab } = await context.params

  if (!REPORT_TABS.has(tab)) return responseError('Unknown finance report.', 404, 'REPORT_NOT_FOUND')

  const url = new URL(request.url)
  const start = parseDate(url.searchParams.get('start_date'))
  const end = parseDate(url.searchParams.get('end_date'), true)
  const displayCurrency = String(url.searchParams.get('currency') || 'AFN').toUpperCase()

  if (!start || !end || start > end) return responseError('A valid report date range is required.', 400, 'INVALID_DATE_RANGE')
  if (!SUPPORTED_CURRENCIES.has(displayCurrency)) return responseError('Unsupported report currency.', 400, 'INVALID_CURRENCY')

  try {
    const setup = await getCompanySetupRecord()
    const requestedRate = toFiniteNumber(url.searchParams.get('exchange_rate'))
    const reportRate = requestedRate > 0 ? requestedRate : toFiniteNumber(setup.usd_afn_exchange_rate)

    if (reportRate <= 0) return responseError('A valid USD/AFN exchange rate is required.', 400, 'INVALID_EXCHANGE_RATE')

    const report = await reportLoaders[tab]({ start, end, displayCurrency, reportRate })

    return Response.json({
      success: true,
      data: {
        tab,
        start_date: dateKey(start),
        end_date: dateKey(end),
        display_currency: displayCurrency,
        report_exchange_rate: reportRate,
        ...report
      }
    })
  } catch (error) {
    console.error(`Finance ${tab} report failed:`, error)

    return responseError('The finance report could not be loaded.', 500, 'REPORT_LOAD_FAILED')
  }
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import ReportStatsCards from '@/components/reports/ReportStatsCards'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import { useCurrency } from '@/contexts/CurrencyContext'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

import FinanceReportCharts from './FinanceReportCharts'
import FinanceReportTable from './FinanceReportTable'
import ExpenseReportPrintDocument from './ExpenseReportPrintDocument'
import IncomeReportPrintDocument from './IncomeReportPrintDocument'
import InventoryReportPrintDocument from './InventoryReportPrintDocument'
import LoanReportPrintDocument from './LoanReportPrintDocument'
import PayrollMasterReportPrintDocument from './PayrollMasterReportPrintDocument'

const REPORT_TYPES = ['income', 'expenses', 'salary', 'inventory', 'loans']
const EMPTY_REPORT = { summary: {}, rows: [], charts: {}, display_currency: 'AFN', report_exchange_rate: 65 }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const toInputDate = date => date.toISOString().slice(0, 10)

const getPresetRange = preset => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  if (preset === 'last_month') {
    return {
      start: toInputDate(new Date(Date.UTC(year, month - 1, 1))),
      end: toInputDate(new Date(Date.UTC(year, month, 0)))
    }
  }

  if (preset === 'this_quarter') {
    const quarterStart = Math.floor(month / 3) * 3

    return {
      start: toInputDate(new Date(Date.UTC(year, quarterStart, 1))),
      end: toInputDate(new Date(Date.UTC(year, quarterStart + 3, 0)))
    }
  }

  if (preset === 'this_year') return { start: `${year}-01-01`, end: `${year}-12-31` }

  return {
    start: toInputDate(new Date(Date.UTC(year, month, 1))),
    end: toInputDate(new Date(Date.UTC(year, month + 1, 0)))
  }
}

const escapeCsv = value => `"${String(value ?? '').replaceAll('"', '""')}"`

const rowCategory = (tab, row) => {
  if (tab === 'income') return row.source
  if (tab === 'expenses' || tab === 'inventory') return row.category
  if (tab === 'salary') return row.designation
  if (tab === 'loans') return row.type

  return ''
}

const FinanceReportsView = ({ locale, dictionary, setup, generatedAt }) => {
  const initialRange = getPresetRange('this_year')
  const initialCurrency = 'AFN'
  const { currency: displayCurrency, exchangeRate, setCurrency } = useCurrency()
  const initialRate = String(toFiniteNumber(setup.usd_afn_exchange_rate) || 65)
  const [reportType, setReportType] = useState('income')
  const [datePreset, setDatePreset] = useState('this_year')
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  const reportRate = String(exchangeRate || initialRate)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [data, setData] = useState(EMPTY_REPORT)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate || toFiniteNumber(reportRate) <= 0) return undefined

    const controller = new AbortController()
    const requestId = ++requestIdRef.current

    setLoading(true)
    fetch(
      `/api/finance/reports/${reportType}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&currency=${displayCurrency}&exchange_rate=${encodeURIComponent(reportRate)}`,
      { signal: controller.signal, cache: 'no-store' }
    )
      .then(async response => {
        const payload = await response.json()

        if (!response.ok || !payload.success) throw new Error(payload.error || dictionary.messages.loadFailed)

        if (requestId === requestIdRef.current) setData(payload.data)
      })
      .catch(error => {
        if (error.name !== 'AbortError' && requestId === requestIdRef.current) {
          setData(EMPTY_REPORT)
          toast.error(error.message || dictionary.messages.loadFailed)
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })

    return () => controller.abort()
  }, [dictionary.messages.loadFailed, displayCurrency, endDate, reportRate, reportType, startDate])

  const formatDate = useCallback(
    value =>
      value
        ? new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, { dateStyle: 'medium', timeZone: 'UTC' }).format(
            new Date(value)
          )
        : dictionary.common.notAvailable,
    [dictionary.common.notAvailable, locale]
  )

  const formatDateTime = useCallback(
    value =>
      new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value)),
    [locale]
  )

  const categoryOptions = useMemo(
    () => [...new Set((Array.isArray(data.rows) ? data.rows : []).filter(Boolean).map(row => rowCategory(reportType, row)).filter(Boolean))].sort(),
    [data.rows, reportType]
  )

  const rows = useMemo(() => {
    const sourceRows = Array.isArray(data.rows) ? data.rows.filter(Boolean) : []
    const query = search.trim().toLocaleLowerCase(locale)

    return sourceRows.filter(row => {
      const matchesCategory = !category || rowCategory(reportType, row) === category

      const matchesSearch =
        !query ||
        Object.values(row).some(value => typeof value === 'string' && value.toLocaleLowerCase(locale).includes(query))

      return matchesCategory && matchesSearch
    })
  }, [category, data.rows, locale, reportType, search])

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const activeReport = dictionary.tabs[reportType]
  const printDocumentProps = { data: { ...data, rows }, setup, locale, startDate, endDate }

  const stats = useMemo(() => {
    const summary = data.summary || {}
    const currency = value => formatCurrency(value, locale, displayCurrency)

    const configurations = {
      income: [
        { label: dictionary.kpis.grossIncome, value: currency(summary.gross_income), icon: 'tabler-cash' },
        { label: dictionary.kpis.totalTransactions, value: summary.transaction_count || 0, icon: 'tabler-receipt' },
        { label: dictionary.kpis.averageTransaction, value: currency(summary.average_transaction), icon: 'tabler-chart-arrows' },
        { label: dictionary.kpis.incomeSources, value: summary.source_count || 0, icon: 'tabler-category' }
      ],
      expenses: [
        { label: dictionary.kpis.operationalExpense, value: currency(summary.operational_expense), icon: 'tabler-cash-off' },
        { label: dictionary.kpis.topExpenseCategory, value: summary.top_expense_category || dictionary.common.notAvailable, icon: 'tabler-chart-pie' },
        { label: dictionary.kpis.recordedExpenses, value: summary.approved_count || 0, icon: 'tabler-circle-check' },
        { label: dictionary.kpis.pendingExpenses, value: summary.pending_count || 0, icon: 'tabler-hourglass' }
      ],
      salary: [
        { label: dictionary.kpis.payrollDisbursed, value: currency(summary.payroll_disbursed), icon: 'tabler-cash-banknote' },
        { label: dictionary.kpis.totalDeductions, value: currency(summary.total_deductions), icon: 'tabler-circle-minus' },
        { label: dictionary.kpis.activeStaffPaid, value: summary.active_staff_paid || 0, icon: 'tabler-users' },
        { label: dictionary.kpis.payrollRecords, value: summary.payroll_record_count || 0, icon: 'tabler-file-invoice' }
      ],
      inventory: [
        { label: dictionary.kpis.stockValuation, value: currency(summary.stock_valuation), icon: 'tabler-building-warehouse' },
        { label: dictionary.kpis.skuCount, value: summary.sku_count || 0, icon: 'tabler-barcode' },
        { label: dictionary.kpis.lowStockCount, value: summary.low_stock_count || 0, icon: 'tabler-alert-triangle' },
        { label: dictionary.kpis.totalUnits, value: summary.total_units || 0, icon: 'tabler-packages' }
      ],
      loans: [
        { label: dictionary.kpis.activeLoanBalance, value: currency(summary.active_loan_balance), icon: 'tabler-building-bank' },
        { label: dictionary.kpis.totalRepaid, value: currency(summary.total_repaid), icon: 'tabler-circle-check' },
        { label: dictionary.kpis.monthlyRecovery, value: currency(summary.monthly_recovery), icon: 'tabler-calendar-dollar' },
        { label: dictionary.kpis.totalIssued, value: currency(summary.total_issued), icon: 'tabler-cash' }
      ]
    }

    return configurations[reportType]
  }, [data.summary, dictionary.common.notAvailable, dictionary.kpis, displayCurrency, locale, reportType])

  const activeFilterCount =
    Number(Boolean(search.trim())) +
    Number(datePreset !== 'this_year') +
    Number(Boolean(category)) +
    Number(displayCurrency !== initialCurrency)

  const changePreset = preset => {
    setDatePreset(preset)
    setPage(0)

    if (preset !== 'custom') {
      const range = getPresetRange(preset)

      setStartDate(range.start)
      setEndDate(range.end)
    }
  }

  const csvRows = useMemo(() => {
    const headers = dictionary.table

    const configurations = {
      income: {
        header: [
          headers.date,
          headers.reference,
          headers.sourceCategory,
          headers.amountLocal,
          headers.baseAmountUsd,
          headers.paymentMethod,
          headers.status
        ],
        row: item => [
          item.date,
          item.reference,
          item.source,
          item.amount_local,
          item.amount_usd,
          item.payment_method,
          item.status
        ]
      },
      expenses: {
        header: [
          headers.date,
          headers.expenseTitle,
          headers.category,
          headers.vendorPayee,
          headers.amount,
          headers.paymentMethod,
          headers.status
        ],
        row: item => [
          item.date,
          item.title,
          item.category,
          item.payee,
          item.amount_display,
          item.payment_method,
          item.status
        ]
      },
      salary: {
        header: [
          headers.staffName,
          headers.designation,
          headers.month,
          headers.baseSalary,
          headers.bonuses,
          headers.deductions,
          headers.netPaid,
          headers.paymentStatus
        ],
        row: item => [
          item.staff_name,
          item.designation,
          item.month,
          item.base_salary,
          item.bonus,
          item.deductions,
          item.net_paid,
          item.status
        ]
      },
      inventory: {
        header: [
          headers.sku,
          headers.itemName,
          headers.category,
          headers.inStockQty,
          headers.unitCost,
          headers.totalAssetValue,
          headers.reorderStatus
        ],
        row: item => [
          item.sku,
          item.name,
          item.category,
          item.quantity,
          item.unit_cost,
          item.total_value,
          item.reorder_status
        ]
      },
      loans: {
        header: [
          headers.loanNumber,
          headers.borrower,
          headers.loanType,
          headers.totalLoan,
          headers.repaid,
          headers.remainingBalance,
          headers.issueDate
        ],
        row: item => [
          item.loan_number,
          item.borrower,
          item.type,
          item.total,
          item.repaid,
          item.remaining,
          item.issue_date
        ]
      }
    }

    return configurations[reportType]
  }, [dictionary.table, reportType])

  const exportCsv = () => {
    const csv = [csvRows.header, ...rows.map(csvRows.row)].map(row => row.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `finance-${reportType}-${startDate}-${endDate}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const printReport = mode => {
    const originalTitle = document.title

    document.title = `${activeReport.label}-${startDate}-${endDate}${mode === 'pdf' ? '-PDF' : ''}`
    window.print()
    window.setTimeout(() => {
      document.title = originalTitle
    }, 250)
  }

  return (
    <div className='finance-report-print hrm-report-print flex flex-col gap-6'>
      <Card className='no-print'>
        <CardContent className='flex flex-wrap items-center justify-between gap-3'>
          <CustomTextField
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(0)
            }}
            className='is-full sm:is-[260px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
          />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:justify-end'>
            <TableFiltersPopover activeCount={activeFilterCount} locale={locale}>
              <CustomTextField
                select
                label={dictionary.filters.dateRange}
                value={datePreset}
                onChange={event => changePreset(event.target.value)}
                className='is-full'
              >
                <MenuItem value='this_month'>{dictionary.datePresets.thisMonth}</MenuItem>
                <MenuItem value='last_month'>{dictionary.datePresets.lastMonth}</MenuItem>
                <MenuItem value='this_quarter'>{dictionary.datePresets.thisQuarter}</MenuItem>
                <MenuItem value='this_year'>{dictionary.datePresets.thisYear}</MenuItem>
                <MenuItem value='custom'>{dictionary.datePresets.custom}</MenuItem>
              </CustomTextField>
              <NativeDateTimeInput
                locale={locale}
                label={dictionary.filters.startDate}
                value={startDate}
                onChange={event => {
                  setStartDate(event.target.value)
                  setDatePreset('custom')
                  setPage(0)
                }}
                className='is-full'
              />
              <NativeDateTimeInput
                locale={locale}
                label={dictionary.filters.endDate}
                value={endDate}
                onChange={event => {
                  setEndDate(event.target.value)
                  setDatePreset('custom')
                  setPage(0)
                }}
                className='is-full'
              />
              <CustomTextField
                select
                label={dictionary.filters.category}
                value={category}
                onChange={event => {
                  setCategory(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value=''>{dictionary.filters.allCategories}</MenuItem>
                {categoryOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.currency}
                value={displayCurrency}
                onChange={event => {
                  setCurrency(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value='AFN'>AFN</MenuItem>
                <MenuItem value='USD'>USD</MenuItem>
              </CustomTextField>
              {activeFilterCount > 0 && (
                <Button
                  variant='tonal'
                  color='secondary'
                  onClick={() => {
                    const range = getPresetRange('this_month')

                    setSearch('')
                    setDatePreset('this_month')
                    setStartDate(range.start)
                    setEndDate(range.end)
                    setCategory('')
                    setCurrency(initialCurrency)
                    setPage(0)
                  }}
                >
                  {dictionary.filters.clear}
                </Button>
              )}
            </TableFiltersPopover>
            <Button
              variant='tonal'
              color='secondary'
              startIcon={<i className='tabler-file-type-pdf' />}
              disabled={loading || rows.length === 0}
              onClick={() => printReport('pdf')}
            >
              {dictionary.actions.exportPdf}
            </Button>
            <Button
              variant='tonal'
              color='secondary'
              startIcon={<i className='tabler-file-spreadsheet' />}
              disabled={loading || rows.length === 0}
              onClick={exportCsv}
            >
              {dictionary.actions.exportCsv}
            </Button>
            <Button
              variant='contained'
              startIcon={<i className='tabler-printer' />}
              disabled={loading}
              onClick={() => printReport('print')}
            >
              {dictionary.actions.print}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='no-print no-scrollbar overflow-x-auto'>
        <Tabs
          value={reportType}
          variant='scrollable'
          scrollButtons='auto'
          onChange={(_, value) => {
            setReportType(value)
            setCategory('')
            setData(EMPTY_REPORT)
            setLoading(true)
            setPage(0)
          }}
        >
          {REPORT_TYPES.map(type => (
            <Tab
              key={type}
              value={type}
              icon={<i className={dictionary.tabs[type].icon} />}
              iconPosition='start'
              label={dictionary.tabs[type].label}
            />
          ))}
        </Tabs>
      </Card>

      <div className='report-print-header hidden border-b-2 border-black pb-5 text-black'>
        <div className='flex items-start justify-between gap-6'>
          <div>
            {setup.company_logo ? (
              <img src={setup.company_logo} alt={setup.company_name} className='max-h-16 max-w-44 object-contain' />
            ) : null}
          </div>
          <div className='text-end'>
            <Typography className='text-xl font-bold text-black'>{setup.company_name}</Typography>
            <Typography className='whitespace-pre-line text-sm text-black'>{setup.company_address}</Typography>
            <Typography className='text-sm text-black'>
              {[setup.company_phone, setup.company_email].filter(Boolean).join(' - ')}
            </Typography>
          </div>
        </div>
        <div className='mt-6 text-center'>
          <Typography component='h1' className='text-2xl font-bold text-black'>
            {activeReport.label}
          </Typography>
          <Typography className='text-black'>
            {formatDate(`${startDate}T00:00:00.000Z`)} <>&mdash;</> {formatDate(`${endDate}T00:00:00.000Z`)}
          </Typography>
          <Typography className='text-sm text-black'>
            {dictionary.filters.currency}: {displayCurrency} <>&middot;</> {dictionary.filters.exchangeRate}: {reportRate}
          </Typography>
          <Typography className='text-xs text-black'>
            {dictionary.print.generated}: {formatDateTime(generatedAt)}
          </Typography>
        </div>
      </div>

      <ReportStatsCards items={stats} loading={loading} className='print:hidden' />

      <Card className='report-table-card border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-2'>
          <div>
            <Typography variant='h5'>{activeReport.tableTitle}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {dictionary.common.records.replace('{count}', String(rows.length))}
            </Typography>
          </div>
        </CardContent>
        <div className='screen-report-table no-scrollbar overflow-x-auto scroll-smooth'>
          <FinanceReportTable
            tab={reportType}
            rows={pageRows}
            loading={loading}
            dictionary={dictionary}
            locale={locale}
            displayCurrency={displayCurrency}
          />
        </div>
        <div className='print-report-table hidden'>
          <FinanceReportTable
            tab={reportType}
            rows={rows}
            loading={false}
            dictionary={dictionary}
            locale={locale}
            displayCurrency={displayCurrency}
          />
        </div>
        <div className='no-print'>
          <DashboardTablePagination
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            rowsPerPageLabel={dictionary.pagination.rowsPerPage}
            ofLabel={dictionary.pagination.of}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={event => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
          />
        </div>
      </Card>

      <FinanceReportCharts
        tab={reportType}
        charts={data.charts}
        loading={loading}
        dictionary={dictionary.charts}
        locale={locale}
        currency={displayCurrency}
      />

      <div className='hidden print:block'>
        {reportType === 'income' && <IncomeReportPrintDocument {...printDocumentProps} />}
        {reportType === 'expenses' && <ExpenseReportPrintDocument {...printDocumentProps} />}
        {reportType === 'loans' && <LoanReportPrintDocument {...printDocumentProps} />}
        {reportType === 'inventory' && <InventoryReportPrintDocument {...printDocumentProps} />}
        {reportType === 'salary' && <PayrollMasterReportPrintDocument {...printDocumentProps} />}
      </div>

      <style jsx global>{`
        @media print {
          .finance-report-print .screen-report-table {
            display: none !important;
          }
          .finance-report-print .print-report-table {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}

export default FinanceReportsView

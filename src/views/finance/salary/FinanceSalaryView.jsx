'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import {
  deleteFinanceSalary,
  finalizeMonthlyPayroll,
  generateMonthlyPayroll,
  getFinanceSalaries,
  getFinanceSalaryOptions,
  markSalaryPaid
} from '@/actions/financeSalary'
import ConfirmationDeleteModal from '@/components/dialogs/ConfirmationDeleteModal'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import { formatCurrency } from '@/utils/formatCurrency'

import FinanceSalaryAdjustmentDrawer from './FinanceSalaryAdjustmentDrawer'
import FinanceSalaryDetailModal from './FinanceSalaryDetailModal'
import FinanceSalaryPayslipModal from './FinanceSalaryPayslipModal'
import FinanceSalaryStatsCards from './FinanceSalaryStatsCards'
import FinanceSalaryTable from './FinanceSalaryTable'

const currentMonth = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kabul',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date())

  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value

  return `${year}-${month}`
}

const previousCompletedMonth = () => {
  const [year, month] = currentMonth().split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 2, 1))

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const EMPTY_DATA = {
  salaries: [],
  totalCount: 0,
  hasGeneratedPayroll: false,
  hasDraftPayroll: false,
  isPayrollFinalized: false,
  baseCurrency: 'AFN',
  summary: { total: 0, paid: 0, pending: 0, loanDeductions: 0 },
  payoutContext: {
    currentDate: null,
    isEarlyExecution: false,
    workingDaysToDate: 0,
    targetLedgerAccount: 'Payroll Expenses'
  }
}

const EMPTY_OPTIONS = { staff: [], baseCurrency: 'AFN', exchangeRate: '65.0000', company: null }

const FinanceSalaryView = ({ locale, dictionary, canWrite, canDelete, canExecutePayout }) => {
  const [month, setMonth] = useState(previousCompletedMonth)
  const [monthInput, setMonthInput] = useState(previousCompletedMonth)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [printId, setPrintId] = useState(null)
  const [detailRefresh, setDetailRefresh] = useState(0)
  const [payTarget, setPayTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await getFinanceSalaries({ month, search, status, page: page + 1, limit: rowsPerPage, locale })

    if (result.success) setData(result.data)
    else toast.error(result.error || dictionary.messages.loadFailed)
    setLoading(false)
  }, [dictionary.messages.loadFailed, locale, month, page, rowsPerPage, search, status])

  const loadOptions = useCallback(async () => {
    const result = await getFinanceSalaryOptions({ locale })

    if (result.success) setOptions(result.data)
    else toast.error(result.error || dictionary.messages.optionsLoadFailed)
  }, [dictionary.messages.optionsLoadFailed, locale])

  useEffect(() => {
    loadData()
  }, [loadData])
  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const refresh = async () => {
    await Promise.all([loadData(), loadOptions()])
    setDetailRefresh(value => value + 1)
  }

  const generate = async () => {
    setGenerating(true)
    const result = await generateMonthlyPayroll(month, { locale })

    if (result.success) {
      toast.success(result.message)

      if (page === 0) await refresh()
      else setPage(0)
    } else if (result.code === 'PAYROLL_ALREADY_GENERATED') {
      toast.warning(result.error || dictionary.messages.payrollAlreadyGenerated)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)
    setGenerating(false)
  }

  const finalize = async () => {
    setGenerating(true)
    const result = await finalizeMonthlyPayroll(month, { locale })

    if (result.success) {
      toast.success(result.message)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)
    setGenerating(false)
  }

  const pay = async () => {
    if (!payTarget) return
    setBusyId(payTarget.id)

    const result = await markSalaryPaid(payTarget.id, { locale })

    if (result.success) {
      toast.success(result.message)
      setPayTarget(null)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)
    setBusyId(null)
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    const result = await deleteFinanceSalary(deleteTarget.id, { locale })

    if (result.success) {
      toast.success(result.message)
      setDeleteTarget(null)
      if (detailId === deleteTarget.id) setDetailId(null)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)
    setBusyId(null)
  }

  const selectMonth = value => {
    setMonthInput(value)

    if (!MONTH_PATTERN.test(value)) return

    setMonth(value)
    setPage(0)
  }

  const isEarlyPayment = Boolean(
    payTarget && data.payoutContext.isEarlyExecution && payTarget.timesheet_month === month
  )

  const payrollGenerated = data.hasGeneratedPayroll
  const ongoingMonth = data.payoutContext.currentDate?.slice(0, 7) || currentMonth()
  const activeOrFuturePeriod = month >= ongoingMonth

  const localeTag = locale === 'fa' ? 'fa-AF' : locale === 'ps' ? 'ps-AF' : 'en-US'

  const formatMonth = value =>
    new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${value}-01T00:00:00.000Z`)
    )

  const selectedMonthLabel = formatMonth(month)
  const payDescriptionParts = dictionary.pay.description.split('{name}')
  const hasPayNameToken = payDescriptionParts.length > 1

  const payrollMonthLabel = payTarget
    ? new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${payTarget.timesheet_month}-01T00:00:00.000Z`)
      )
    : ''

  const currentDateLabel = data.payoutContext.currentDate
    ? new Intl.DateTimeFormat(localeTag, { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(`${data.payoutContext.currentDate}T00:00:00.000Z`)
      )
    : ''

  return (
    <div className='flex flex-col gap-4'>
      <FinanceSalaryStatsCards
        summary={data.summary}
        locale={locale}
        currency={data.baseCurrency}
        dictionary={dictionary}
      />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex is-full flex-wrap items-end gap-3 lg:is-auto'>
            <CustomTextField
              label={dictionary.filters.search}
              placeholder={dictionary.filters.searchPlaceholder}
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              className='is-full sm:is-[330px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
            />
            <CustomTextField
              type='month'
              label={dictionary.filters.month}
              value={monthInput}
              onChange={event => selectMonth(event.target.value)}
              helperText={
                month === ongoingMonth
                  ? dictionary.filters.currentPeriod
                  : month > ongoingMonth
                    ? dictionary.filters.futurePeriod
                    : undefined
              }
              onBlur={() => {
                if (!MONTH_PATTERN.test(monthInput)) setMonthInput(month)
              }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { pattern: '\\d{4}-(0[1-9]|1[0-2])' } }}
              className='is-full sm:is-[180px]'
            />
          </div>
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover
              activeCount={Number(Boolean(searchInput.trim())) + Number(Boolean(status))}
              locale={locale}
            >
              <CustomTextField
                select
                label={dictionary.filters.status}
                value={status}
                onChange={event => {
                  setStatus(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                <MenuItem value='DRAFT'>{dictionary.status.DRAFT}</MenuItem>
                <MenuItem value='FINALIZED'>{dictionary.status.FINALIZED}</MenuItem>
                <MenuItem value='PAID'>{dictionary.status.PAID}</MenuItem>
              </CustomTextField>
              {status && (
                <Button
                  variant='tonal'
                  color='secondary'
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                    setStatus('')
                    setPage(0)
                  }}
                >
                  {dictionary.filters.clear}
                </Button>
              )}
            </TableFiltersPopover>
            {canWrite && (
              <Button
                variant={data.isPayrollFinalized ? 'tonal' : 'contained'}
                color={data.isPayrollFinalized ? 'success' : payrollGenerated ? 'warning' : 'primary'}
                startIcon={
                  <i
                    className={
                      data.isPayrollFinalized
                        ? 'tabler-lock-check'
                        : payrollGenerated
                          ? 'tabler-lock'
                          : 'tabler-calendar-dollar'
                    }
                  />
                }
                disabled={generating || !month || activeOrFuturePeriod || data.isPayrollFinalized}
                onClick={payrollGenerated ? finalize : generate}
              >
                <LoadingButtonContent loading={generating} loadingLabel={dictionary.actions.generating}>
                  {activeOrFuturePeriod
                    ? dictionary.actions.currentPeriod
                    : data.isPayrollFinalized
                      ? dictionary.actions.payrollFinalized
                      : payrollGenerated
                        ? dictionary.actions.finalize.replace('{month}', selectedMonthLabel)
                        : dictionary.actions.generate.replace('{month}', selectedMonthLabel)}
                </LoadingButtonContent>
              </Button>
            )}
          </div>
        </CardContent>
        <FinanceSalaryTable
          data={data}
          loading={loading}
          busyId={busyId}
          page={page}
          rowsPerPage={rowsPerPage}
          locale={locale}
          dictionary={dictionary}
          canWrite={canWrite}
          canDelete={canDelete}
          canExecutePayout={canExecutePayout}
          activeMonth={ongoingMonth}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onView={salary => setDetailId(salary.id)}
          onPrint={salary => setPrintId(salary.id)}
          onEdit={setEditing}
          onPay={setPayTarget}
          onDelete={setDeleteTarget}
        />
      </Card>

      <FinanceSalaryAdjustmentDrawer
        open={Boolean(editing)}
        salary={editing}
        baseCurrency={data.baseCurrency}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <FinanceSalaryDetailModal
        open={Boolean(detailId)}
        salaryId={detailId}
        locale={locale}
        dictionary={dictionary}
        refreshKey={detailRefresh}
        onClose={() => setDetailId(null)}
      />
      <FinanceSalaryPayslipModal
        open={Boolean(printId)}
        salaryId={printId}
        locale={locale}
        dictionary={dictionary}
        refreshKey={detailRefresh}
        onClose={() => setPrintId(null)}
      />
      <Dialog
        open={Boolean(payTarget)}
        onClose={busyId ? undefined : () => setPayTarget(null)}
        fullWidth
        maxWidth={isEarlyPayment ? 'sm' : 'xs'}
        aria-labelledby='confirm-salary-payment-title'
        PaperProps={{ className: 'confirmation-dialog' }}
      >
        <DialogContent className='flex flex-col items-center px-5 pb-6 pt-7 text-center sm:px-8 sm:pb-8'>
          <div className='mb-4 flex size-14 items-center justify-center rounded-full bg-successLighter text-success'>
            <i className='tabler-circle-check text-3xl' />
          </div>
          <Typography id='confirm-salary-payment-title' variant='h5' className='font-semibold'>
            {isEarlyPayment ? dictionary.pay.earlyTitle : dictionary.pay.title}
          </Typography>
          <Typography color='text.secondary' className='mt-2 max-is-[420px] leading-relaxed'>
            {isEarlyPayment ? (
              dictionary.pay.earlyDescription.replace('{month}', payrollMonthLabel).replace('{date}', currentDateLabel)
            ) : (
              <>
                {payDescriptionParts[0]}
                {hasPayNameToken && (
                  <Typography component='span' className='font-semibold' color='text.primary'>
                    {payTarget?.staff?.full_name}
                  </Typography>
                )}
                {payDescriptionParts.slice(1).join('{name}')}
              </>
            )}
          </Typography>
          {payTarget && !isEarlyPayment && !hasPayNameToken && (
            <div className='mt-4 w-full rounded border border-success/20 bg-successLighter px-4 py-3'>
              <Typography className='break-words font-semibold' color='text.primary'>
                {payTarget.staff?.full_name}
              </Typography>
            </div>
          )}
          {isEarlyPayment && (
            <div className='mt-4 w-full rounded border border-warning/30 bg-warningLight p-4 text-start'>
              <div className='grid gap-3 sm:grid-cols-3'>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.pay.netPayout}
                  </Typography>
                  <Typography className='font-semibold'>
                    {payTarget ? formatCurrency(payTarget.payable_amount, locale, payTarget.currency) : ''}
                  </Typography>
                </div>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.pay.targetLedger}
                  </Typography>
                  <Typography className='font-semibold'>
                    {data.payoutContext.targetLedgerAccount === 'Payroll Expenses'
                      ? dictionary.pay.payrollExpensesLedger
                      : data.payoutContext.targetLedgerAccount}
                  </Typography>
                </div>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.pay.workingDaysToDate}
                  </Typography>
                  <Typography className='font-semibold'>{data.payoutContext.workingDaysToDate}</Typography>
                </div>
              </div>
            </div>
          )}
          <div className='mt-6 grid w-full grid-cols-2 gap-3'>
            <Button variant='tonal' color='secondary' disabled={Boolean(busyId)} onClick={() => setPayTarget(null)}>
              {dictionary.actions.cancel}
            </Button>
            <Button variant='contained' color='success' disabled={Boolean(busyId)} onClick={pay} autoFocus>
              <LoadingButtonContent loading={Boolean(busyId)} loadingLabel={dictionary.actions.saving}>
                {isEarlyPayment ? dictionary.pay.confirmEarly : dictionary.pay.confirm}
              </LoadingButtonContent>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmationDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.staff?.full_name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={Boolean(busyId)}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default FinanceSalaryView

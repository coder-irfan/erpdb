'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import {
  deleteFinanceSalary,
  generateMonthlyPayroll,
  getFinanceSalaries,
  getFinanceSalaryOptions,
  markSalaryPaid
} from '@/actions/financeSalary'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import { formatCurrency } from '@/utils/formatCurrency'

import FinanceSalaryAdjustmentDrawer from './FinanceSalaryAdjustmentDrawer'
import FinanceSalaryPayslipModal from './FinanceSalaryPayslipModal'
import FinanceSalaryStatsCards from './FinanceSalaryStatsCards'
import FinanceSalaryTable from './FinanceSalaryTable'

const currentMonth = () => {
  const date = new Date()

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const EMPTY_DATA = {
  salaries: [],
  totalCount: 0,
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
  const [month, setMonth] = useState(currentMonth)
  const [monthInput, setMonthInput] = useState(currentMonth)
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
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)
    setGenerating(false)
  }

  const pay = async () => {
    if (!payTarget) return
    setBusyId(payTarget.id)

    const result = await markSalaryPaid(payTarget.id, {
      locale,
      confirmEarlyExecution:
        data.payoutContext.isEarlyExecution && payTarget.timesheet_month === month
    })

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
    payTarget &&
      data.payoutContext.isEarlyExecution &&
      payTarget.timesheet_month === month
  )

  const localeTag = locale === 'fa' ? 'fa-AF' : locale === 'ps' ? 'ps-AF' : 'en-US'

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
              onBlur={() => {
                if (!MONTH_PATTERN.test(monthInput)) setMonthInput(month)
              }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { pattern: '\\d{4}-(0[1-9]|1[0-2])' } }}
              className='is-full sm:is-[180px]'
            />
          </div>
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover activeCount={Number(Boolean(searchInput.trim())) + Number(Boolean(status))} locale={locale}>
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
                variant='contained'
                startIcon={<i className='tabler-calendar-dollar' />}
                disabled={generating || !month}
                onClick={generate}
              >
                <LoadingButtonContent loading={generating} loadingLabel={dictionary.actions.generating}>
                  {dictionary.actions.generate.replace('{month}', month)}
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
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onView={salary => setDetailId(salary.id)}
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
      <FinanceSalaryPayslipModal
        open={Boolean(detailId)}
        salaryId={detailId}
        locale={locale}
        dictionary={dictionary}
        refreshKey={detailRefresh}
        onClose={() => setDetailId(null)}
      />
      <Dialog
        open={Boolean(payTarget)}
        onClose={busyId ? undefined : () => setPayTarget(null)}
        fullWidth
        maxWidth={isEarlyPayment ? 'sm' : 'xs'}
      >
        <DialogTitle>{isEarlyPayment ? dictionary.pay.earlyTitle : dictionary.pay.title}</DialogTitle>
        <DialogContent dividers>
          {isEarlyPayment ? (
            <div className='flex flex-col gap-4'>
              <Alert severity='warning' variant='filled'>
                {dictionary.pay.earlyDescription
                  .replace('{month}', payrollMonthLabel)
                  .replace('{date}', currentDateLabel)}
              </Alert>
              <Box className='rounded-lg border border-warning/40 bg-warningLight p-4'>
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
              </Box>
            </div>
          ) : (
            <Typography color='text.secondary'>
              {dictionary.pay.description.replace('{name}', payTarget?.staff?.full_name || '')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions className='gap-2 p-5'>
          <Button variant='tonal' color='secondary' disabled={Boolean(busyId)} onClick={() => setPayTarget(null)}>
            {dictionary.actions.cancel}
          </Button>
          <Button variant='contained' color='success' disabled={Boolean(busyId)} onClick={pay}>
            <LoadingButtonContent loading={Boolean(busyId)} loadingLabel={dictionary.actions.saving}>
              {isEarlyPayment ? dictionary.pay.confirmEarly : dictionary.pay.confirm}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDeleteModal
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

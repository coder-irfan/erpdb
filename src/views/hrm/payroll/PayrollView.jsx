'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { formatCurrency } from '@/utils/formatCurrency'

import PaymentDialog from './PaymentDialog'
import PayrollStatsCards from './PayrollStatsCards'
import PayslipModal from './PayslipModal'

import tableStyles from '@core/styles/table.module.css'

const EMPTY_DATA = {
  payrolls: [],
  totalCount: 0,
  summary: { totalPayroll: 0, totalPaid: 0, totalPending: 0, totalDeductions: 0 },
  options: { statuses: [], paymentMethods: [], staff: [] },
  canManage: false
}

const STATUS_COLORS = { PAID: 'success', PENDING: 'warning', DRAFT: 'secondary' }
const getInitials = staff => `${staff.first_name?.[0] || ''}${staff.last_name?.[0] || ''}`.toUpperCase()

const PayrollView = ({ initialMonth, initialYear, setup, locale, dictionary }) => {
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [staffId, setStaffId] = useState('')
  const [statusId, setStatusId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [payslip, setPayslip] = useState(null)
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        page: String(page + 1),
        limit: String(rowsPerPage),
        locale
      })

      if (search) params.set('search', search)
      if (staffId) params.set('staff_id', staffId)
      if (statusId) params.set('status_id', statusId)

      const response = await fetch(`/api/hrm/payroll?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.loadFailed)

      setData(result.data)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.messages.loadFailed, locale, month, page, rowsPerPage, search, staffId, statusId, year])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const generatePayroll = async () => {
    setGenerating(true)

    try {
      const response = await fetch('/api/hrm/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      await loadData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setGenerating(false)
    }
  }

  const deletePayroll = async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/hrm/payroll/${deleteTarget.id}?locale=${locale}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      setDeleteTarget(null)
      await loadData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setDeleteLoading(false)
    }
  }

  const currency = setup.currency_code || 'AFN'
  const money = value => formatCurrency(value, locale, currency)

  const renderStatusFilterValue = selected => {
    const status = data.options.statuses.find(item => item.id === selected)

    return status ? dictionary.status[status.value] || status.label : dictionary.filters.allStatuses
  }

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      <PayrollStatsCards summary={data.summary} locale={locale} currencyCode={currency} dictionary={dictionary} />
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4 border-be border-divider'>
          <CustomTextField
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            className='is-full sm:is-[320px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
          />
          <div className='flex is-full flex-wrap items-center gap-3 sm:is-auto sm:justify-end'>
            <TableFiltersPopover
              activeCount={
                Number(Boolean(staffId)) +
                Number(Boolean(statusId)) +
                Number(month !== initialMonth || year !== initialYear)
              }
              locale={locale}
            >
              <CustomTextField
                type='number'
                label={dictionary.period.year}
                value={year}
                onChange={event => {
                  setYear(Number(event.target.value))
                  setPage(0)
                }}
                className='is-full'
                inputProps={{ min: 2000, max: 2200 }}
              />

              <CustomTextField
                select
                label={dictionary.period.month}
                value={month}
                onChange={event => {
                  setMonth(Number(event.target.value))
                  setPage(0)
                }}
                className='is-full'
              >
                {dictionary.months.map((label, index) => (
                  <MenuItem key={label} value={index + 1}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>

              <CustomTextField
                select
                label={dictionary.filters.staff}
                value={staffId}
                onChange={event => {
                  setStaffId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected =>
                      data.options.staff.find(staff => staff.id === selected)?.full_name || dictionary.filters.allStaff
                  }
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStaff}</MenuItem>
                {data.options.staff.map(staff => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.status}
                value={statusId}
                onChange={event => {
                  setStatusId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
                slotProps={{ select: { displayEmpty: true, renderValue: renderStatusFilterValue } }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {data.options.statuses.map(status => (
                  <MenuItem key={status.id} value={status.id}>
                    {dictionary.status[status.value] || status.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </TableFiltersPopover>
            {data.canManage && (
              <Button
                variant='contained'
                startIcon={<i className={generating ? 'tabler-loader-2 animate-spin' : 'tabler-calculator'} />}
                disabled={generating}
                onClick={generatePayroll}
              >
                {dictionary.actions.generate}
              </Button>
            )}
          </div>
        </CardContent>
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.table.staff}</th>
                <th>{dictionary.table.baseSalary}</th>
                <th>{dictionary.table.deductions}</th>
                <th>{dictionary.table.netSalary}</th>
                <th>{dictionary.table.status}</th>
                <th>{dictionary.table.paymentMethod}</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={7} />
              ) : data.payrolls.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={7}
                  icon='tabler-cash-banknote'
                  title={dictionary.empty.title}
                  description={dictionary.empty.description}
                  actionLabel={data.canManage ? dictionary.actions.generate : null}
                  onAction={data.canManage ? generatePayroll : null}
                />
              ) : (
                data.payrolls.map(payroll => (
                  <tr key={payroll.id}>
                    <td>
                      <div className='flex min-is-[220px] items-center gap-3'>
                        <Avatar variant='rounded' className='bg-primaryLighter text-primary'></Avatar>

                        <div className='flex min-is-0 flex-col'>
                          <Typography className='font-medium' color='text.primary'>
                            {payroll.staff.full_name}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {payroll.staff.position}
                          </Typography>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className='inline-flex rounded bg-successLighter px-3 py-1 font-semibold text-success'>
                        {formatCurrency(payroll.base_salary, locale, payroll.currency || currency)}
                      </span>
                    </td>
                    <td>
                      <Typography className='font-medium'>
                        {formatCurrency(
                          Number(payroll.unpaid_leave_deduction) + Number(payroll.tax_deduction),
                          locale,
                          payroll.currency || currency
                        )}
                      </Typography>
                    </td>
                    <td>
                      <Typography className='font-bold' color='text.primary'>
                        {formatCurrency(payroll.net_salary, locale, payroll.currency || currency)}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={STATUS_COLORS[payroll.status.value] || 'default'}
                        label={dictionary.status[payroll.status.value] || payroll.status.label}
                      />
                    </td>
                    <td>{payroll.payment_method?.label || '—'}</td>
                    <td className='text-end'>
                      <div className='flex justify-end gap-1'>
                        <Tooltip title={dictionary.actions.viewPayslip}>
                          <IconButton onClick={() => setPayslip(payroll)}>
                            <i className='tabler-receipt' />
                          </IconButton>
                        </Tooltip>
                        {data.canManage && payroll.status.value !== 'PAID' && (
                          <Tooltip title={dictionary.actions.processPayment}>
                            <IconButton color='success' onClick={() => setPaymentTarget(payroll)}>
                              <i className='tabler-cash-banknote' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {data.canManage && payroll.status.value !== 'PAID' && (
                          <Tooltip title={dictionary.actions.delete}>
                            <IconButton color='error' onClick={() => setDeleteTarget(payroll)}>
                              <i className='tabler-trash' />
                            </IconButton>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <DashboardTablePagination
          count={data.totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          rowsPerPageLabel={dictionary.table.rowsPerPage}
          ofLabel={dictionary.table.of}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
        />
      </Card>
      <PayslipModal
        open={Boolean(payslip)}
        payroll={payslip}
        setup={setup}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setPayslip(null)}
      />
      <PaymentDialog
        open={Boolean(paymentTarget)}
        payroll={paymentTarget}
        paymentMethods={data.options.paymentMethods}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setPaymentTarget(null)}
        onPaid={loadData}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.staff.full_name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleteLoading}
        onConfirm={deletePayroll}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default PayrollView

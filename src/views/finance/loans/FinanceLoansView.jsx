'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'

import FinanceLoanDetailModal from './FinanceLoanDetailModal'
import FinanceLoanFormDrawer from './FinanceLoanFormDrawer'
import FinanceLoanPrintVoucherModal from './FinanceLoanPrintVoucherModal'
import FinanceLoanRepaymentDialog from './FinanceLoanRepaymentDialog'
import FinanceLoanStatsCards from './FinanceLoanStatsCards'
import FinanceLoanTable from './FinanceLoanTable'

const EMPTY_DATA = {
  loans: [],
  totalCount: 0,
  summary: {
    staffReceivables: 0,
    payrollRecovery: 0,
    activeStaffBorrowers: 0,
    staffRecoveredThisMonth: 0,
    corporateDebt: 0,
    monthlyDebtObligation: 0,
    activeCorporateLoans: 0,
    corporatePaidThisMonth: 0
  },
  options: { statuses: [], paymentMethods: [], staff: [], baseCurrency: 'AFN', exchangeRate: '65.0000' }
}

const FinanceLoansView = ({ locale, dictionary, canWrite, canManageStatus, setup }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusId, setStatusId] = useState('')
  const [loanType, setLoanType] = useState('STAFF')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [repayTarget, setRepayTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [printTarget, setPrintTarget] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(null)
  const [approvalTarget, setApprovalTarget] = useState(null)
  const [payoutMethodId, setPayoutMethodId] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ locale, page: String(page + 1), limit: String(rowsPerPage) })

    if (search) params.set('search', search)
    if (statusId) params.set('status_id', statusId)
    params.set('loan_type', loanType)
    const response = await fetch(`/api/finance/loans?${params}`, { cache: 'no-store' })
    const result = await response.json()

    if (response.ok && result.success) setData(result.data)
    else toast.error(result.error || dictionary.messages.loadFailed)
    setLoading(false)
  }, [dictionary.messages.loadFailed, loanType, locale, page, rowsPerPage, search, statusId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const changeStatus = async (loan, nextStatus, extraPayload = {}) => {
    setStatusUpdating(loan.id)

    try {
      const response = await fetch(`/api/finance/loans/${loan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, locale, ...extraPayload })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.operationFailed)

        return false
      }

      setData(current => ({
        ...current,
        loans: current.loans.map(item => (item.id === loan.id ? result.data : item))
      }))
      toast.success(result.message)
      await loadData()

      return true
    } catch {
      toast.error(dictionary.messages.operationFailed)

      return false
    } finally {
      setStatusUpdating(null)
    }
  }

  const openApproval = loan => {
    const defaultMethod =
      data.options.paymentMethods.find(method => method.is_default) || data.options.paymentMethods[0]

    setApprovalTarget(loan)
    setPayoutMethodId(defaultMethod?.id || '')
  }

  const approveAndDisburse = async () => {
    if (!approvalTarget || !payoutMethodId) return

    const saved = await changeStatus(approvalTarget, 'ACTIVE', {
      payout_payment_method_id: payoutMethodId
    })

    if (saved) setApprovalTarget(null)
  }

  const activeFilters = [searchInput.trim(), statusId].filter(Boolean).length

  return (
    <div className='flex flex-col gap-4'>
      <FinanceLoanStatsCards summary={data.summary} loanType={loanType} locale={locale} loading={loading} />
      <Card className='border border-divider/70 shadow-sm'>
        <Tabs
          value={loanType}
          onChange={(_, value) => {
            setLoading(true)
            setLoanType(value)
            setPage(0)
          }}
          variant='scrollable'
          className='border-be border-divider px-4'
        >
          <Tab
            value='STAFF'
            icon={<i className='tabler-users' />}
            iconPosition='start'
            label='Staff Loans & Salary Advances'
          />
          <Tab
            value='CORPORATE'
            icon={<i className='tabler-building-bank' />}
            iconPosition='start'
            label='Corporate Debt & Liabilities'
          />
        </Tabs>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            className='is-full sm:is-[380px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
          />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover activeCount={activeFilters} locale={locale}>
              <CustomTextField
                select
                label={dictionary.filters.status}
                value={statusId}
                onChange={event => {
                  setStatusId(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {data.options.statuses.map(status => (
                  <MenuItem key={status.id} value={status.id}>
                    {status.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              {activeFilters > 0 && (
                <Button
                  variant='tonal'
                  color='secondary'
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                    setStatusId('')
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
                startIcon={<i className='tabler-plus' />}
                onClick={() => {
                  setPage(0)
                  setFormOpen(true)
                }}
              >
                {loanType === 'STAFF' ? 'Create Staff Loan' : 'Create Corporate Debt'}
              </Button>
            )}
          </div>
        </CardContent>
        <FinanceLoanTable
          data={data}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          locale={locale}
          dictionary={dictionary}
          canWrite={canWrite}
          canManageStatus={canManageStatus}
          statusUpdating={statusUpdating}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onView={setDetailTarget}
          onPrint={setPrintTarget}
          onRepay={setRepayTarget}
          onStatusChange={changeStatus}
          onApproveAndDisburse={openApproval}
        />
      </Card>
      <FinanceLoanFormDrawer
        open={formOpen}
        initialLoanType={loanType}
        options={data.options}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />
      <FinanceLoanRepaymentDialog
        open={Boolean(repayTarget)}
        loan={repayTarget}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setRepayTarget(null)}
        onSaved={loadData}
      />
      <FinanceLoanDetailModal
        open={Boolean(detailTarget)}
        loan={detailTarget}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setDetailTarget(null)}
      />
      <FinanceLoanPrintVoucherModal
        open={Boolean(printTarget)}
        loan={printTarget}
        setup={setup}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setPrintTarget(null)}
      />
      <Dialog
        open={Boolean(approvalTarget)}
        onClose={statusUpdating ? undefined : () => setApprovalTarget(null)}
        fullWidth
        maxWidth='xs'
      >
        <DialogTitle>Approve & Disburse Staff Loan</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-4 text-start'>
          <CustomTextField
            fullWidth
            select
            label='Payout Account'
            value={payoutMethodId}
            onChange={event => setPayoutMethodId(event.target.value)}
          >
            {data.options.paymentMethods.map(method => (
              <MenuItem key={method.id} value={method.id}>
                {method.value === 'CASH' ? 'Cash Wallet' : 'Bank Account'}
              </MenuItem>
            ))}
          </CustomTextField>
        </DialogContent>
        <DialogActions className='p-6'>
          <Button
            variant='tonal'
            color='secondary'
            disabled={Boolean(statusUpdating)}
            onClick={() => setApprovalTarget(null)}
          >
            {dictionary.actions.cancel}
          </Button>
          <Button
            variant='contained'
            color='success'
            disabled={Boolean(statusUpdating) || !payoutMethodId}
            onClick={approveAndDisburse}
          >
            <LoadingButtonContent loading={Boolean(statusUpdating)} loadingLabel='Approving & Disbursing...'>
              Approve & Disburse
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default FinanceLoansView

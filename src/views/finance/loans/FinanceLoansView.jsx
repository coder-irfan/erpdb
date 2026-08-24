'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import FinancePrintDialog from '@/views/finance/FinancePrintDialog'

import FinanceLoanDetailModal from './FinanceLoanDetailModal'
import FinanceLoanFormDrawer from './FinanceLoanFormDrawer'
import FinanceLoanPrint from './FinanceLoanPrint'
import FinanceLoanRepaymentDialog from './FinanceLoanRepaymentDialog'
import FinanceLoanStatsCards from './FinanceLoanStatsCards'
import FinanceLoanTable from './FinanceLoanTable'

const EMPTY_DATA = {
  loans: [],
  totalCount: 0,
  summary: { active: 0, repaid: 0, recovery: 0, portfolio: 0 },
  options: { statuses: [], staff: [], baseCurrency: 'AFN', exchangeRate: '65.0000' }
}

const FinanceLoansView = ({ locale, dictionary, canWrite, setup }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusId, setStatusId] = useState('')
  const [loanType, setLoanType] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [repayTarget, setRepayTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [autoPrint, setAutoPrint] = useState(false)
  const [printTarget, setPrintTarget] = useState(null)

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
    if (loanType) params.set('loan_type', loanType)
    const response = await fetch(`/api/finance/loans?${params}`, { cache: 'no-store' })
    const result = await response.json()

    if (response.ok && result.success) setData(result.data)
    else toast.error(result.error || dictionary.messages.loadFailed)
    setLoading(false)
  }, [dictionary.messages.loadFailed, loanType, locale, page, rowsPerPage, search, statusId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openDetail = (loan, print = false) => {
    setAutoPrint(print)
    setDetailTarget(loan)
  }

  const activeFilters = [statusId, loanType].filter(Boolean).length

  return (
    <div className='flex flex-col gap-4'>
      <FinanceLoanStatsCards summary={data.summary} locale={locale} dictionary={dictionary} />
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4 border-be border-divider'>
          <CustomTextField
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            className='is-full sm:is-[380px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
          />
          <div className='flex is-full flex-wrap items-center gap-3 sm:is-auto sm:justify-end'>
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
              <CustomTextField
                select
                label={dictionary.filters.type}
                value={loanType}
                onChange={event => {
                  setLoanType(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allTypes}</MenuItem>
                {Object.entries(dictionary.types).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
              {activeFilters > 0 && (
                <Button
                  variant='tonal'
                  color='secondary'
                  onClick={() => {
                    setStatusId('')
                    setLoanType('')
                    setPage(0)
                  }}
                >
                  {dictionary.filters.clear}
                </Button>
              )}
            </TableFiltersPopover>
            {canWrite && (
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setFormOpen(true)}>
                {dictionary.actions.add}
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
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onView={openDetail}
          onPrint={setPrintTarget}
          onRepay={setRepayTarget}
        />
      </Card>
      <FinanceLoanFormDrawer
        open={formOpen}
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
        autoPrint={autoPrint}
        onClose={() => {
          setDetailTarget(null)
          setAutoPrint(false)
        }}
      />
      <FinancePrintDialog open={Boolean(printTarget)} title='LOAN DISBURSEMENT & REPAYMENT VOUCHER' printLabel={dictionary.actions.printVoucher} closeLabel={dictionary.actions.close} onClose={() => setPrintTarget(null)}>
        {printTarget && <FinanceLoanPrint loan={printTarget} setup={setup} locale={locale} />}
      </FinancePrintDialog>
    </div>
  )
}

export default FinanceLoansView

'use client'

import { useCallback, useEffect, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import {
  approveFinanceExpense,
  deleteFinanceExpense,
  getFinanceExpenseFormOptions,
  getFinanceExpenses,
  markFinanceExpensePaid,
  rejectFinanceExpense
} from '@/actions/financeExpense'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import FinancePrintDialog from '@/views/finance/FinancePrintDialog'

import FinanceExpenseDetailModal from './FinanceExpenseDetailModal'
import FinanceExpenseFormDrawer from './FinanceExpenseFormDrawer'
import FinanceExpensePrint from './FinanceExpensePrint'
import FinanceExpenseStatsCards from './FinanceExpenseStatsCards'
import FinanceExpenseTable from './FinanceExpenseTable'

const EMPTY_DATA = {
  expenses: [],
  totalCount: 0,
  baseCurrency: 'AFN',
  summary: { total: 0, project: 0, overhead: 0, month: 0 }
}

const EMPTY_OPTIONS = {
  expenseTypes: [],
  paymentMethods: [],
  projects: [],
  staff: [],
  baseCurrency: 'AFN',
  exchangeRate: '65.0000'
}

const FinanceExpenseView = ({ locale, dictionary, canWrite, canDelete, canApprove, canPay, setup }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeId, setTypeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [detailRefresh, setDetailRefresh] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [printTarget, setPrintTarget] = useState(null)
  const [transitionTarget, setTransitionTarget] = useState(null)
  const [transitionType, setTransitionType] = useState('')
  const [transitionValue, setTransitionValue] = useState('')
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)

    const result = await getFinanceExpenses({
      page: page + 1,
      limit: rowsPerPage,
      search,
      typeId,
      projectId,
      staffId,
      locale
    })

    if (result.success) setData(result.data)
    else toast.error(result.error || dictionary.messages.loadFailed)
    setLoading(false)
  }, [dictionary.messages.loadFailed, locale, page, projectId, rowsPerPage, search, staffId, typeId])

  const loadOptions = useCallback(async () => {
    const [result, categoryResponse] = await Promise.all([
      getFinanceExpenseFormOptions({ locale }),
      fetch('/api/options/expense-categories', { cache: 'no-store' }).catch(() => null)
    ])

    if (!result.success) return toast.error(result.error || dictionary.messages.optionsLoadFailed)
    if (!categoryResponse) return setOptions(result.data)

    try {
      const categoryResult = await categoryResponse.json()

      setOptions({
        ...result.data,
        expenseTypes: categoryResponse.ok && categoryResult.success
          ? categoryResult.data.options
          : result.data.expenseTypes
      })
    } catch {
      setOptions(result.data)
    }
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

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = expense => {
    setEditing(expense)
    setFormOpen(true)
  }

  const remove = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    const result = await deleteFinanceExpense(deleteTarget.id, { locale })

    if (result.success) {
      toast.success(result.message)
      if (detailId === deleteTarget.id) setDetailId(null)
      setDeleteTarget(null)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)

    setDeleting(false)
  }

  const openTransition = (expense, type) => {
    setTransitionTarget(expense)
    setTransitionType(type)
    setTransitionValue(type === 'PAY' ? options.paymentMethods.find(item => item.is_default)?.id || options.paymentMethods[0]?.id || '' : '')
  }

  const runTransition = async () => {
    if (!transitionTarget) return
    setTransitioning(true)

    const result = transitionType === 'APPROVE'
      ? await approveFinanceExpense(transitionTarget.id, { locale })
      : transitionType === 'REJECT'
        ? await rejectFinanceExpense(transitionTarget.id, { locale, reason: transitionValue })
        : await markFinanceExpensePaid(transitionTarget.id, { locale, payment_method_id: transitionValue })

    if (result.success) {
      toast.success(result.message)
      setTransitionTarget(null)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)

    setTransitioning(false)
  }

  const activeFilters = [searchInput.trim(), typeId, projectId, staffId].filter(Boolean).length

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setTypeId('')
    setProjectId('')
    setStaffId('')
    setPage(0)
  }

  return (
    <div className='flex flex-col gap-4'>
      <FinanceExpenseStatsCards
        summary={data.summary}
        locale={locale}
        currency={data.baseCurrency}
        dictionary={dictionary}
      />
      <Card className='border border-divider/70 shadow-sm'>
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
                label={dictionary.filters.type}
                value={typeId}
                onChange={event => {
                  setTypeId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value=''>{dictionary.filters.allTypes}</MenuItem>
                {options.expenseTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <Autocomplete
                options={options.projects}
                value={options.projects.find(project => project.id === projectId) || null}
                onChange={(_, value) => {
                  setProjectId(value?.id || '')
                  setPage(0)
                }}
                getOptionLabel={option => `${option.project_code} · ${option.title}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => (
                  <CustomTextField
                    {...params}
                    label={dictionary.filters.project}
                    placeholder={dictionary.filters.allProjects}
                  />
                )}
              />
              <Autocomplete
                options={options.staff}
                value={options.staff.find(staff => staff.id === staffId) || null}
                onChange={(_, value) => {
                  setStaffId(value?.id || '')
                  setPage(0)
                }}
                getOptionLabel={option => option.full_name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => (
                  <CustomTextField
                    {...params}
                    label={dictionary.filters.staff}
                    placeholder={dictionary.filters.allStaff}
                  />
                )}
              />
              {activeFilters > 0 && (
                <Button variant='tonal' color='secondary' onClick={resetFilters}>
                  {dictionary.filters.clear}
                </Button>
              )}
            </TableFiltersPopover>
            {canWrite && (
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                {dictionary.actions.add}
              </Button>
            )}
          </div>
        </CardContent>
        <FinanceExpenseTable
          data={data}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          locale={locale}
          dictionary={dictionary}
          canWrite={canWrite}
          canDelete={canDelete}
          canApprove={canApprove}
          canPay={canPay}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onView={expense => setDetailId(expense.id)}
          onPrint={setPrintTarget}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onApprove={expense => openTransition(expense, 'APPROVE')}
          onReject={expense => openTransition(expense, 'REJECT')}
          onPay={expense => openTransition(expense, 'PAY')}
          onAdd={openCreate}
        />
      </Card>

      <FinanceExpenseFormDrawer
        open={formOpen}
        expense={editing}
        options={options}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
      <FinanceExpenseDetailModal
        open={Boolean(detailId)}
        expenseId={detailId}
        locale={locale}
        baseCurrency={data.baseCurrency}
        dictionary={dictionary}
        canWrite={canWrite}
        canApprove={canApprove}
        canPay={canPay}
        refreshKey={detailRefresh}
        onClose={() => setDetailId(null)}
        onEdit={expense => {
          setDetailId(null)
          openEdit(expense)
        }}
        onApprove={expense => openTransition(expense, 'APPROVE')}
        onReject={expense => openTransition(expense, 'REJECT')}
        onPay={expense => openTransition(expense, 'PAY')}
      />
      <FinancePrintDialog
        open={Boolean(printTarget)}
        title='PAYMENT / EXPENSE VOUCHER'
        printLabel={dictionary.actions.printVoucher}
        closeLabel={dictionary.actions.close}
        onClose={() => setPrintTarget(null)}
      >
        {printTarget && <FinanceExpensePrint expense={printTarget} setup={setup} locale={locale} />}
      </FinancePrintDialog>
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.details}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
      <Dialog
        open={Boolean(transitionTarget)}
        onClose={transitioning ? undefined : () => setTransitionTarget(null)}
        fullWidth
        maxWidth='xs'
        PaperProps={{ className: 'confirmation-dialog' }}
      >
        <DialogTitle>{dictionary.workflow[transitionType === 'APPROVE' ? 'approveTitle' : transitionType === 'REJECT' ? 'rejectTitle' : 'payTitle']}</DialogTitle>
        <DialogContent dividers>
          {transitionType === 'REJECT' && (
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label={dictionary.fields.rejectionReason}
              value={transitionValue}
              onChange={event => setTransitionValue(event.target.value)}
            />
          )}
          {transitionType === 'PAY' && (
            <CustomTextField
              fullWidth
              select
              label={dictionary.fields.paymentMethod}
              value={transitionValue}
              onChange={event => setTransitionValue(event.target.value)}
            >
              {options.paymentMethods.map(method => <MenuItem key={method.id} value={method.id}>{method.label}</MenuItem>)}
            </CustomTextField>
          )}
          {transitionType === 'APPROVE' && dictionary.workflow.approveDescription}
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' disabled={transitioning} onClick={() => setTransitionTarget(null)}>{dictionary.actions.cancel}</Button>
          <Button variant='contained' color={transitionType === 'REJECT' ? 'error' : 'primary'} disabled={transitioning || (transitionType === 'PAY' && !transitionValue)} onClick={runTransition}>
            {dictionary.actions[transitionType === 'APPROVE' ? 'approve' : transitionType === 'REJECT' ? 'reject' : 'markPaid']}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default FinanceExpenseView

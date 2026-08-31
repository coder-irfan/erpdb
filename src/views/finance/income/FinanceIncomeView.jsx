'use client'

import { useCallback, useEffect, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import {
  deleteFinanceIncome,
  getFinanceIncomeFormOptions,
  getFinanceIncomes,
  markFinanceIncomePaid
} from '@/actions/financeIncome'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import FinancePrintDialog from '@/views/finance/FinancePrintDialog'

import FinanceIncomeDetailModal from './FinanceIncomeDetailModal'
import FinanceIncomeFormDrawer from './FinanceIncomeFormDrawer'
import FinanceIncomePrint from './FinanceIncomePrint'
import FinanceIncomeStatsCards from './FinanceIncomeStatsCards'
import FinanceIncomeTable from './FinanceIncomeTable'

const EMPTY_DATA = {
  incomes: [],
  totalCount: 0,
  baseCurrency: 'AFN',
  summary: { totalIncome: 0, totalCollected: 0, pendingReceivables: 0, overdueReceivables: 0 }
}

const EMPTY_OPTIONS = {
  clients: [],
  projects: [],
  contracts: [],
  invoices: [],
  staff: [],
  incomeTypes: [],
  paymentMethods: [],
  currentStaffId: null,
  baseCurrency: 'AFN',
  exchangeRate: '65.0000'
}

const FinanceIncomeView = ({ locale, dictionary, canWrite, canDelete, setup }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [status, setStatus] = useState('')
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
  const [busyId, setBusyId] = useState(null)
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

    const result = await getFinanceIncomes({
      page: page + 1,
      limit: rowsPerPage,
      search,
      clientId,
      projectId,
      typeId,
      status,
      locale
    })

    if (result.success) setData(result.data)
    else toast.error(result.error || dictionary.messages.loadFailed)
    setLoading(false)
  }, [clientId, dictionary.messages.loadFailed, locale, page, projectId, rowsPerPage, search, status, typeId])

  const loadOptions = useCallback(async () => {
    const result = await getFinanceIncomeFormOptions({ locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.optionsLoadFailed)
    setOptions(result.data)
  }, [dictionary.messages.optionsLoadFailed, locale])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadOptions() }, [loadOptions])

  const refresh = async () => {
    await Promise.all([loadData(), loadOptions()])
    setDetailRefresh(value => value + 1)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = income => {
    setEditing(income)
    setFormOpen(true)
  }

  const markPaid = async income => {
    setBusyId(income.id)
    const result = await markFinanceIncomePaid(income.id, { locale })

    if (result.success) {
      toast.success(result.message)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)

    setBusyId(null)
  }

  const remove = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    const result = await deleteFinanceIncome(deleteTarget.id, { locale })

    if (result.success) {
      toast.success(result.message)
      if (detailId === deleteTarget.id) setDetailId(null)
      setDeleteTarget(null)
      await refresh()
    } else toast.error(result.error || dictionary.messages.operationFailed)

    setDeleting(false)
  }

  const activeFilters = [searchInput.trim(), clientId, projectId, typeId, status].filter(Boolean).length

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setClientId('')
    setProjectId('')
    setTypeId('')
    setStatus('')
    setPage(0)
  }

  return (
    <div className='flex flex-col gap-4'>
      <FinanceIncomeStatsCards summary={data.summary} locale={locale} currency={data.baseCurrency} dictionary={dictionary} />
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
              <Autocomplete
                options={options.clients}
                value={options.clients.find(client => client.id === clientId) || null}
                onChange={(_, value) => {
                  setClientId(value?.id || '')
                  if (projectId && value && options.projects.find(project => project.id === projectId)?.client_id !== value.id) setProjectId('')
                  setPage(0)
                }}
                getOptionLabel={option => option.company_name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => <CustomTextField {...params} label={dictionary.filters.client} placeholder={dictionary.filters.allClients} />}
              />
              <CustomTextField select label={dictionary.filters.project} value={projectId} onChange={event => { setProjectId(event.target.value); setPage(0) }} className='is-full'>
                <MenuItem value=''>{dictionary.filters.allProjects}</MenuItem>
                {options.projects.filter(project => !clientId || project.client_id === clientId).map(project => (
                  <MenuItem key={project.id} value={project.id}>{project.project_code} · {project.title}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField select label={dictionary.filters.type} value={typeId} onChange={event => { setTypeId(event.target.value); setPage(0) }} className='is-full'>
                <MenuItem value=''>{dictionary.filters.allTypes}</MenuItem>
                {options.incomeTypes.map(type => <MenuItem key={type.id} value={type.id}>{type.label}</MenuItem>)}
              </CustomTextField>
              <CustomTextField select label={dictionary.filters.status} value={status} onChange={event => { setStatus(event.target.value); setPage(0) }} className='is-full'>
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {Object.entries(dictionary.status).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </CustomTextField>
              {activeFilters > 0 && <Button variant='tonal' color='secondary' onClick={resetFilters}>{dictionary.filters.clear}</Button>}
            </TableFiltersPopover>
            {canWrite && <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>{dictionary.actions.add}</Button>}
          </div>
        </CardContent>
        <FinanceIncomeTable
          data={data}
          loading={loading}
          busyId={busyId}
          page={page}
          rowsPerPage={rowsPerPage}
          locale={locale}
          dictionary={dictionary}
          canWrite={canWrite}
          canDelete={canDelete}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPage(0) }}
          onView={income => setDetailId(income.id)}
          onPrint={setPrintTarget}
          onEdit={openEdit}
          onMarkPaid={markPaid}
          onDelete={setDeleteTarget}
          onAdd={openCreate}
        />
      </Card>

      <FinanceIncomeFormDrawer
        open={formOpen}
        income={editing}
        options={options}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
      <FinanceIncomeDetailModal
        open={Boolean(detailId)}
        incomeId={detailId}
        locale={locale}
        baseCurrency={data.baseCurrency}
        dictionary={dictionary}
        canWrite={canWrite}
        refreshKey={detailRefresh}
        onClose={() => setDetailId(null)}
        onEdit={income => {
          setDetailId(null)
          openEdit(income)
        }}
      />
      <FinancePrintDialog open={Boolean(printTarget)} title='OFFICIAL PAYMENT RECEIPT' printLabel={dictionary.actions.printReceipt} closeLabel={dictionary.actions.close} onClose={() => setPrintTarget(null)}>
        {printTarget && <FinanceIncomePrint income={printTarget} setup={setup} locale={locale} />}
      </FinancePrintDialog>
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default FinanceIncomeView

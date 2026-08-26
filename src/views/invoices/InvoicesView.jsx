'use client'

import { useCallback, useEffect, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { deleteInvoice, getInvoiceFormOptions, getInvoices, updateInvoiceStatus } from '@/actions/invoices'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'

import InvoiceFormDrawer from './InvoiceFormDrawer'
import InvoicePaymentDialog from './InvoicePaymentDialog'
import InvoicePrintModal from './InvoicePrintModal'
import InvoiceStatsCards from './InvoiceStatsCards'
import InvoiceTableView from './InvoiceTableView'

const EMPTY_DATA = {
  invoices: [], totalCount: 0, statuses: [], baseCurrency: 'AFN',
  summary: { totalInvoiced: 0, paidRevenue: 0, overdueCount: 0, overdueAmount: 0, outstandingBalance: 0 }
}

const EMPTY_OPTIONS = { contracts: [], clients: [], statuses: [], paymentMethods: [], baseCurrency: 'AFN', exchangeRate: '65.0000' }

const InvoicesView = ({ locale, dictionary, setup, canWrite, canDelete }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusId, setStatusId] = useState('')
  const [clientId, setClientId] = useState('')
  const [contractId, setContractId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [printInvoice, setPrintInvoice] = useState(null)
  const [paymentInvoice, setPaymentInvoice] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPage(0) }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await getInvoices({ page: page + 1, limit: rowsPerPage, search, statusId, clientId, contractId, fromDate, toDate, locale })

    if (!result.success) toast.error(result.error || dictionary.messages.loadFailed)
    else setData(result.data)
    setLoading(false)
  }, [clientId, contractId, dictionary.messages.loadFailed, fromDate, locale, page, rowsPerPage, search, statusId, toDate])

  const loadOptions = useCallback(async () => {
    const result = await getInvoiceFormOptions({ locale })

    if (!result.success) toast.error(result.error || dictionary.messages.optionsLoadFailed)
    else setOptions(result.data)
  }, [dictionary.messages.optionsLoadFailed, locale])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadOptions() }, [loadOptions])

  const refresh = async () => { await Promise.all([loadData(), loadOptions()]) }
  const openCreate = () => { setEditingInvoice(null); setFormOpen(true) }
  const edit = invoice => { setEditingInvoice(invoice); setFormOpen(true) }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteInvoice(deleteTarget.id, { locale })

    if (!result.success) toast.error(result.error || dictionary.messages.operationFailed)
    else { toast.success(result.message); setDeleteTarget(null); await refresh() }

    setDeleting(false)
  }

  const changeStatus = async (invoice, nextStatusId) => {
    if (!nextStatusId || nextStatusId === invoice.status_id) return
    setStatusUpdating(invoice.id)

    const result = await updateInvoiceStatus(invoice.id, nextStatusId, { locale })

    if (!result.success) toast.error(result.error || dictionary.messages.operationFailed)
    else {
      toast.success(result.message)
      await loadData()
    }

    setStatusUpdating(null)
  }

  const activeFilterCount = Number(Boolean(statusId)) + Number(Boolean(clientId)) + Number(Boolean(contractId)) + Number(Boolean(fromDate || toDate))

  return (
    <div className='flex flex-col gap-4'>
      <InvoiceStatsCards summary={data.summary} locale={locale} currency={data.baseCurrency} dictionary={dictionary} />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField label={dictionary.filters.search} placeholder={dictionary.filters.searchPlaceholder} value={searchInput} onChange={event => setSearchInput(event.target.value)} className='is-full sm:is-[360px]' slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }} />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover activeCount={activeFilterCount} locale={locale}>
              <CustomTextField select label={dictionary.filters.status} value={statusId} onChange={event => { setStatusId(event.target.value); setPage(0) }} className='is-full' slotProps={{ select: { displayEmpty: true, renderValue: selected => options.statuses.find(status => status.id === selected)?.label || dictionary.filters.allStatuses } }}>
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>{options.statuses.map(status => <MenuItem key={status.id} value={status.id}>{status.label}</MenuItem>)}
              </CustomTextField>
              <Autocomplete options={options.clients} value={options.clients.find(client => client.id === clientId) || null} onChange={(_, value) => { setClientId(value?.id || ''); setPage(0) }} getOptionLabel={option => option.company_name} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={params => <CustomTextField {...params} label={dictionary.filters.client} placeholder={dictionary.filters.allClients} />} />
              <Autocomplete options={options.contracts} value={options.contracts.find(contract => contract.id === contractId) || null} onChange={(_, value) => { setContractId(value?.id || ''); setPage(0) }} getOptionLabel={option => `${option.contract_number} — ${option.title}`} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={params => <CustomTextField {...params} label={dictionary.filters.contract} placeholder={dictionary.filters.allContracts} />} />
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <CustomTextField type='date' label={dictionary.filters.fromDate} value={fromDate} onChange={event => { setFromDate(event.target.value); setPage(0) }} slotProps={{ inputLabel: { shrink: true } }} />
                <CustomTextField type='date' label={dictionary.filters.toDate} value={toDate} onChange={event => { setToDate(event.target.value); setPage(0) }} slotProps={{ inputLabel: { shrink: true } }} />
              </div>
              {activeFilterCount > 0 && <Button variant='tonal' color='secondary' onClick={() => { setStatusId(''); setClientId(''); setContractId(''); setFromDate(''); setToDate(''); setPage(0) }}>{dictionary.filters.clear}</Button>}
            </TableFiltersPopover>
            {canWrite && <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>{dictionary.actions.create}</Button>}
          </div>
        </CardContent>
        <InvoiceTableView data={data} loading={loading} statusUpdating={statusUpdating} page={page} rowsPerPage={rowsPerPage} locale={locale} dictionary={dictionary} canWrite={canWrite} canDelete={canDelete} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPage(0) }} onView={setPrintInvoice} onPay={setPaymentInvoice} onEdit={edit} onDelete={setDeleteTarget} onStatusChange={changeStatus} onAdd={openCreate} />
      </Card>
      <InvoiceFormDrawer open={formOpen} invoice={editingInvoice} options={options} locale={locale} dictionary={dictionary} onClose={() => setFormOpen(false)} onSaved={refresh} />
      <InvoicePaymentDialog open={Boolean(paymentInvoice)} invoice={paymentInvoice} paymentMethods={options.paymentMethods} locale={locale} dictionary={dictionary} onClose={() => setPaymentInvoice(null)} onSaved={refresh} />
      <InvoicePrintModal open={Boolean(printInvoice)} invoice={printInvoice} setup={setup} locale={locale} dictionary={dictionary} onClose={() => setPrintInvoice(null)} />
      <ConfirmDeleteModal open={Boolean(deleteTarget)} title={dictionary.delete.title} description={dictionary.delete.description} itemName={deleteTarget?.invoice_number} confirmText={dictionary.actions.delete} cancelText={dictionary.actions.cancel} loading={deleting} onConfirm={remove} onClose={() => setDeleteTarget(null)} />
    </div>
  )
}

export default InvoicesView

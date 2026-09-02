'use client'

import { useCallback, useEffect, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { deleteContract, getContractFormOptions, getContracts, runContractExpirationAudit, updateContractStatus } from '@/actions/contracts'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import { CONTRACT_TYPE_DOMAINS } from '@/data/contractTypes'

import ContractDetailModal from './ContractDetailModal'
import ContractPrintModal from './ContractPrintModal'
import ContractFormDrawer from './ContractFormDrawer'
import ContractStatsCards from './ContractStatsCards'
import ContractTableView from './ContractTableView'
import ContractTerminationDialog from './ContractTerminationDialog'
import OthersContractTableView from './OthersContractTableView'

const EMPTY_DATA = {
  contracts: [], totalCount: 0, statuses: [], baseCurrency: 'AFN',
  summary: { activeCount: 0, activeValue: 0, expiringCount: 0, expiringValue: 0, monthlyActiveRevenue: 0, draftCount: 0 }
}

const EMPTY_OPTIONS = {
  clients: [], vendors: [], staff: [],
  leads: [], templates: [],
  options: { CONTRACT_TYPE: [], CONTRACT_TYPES: [], CONTRACT_DURATION: [], CONTRACT_COUNTRY: [], COUNTRY: [], CONTRACT_LEVEL: [], CONTRACT_STATUS: [] },
  baseCurrency: 'AFN', exchangeRate: '65.0000'
}

const ContractsView = ({ locale, dictionary, setup, canWrite, canDelete, canRunAudit, scope = 'CUSTOMER', contractContext = scope }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [clientId, setClientId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY_DATA)
  const [formOptions, setFormOptions] = useState(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [printId, setPrintId] = useState(null)
  const [detailRefresh, setDetailRefresh] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(null)
  const [auditRunning, setAuditRunning] = useState(false)
  const [terminationTarget, setTerminationTarget] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPage(0) }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await getContracts({ page: page + 1, limit: rowsPerPage, search, statusFilter, serviceTypeId, clientId, fromDate, toDate, scope, locale })

    if (!result.success) toast.error(result.error || dictionary.messages.loadFailed)
    else setData(result.data)
    setLoading(false)
  }, [clientId, dictionary.messages.loadFailed, fromDate, locale, page, rowsPerPage, scope, search, serviceTypeId, statusFilter, toDate])

  const loadOptions = useCallback(async () => {
    const result = await getContractFormOptions({ locale })

    if (!result.success) toast.error(result.error || dictionary.messages.optionsLoadFailed)
    else setFormOptions(result.data)
  }, [dictionary.messages.optionsLoadFailed, locale])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadOptions() }, [loadOptions])

  const refresh = async () => {
    await Promise.all([loadData(), loadOptions()])
    setDetailRefresh(value => value + 1)
  }

  const openCreate = () => { setPage(0); setEditingContract(null); setFormOpen(true) }
  const edit = contract => { setEditingContract(contract); setFormOpen(true) }

  const performStatusChange = async (contract, statusId, reason = '') => {
    if (statusId === contract.status_id) return
    setStatusUpdating(contract.id)
    const result = await updateContractStatus(contract.id, statusId, { locale, reason })

    if (!result.success) toast.error(result.error || dictionary.messages.operationFailed)
    else {
      toast.success(result.message)
      setTerminationTarget(null)
      await refresh()
    }

    setStatusUpdating(null)
  }

  const changeStatus = async (contract, statusId) => {
    const nextStatus = data.statuses.find(status => status.id === statusId)

    if (nextStatus?.value === 'TERMINATED') {
      setTerminationTarget({ contract, statusId })

      return
    }

    await performStatusChange(contract, statusId)
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteContract(deleteTarget.id, { locale })

    if (!result.success) toast.error(result.error || dictionary.messages.operationFailed)
    else { toast.success(result.message); if (detailId === deleteTarget.id) setDetailId(null); setDeleteTarget(null); await loadData() }

    setDeleting(false)
  }

  const runAudit = async () => {
    setAuditRunning(true)
    const result = await runContractExpirationAudit({ locale })

    if (!result.success) toast.error(result.error || dictionary.messages.auditFailed)
    else {
      toast.success(dictionary.messages.auditResult.replace('{sent}', result.data.sent).replace('{skipped}', result.data.skipped).replace('{failed}', result.data.failed))
      await refresh()
    }

    setAuditRunning(false)
  }

  const statusFilters = [['ALL', dictionary.filters.allStatuses], ['ACTIVE', dictionary.tabs.active], ['EXPIRING', dictionary.tabs.expiring], ['DRAFT', dictionary.tabs.draft], ['EXPIRED', dictionary.tabs.expired]]

  const filterTypeOptions = (formOptions.options.CONTRACT_TYPES || []).filter(option => {
    const expectedCategory = CONTRACT_TYPE_DOMAINS[contractContext]

    return (
      option.category === expectedCategory ||
      (['CUSTOMER', 'OTHERS'].includes(contractContext) && option.category === 'CONTRACT_TYPE')
    )
  })

  const activeFilterCount = Number(Boolean(searchInput.trim())) + Number(statusFilter !== 'ALL') + Number(Boolean(serviceTypeId)) + Number(Boolean(clientId)) + Number(Boolean(fromDate || toDate))
  const TableView = scope === 'OTHERS' ? OthersContractTableView : ContractTableView

  return (
    <div className='flex flex-col gap-4'>
      <ContractStatsCards summary={data.summary} locale={locale} currency={data.baseCurrency} dictionary={dictionary} variant={scope === 'OTHERS' ? 'others' : 'default'} />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField label={dictionary.filters.search} placeholder={dictionary.filters.searchPlaceholder} value={searchInput} onChange={event => setSearchInput(event.target.value)} className='is-full sm:is-[360px]' slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }} />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover activeCount={activeFilterCount} locale={locale}>
              <CustomTextField select label={dictionary.filters.status} value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(0) }} className='is-full'>
                {statusFilters.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </CustomTextField>
              <CustomTextField select label={dictionary.filters.serviceType} value={serviceTypeId} onChange={event => { setServiceTypeId(event.target.value); setPage(0) }} className='is-full' slotProps={{ select: { displayEmpty: true, renderValue: selected => filterTypeOptions.find(option => option.id === selected)?.label || dictionary.filters.allServices } }}>
                <MenuItem value=''>{dictionary.filters.allServices}</MenuItem>
                {filterTypeOptions.map(option => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </CustomTextField>
              {scope !== 'OTHERS' && <Autocomplete options={formOptions.clients} value={formOptions.clients.find(client => client.id === clientId) || null} onChange={(_, value) => { setClientId(value?.id || ''); setPage(0) }} getOptionLabel={option => option.company_name} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={params => <CustomTextField {...params} label={dictionary.filters.client} placeholder={dictionary.filters.allClients} />} />}
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <NativeDateTimeInput locale={locale} label={dictionary.filters.fromDate} value={fromDate} onChange={event => { setFromDate(event.target.value); setPage(0) }} />
                <NativeDateTimeInput locale={locale} label={dictionary.filters.toDate} value={toDate} onChange={event => { setToDate(event.target.value); setPage(0) }} />
              </div>
              {activeFilterCount > 0 && <Button variant='tonal' color='secondary' onClick={() => { setSearchInput(''); setSearch(''); setStatusFilter('ALL'); setServiceTypeId(''); setClientId(''); setFromDate(''); setToDate(''); setPage(0) }}>{dictionary.filters.clear}</Button>}
            </TableFiltersPopover>
            {canRunAudit && <Button variant='tonal' color='secondary' startIcon={<i className='tabler-mail-cog' />} disabled={auditRunning} onClick={runAudit}>{auditRunning ? dictionary.actions.runningAudit : dictionary.actions.runAudit}</Button>}
            {canWrite && <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>{dictionary.actions.add}</Button>}
          </div>
        </CardContent>
        <TableView data={data} loading={loading} statusUpdating={statusUpdating} page={page} rowsPerPage={rowsPerPage} locale={locale} dictionary={dictionary} canWrite={canWrite} canDelete={canDelete} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setRowsPerPage(Number(event.target.value)); setPage(0) }} onView={contract => setDetailId(contract.id)} onPrint={contract => setPrintId(contract.id)} onEdit={edit} onDelete={setDeleteTarget} onStatusChange={changeStatus} onAdd={openCreate} />
      </Card>
      <ContractFormDrawer open={formOpen} contract={editingContract} formOptions={formOptions} locale={locale} dictionary={dictionary} contractContext={contractContext} onClose={() => setFormOpen(false)} onSaved={refresh} />
      <ContractDetailModal open={Boolean(detailId)} contractId={detailId} locale={locale} baseCurrency={data.baseCurrency} dictionary={dictionary} canWrite={canWrite} refreshKey={detailRefresh} contractContext={contractContext} onClose={() => setDetailId(null)} onEdit={edit} />
      <ContractPrintModal open={Boolean(printId)} contractId={printId} setup={setup} locale={locale} dictionary={dictionary} other={scope === 'OTHERS'} onClose={() => setPrintId(null)} />
      <ConfirmDeleteModal open={Boolean(deleteTarget)} title={dictionary.delete.title} description={dictionary.delete.description} itemName={deleteTarget?.contract_number} confirmText={dictionary.actions.delete} cancelText={dictionary.actions.cancel} loading={deleting} onConfirm={remove} onClose={() => setDeleteTarget(null)} />
      <ContractTerminationDialog
        open={Boolean(terminationTarget)}
        contract={terminationTarget?.contract}
        loading={Boolean(terminationTarget && statusUpdating === terminationTarget.contract.id)}
        onClose={() => setTerminationTarget(null)}
        onConfirm={reason => performStatusChange(terminationTarget.contract, terminationTarget.statusId, reason)}
      />
    </div>
  )
}

export default ContractsView

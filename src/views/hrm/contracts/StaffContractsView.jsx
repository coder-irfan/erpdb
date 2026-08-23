'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { getStaffContracts, updateStaffContractStatus } from '@/actions/hrm/contracts'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { formatCurrency } from '@/utils/formatCurrency'

import StaffContractDetailDialog from './StaffContractDetailDialog'
import ContractFormDrawer from '@/views/contracts/ContractFormDrawer'
import StaffContractStatsCards from './StaffContractStatsCards'

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const STATUS_COLORS = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  EXPIRED: 'warning',
  TERMINATED: 'error'
}

const formatDate = (value, locale) =>
  value ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : '—'

const StaffContractsView = ({ initialResult, initialError, formOptions, canWrite, locale, dictionary, contractDictionary }) => {
  const [contracts, setContracts] = useState(initialResult.contracts)
  const [totalCount, setTotalCount] = useState(initialResult.totalCount)
  const [summary, setSummary] = useState(initialResult.summary || { active: 0, expiringSoon: 0, draft: 0, totalValue: 0 })
  const [page, setPage] = useState(Math.max(0, initialResult.page - 1))
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusId, setStatusId] = useState('')
  const [contractTypeId, setContractTypeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [viewingContract, setViewingContract] = useState(null)

  const currencyCode = formOptions.setup.currency_code || 'AFN'
  const filterContractTypes = useMemo(() => formOptions.contractTypes || [], [formOptions.contractTypes])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const refreshData = useCallback(async () => {
    setLoading(true)

    try {
      const result = await getStaffContracts({
        page: page + 1,
        limit: rowsPerPage,
        search,
        statusId,
        contractTypeId,
        locale
      })

      if (!result.success) {
        toast.error(result.error)

        return
      }

      setContracts(result.data.contracts)
      setTotalCount(result.data.totalCount)
      setSummary(result.data.summary)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [contractTypeId, dictionary.messages.loadFailed, locale, page, rowsPerPage, search, statusId])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const openCreate = () => {
    setEditingContract(null)
    setDrawerOpen(true)
  }

  const openEdit = contract => {
    setViewingContract(null)
    setEditingContract(contract)
    setDrawerOpen(true)
  }

  const handleSaved = contract => {
    setContracts(current => {
      const exists = current.some(item => item.id === contract.id)

      return exists ? current.map(item => (item.id === contract.id ? contract : item)) : [contract, ...current]
    })

    if (!contracts.some(item => item.id === contract.id)) setTotalCount(current => current + 1)
    void refreshData()
  }

  const handleStatusChange = async (contract, nextStatusId) => {
    if (nextStatusId === contract.status_id) return

    setBusyId(contract.id)

    try {
      const result = await updateStaffContractStatus(contract.id, nextStatusId, { locale })

      if (!result.success) {
        toast.error(result.error)

        return
      }

      setContracts(current => current.map(item => (item.id === contract.id ? result.data : item)))
      await refreshData()
      toast.success(result.message)
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const renderContractActions = contract => (
    <EntityActionsMenu
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => setViewingContract(contract) },
        {
          label: dictionary.actions.print,
          icon: 'tabler-printer',
          onClick: () => window.open(`/${locale}/hrm/contracts/${contract.id}/print`, '_blank', 'noopener,noreferrer')
        },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => openEdit(contract) }
      ]}
      statusOptions={
        canWrite
          ? formOptions.statuses.map(status => ({
              ...status,
              label: dictionary.status[status.value] || status.label
            }))
          : []
      }
      currentStatus={contract.status_id}
      statusDisabled={busyId === contract.id}
      changeStatusLabel={dictionary.actions.changeStatus}
      moreActionsLabel={dictionary.table.actions}
      onStatusChange={nextStatusId => handleStatusChange(contract, nextStatusId)}
    />
  )

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      <StaffContractStatsCards
        summary={summary}
        locale={locale}
        currency={currencyCode}
        dictionary={dictionary.stats}
      />
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4 border-be border-divider'>
          <CustomTextField
            className='is-full sm:max-is-[320px]'
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder={dictionary.filters.searchPlaceholder}
            label={dictionary.filters.search}
            slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
          />
          <div className='flex is-full flex-wrap items-center gap-3 sm:is-auto sm:justify-end'>
            <TableFiltersPopover
              activeCount={Number(Boolean(statusId)) + Number(Boolean(contractTypeId))}
              locale={locale}
            >
              <CustomTextField
                select
                className='is-full'
                value={statusId}
                label={dictionary.filters.status}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selectedId => {
                      const selected = formOptions.statuses.find(status => status.id === selectedId)

                      return selected
                        ? dictionary.status[selected.value] || selected.label
                        : dictionary.filters.allStatuses
                    }
                  }
                }}
                onChange={event => {
                  setStatusId(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {formOptions.statuses.map(status => (
                  <MenuItem key={status.id} value={status.id}>
                    {dictionary.status[status.value] || status.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                className='is-full'
                value={contractTypeId}
                label={dictionary.filters.contractType}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selectedId =>
                      filterContractTypes.find(type => type.id === selectedId)?.label ||
                      dictionary.filters.allContractTypes
                  }
                }}
                onChange={event => {
                  setContractTypeId(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allContractTypes}</MenuItem>
                {filterContractTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </TableFiltersPopover>
            {canWrite && (
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                {dictionary.actions.add}
              </Button>
            )}
          </div>
        </CardContent>
        {initialError && <Alert severity='error'>{initialError}</Alert>}
        <ResponsiveDataTable
          mobileRows={contracts}
          loading={loading}
          getMobileRowId={contract => contract.id}
          renderMobilePrimary={contract => (
            <div>
              <Typography className='font-semibold' color='primary.main'>{contract.contract_number}</Typography>
              <Typography variant='body2' color='text.secondary'>{contract.staff.full_name}</Typography>
            </div>
          )}
          renderMobileStatus={contract => (
            <Chip
              size='small'
              variant='tonal'
              color={STATUS_COLORS[contract.status.value] || 'default'}
              label={dictionary.status[contract.status.value] || contract.status.label}
            />
          )}
          renderMobileActions={renderContractActions}
          mobileMetadata={[
            { id: 'position', label: dictionary.table.position, render: contract => contract.position_title },
            { id: 'type', label: dictionary.table.contractType, render: contract => contract.contract_type.label },
            {
              id: 'salary',
              label: dictionary.table.salary,
              render: contract => formatCurrency(contract.base_salary, locale, contract.currency || currencyCode)
            },
            {
              id: 'period',
              label: dictionary.table.period,
              render: contract => `${formatDate(contract.start_date, locale)} — ${formatDate(contract.end_date, locale)}`
            }
          ]}
          emptyState={{
            icon: 'tabler-file-certificate',
            title: dictionary.table.emptyTitle,
            description: dictionary.table.emptyDescription,
            actionLabel: canWrite ? dictionary.actions.addFirst : undefined,
            onAction: canWrite ? openCreate : undefined
          }}
        >
          <div className='no-scrollbar overflow-x-auto scroll-smooth'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.table.contractNumber}</th>
                <th>{dictionary.table.staff}</th>
                <th>{dictionary.table.position}</th>
                <th>{dictionary.table.contractType}</th>
                <th>{dictionary.table.salary}</th>
                <th>{dictionary.table.period}</th>
                <th>{dictionary.table.status}</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={8} />
              ) : contracts.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={8}
                  icon='tabler-file-certificate'
                  title={dictionary.table.emptyTitle}
                  description={dictionary.table.emptyDescription}
                  actionLabel={canWrite ? dictionary.actions.addFirst : undefined}
                  onAction={canWrite ? openCreate : undefined}
                />
              ) : (
                contracts.map(contract => (
                  <tr key={contract.id}>
                    <td>
                      <div className='flex min-is-[170px] items-center gap-3'>
                        <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primaryLighter text-primary'>
                          <i className='tabler-file-certificate text-xl' />
                        </span>
                        <Typography className='font-semibold' color='primary.main'>
                          {contract.contract_number}
                        </Typography>
                      </div>
                    </td>
                    <td>
                      <Typography color='text.primary'>{contract.staff.full_name}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {contract.staff.email}
                      </Typography>
                    </td>
                    <td>{contract.position_title}</td>
                    <td>{contract.contract_type.label}</td>
                    <td>
                      <Typography
                        component='span'
                        className='inline-flex rounded bg-successLighter px-3 py-1 font-semibold text-success'
                      >
                        {formatCurrency(contract.base_salary, locale, contract.currency || currencyCode)}
                      </Typography>
                    </td>
                    <td className='whitespace-nowrap'>
                      <Typography variant='body2'>{formatDate(contract.start_date, locale)}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(contract.end_date, locale)}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={STATUS_COLORS[contract.status.value] || 'default'}
                        label={dictionary.status[contract.status.value] || contract.status.label}
                      />
                    </td>
                    <td className='text-end'>
                      {renderContractActions(contract)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </ResponsiveDataTable>
        <DashboardTablePagination
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageLabel={dictionary.table.rowsPerPage}
          ofLabel={dictionary.table.of}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
        />
      </Card>

      <ContractFormDrawer
        open={drawerOpen}
        contract={editingContract}
        formOptions={formOptions}
        locale={locale}
        dictionary={contractDictionary}
        defaultTarget='HRM'
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
      <StaffContractDetailDialog
        open={Boolean(viewingContract)}
        contract={viewingContract}
        locale={locale}
        dictionary={{ ...dictionary, currencyCode }}
        onClose={() => setViewingContract(null)}
        onEdit={openEdit}
      />
    </div>
  )
}

export default StaffContractsView

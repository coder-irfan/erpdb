'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { getStaffContracts, updateStaffContractStatus } from '@/actions/hrm/contracts'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { formatCurrency } from '@/utils/formatCurrency'

import StaffContractDetailDialog from './StaffContractDetailDialog'
import StaffContractDrawer from './StaffContractDrawer'

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const STATUS_COLORS = { ACTIVE: 'success', EXPIRED: 'warning', TERMINATED: 'error', DRAFT: 'secondary' }

const formatDate = (value, locale) =>
  value ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : '—'

const StaffContractsView = ({ initialResult, initialError, formOptions, canWrite, locale, dictionary }) => {
  const [contracts, setContracts] = useState(initialResult.contracts)
  const [totalCount, setTotalCount] = useState(initialResult.totalCount)
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
  const filterPolicies = useMemo(() => formOptions.policies, [formOptions.policies])

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
      toast.success(result.message)
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title={dictionary.title}
          subheader={dictionary.description}
          action={
            canWrite ? (
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                {dictionary.actions.add}
              </Button>
            ) : null
          }
        />
        <CardContent className='mb-4 flex flex-wrap items-center justify-between gap-4 border-bs pt-5'>
          <CustomTextField
            className='is-full sm:max-is-[280px]'
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder={dictionary.filters.searchPlaceholder}
            label={dictionary.filters.search}
            slotProps={{ input: { startAdornment: <i className='tabler-search me-2 text-textSecondary' /> } }}
          />
          <div className='flex is-full flex-wrap items-center gap-3 sm:is-auto sm:justify-end'>
            <CustomTextField
              select
              className='is-full sm:is-[190px]'
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
              className='is-full sm:is-[220px]'
              value={contractTypeId}
              label={dictionary.filters.contractType}
              slotProps={{
                select: {
                  displayEmpty: true,
                  renderValue: selectedId =>
                    filterPolicies.find(policy => policy.id === selectedId)?.label || dictionary.filters.allContractTypes
                }
              }}
              onChange={event => {
                setContractTypeId(event.target.value)
                setPage(0)
              }}
            >
              <MenuItem value=''>{dictionary.filters.allContractTypes}</MenuItem>
              {filterPolicies.map(policy => (
                <MenuItem key={policy.id} value={policy.id}>
                  {policy.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </div>
        </CardContent>
        {initialError && <Alert severity='error'>{initialError}</Alert>}
        <div className='overflow-x-auto'>
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
                <th className='text-right'>{dictionary.table.actions}</th>
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
                        <Typography className='font-semibold' color='primary.main'>{contract.contract_number}</Typography>
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
                      <Typography component='span' className='inline-flex rounded bg-successLight px-3 py-1 font-semibold text-success'>
                        {formatCurrency(contract.base_salary, locale, currencyCode)}
                      </Typography>
                    </td>
                    <td className='whitespace-nowrap'>
                      <Typography variant='body2'>{formatDate(contract.start_date, locale)}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(contract.end_date, locale)}
                      </Typography>
                    </td>
                    <td className='text-right'>
                      {canWrite ? (
                        <CustomTextField
                          select
                          size='small'
                          value={contract.status_id}
                          disabled={busyId === contract.id}
                          slotProps={{
                            select: {
                              renderValue: selectedId => {
                                const selectedStatus =
                                  formOptions.statuses.find(status => status.id === selectedId) || contract.status

                                const statusValue = selectedStatus.value

                                return (
                                  <Chip
                                    size='small'
                                    variant='tonal'
                                    color={STATUS_COLORS[statusValue] || 'default'}
                                    label={dictionary.status[statusValue] || selectedStatus.label}
                                  />
                                )
                              }
                            }
                          }}
                          onChange={event => handleStatusChange(contract, event.target.value)}
                        >
                          {formOptions.statuses.map(status => (
                            <MenuItem key={status.id} value={status.id}>
                              {dictionary.status[status.value] || status.label}
                            </MenuItem>
                          ))}
                          {!formOptions.statuses.some(status => status.id === contract.status_id) && (
                            <MenuItem value={contract.status_id} disabled>
                              {dictionary.status[contract.status.value] || contract.status.label}
                            </MenuItem>
                          )}
                        </CustomTextField>
                      ) : (
                        <Chip
                          size='small'
                          variant='tonal'
                          color={STATUS_COLORS[contract.status.value] || 'default'}
                          label={dictionary.status[contract.status.value] || contract.status.label}
                        />
                      )}
                    </td>
                    <td>
                      <div className='flex justify-end gap-1'>
                        <Tooltip title={dictionary.actions.view}>
                          <IconButton size='small' onClick={() => setViewingContract(contract)}>
                            <i className='tabler-eye' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={dictionary.actions.print}>
                          <Link
                            href={`/${locale}/hrm/contracts/${contract.id}/print`}
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label={dictionary.actions.print}
                          >
                            <IconButton size='small' component='span'>
                              <i className='tabler-printer' />
                            </IconButton>
                          </Link>
                        </Tooltip>
                        {canWrite && (
                          <Tooltip title={dictionary.actions.edit}>
                            <IconButton size='small' onClick={() => openEdit(contract)}>
                              <i className='tabler-edit' />
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

      <StaffContractDrawer
        open={drawerOpen}
        contract={editingContract}
        options={formOptions}
        locale={locale}
        dictionary={dictionary}
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
    </>
  )
}

export default StaffContractsView

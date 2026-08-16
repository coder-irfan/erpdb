'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { deleteOption, getOptionsListPaginated, toggleOptionStatus } from '@/actions/options'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'

import LeaveTypeForm from './LeaveTypeForm'

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))

const LeaveTypeTable = ({ initialResult, initialError, canCreate, canUpdate, canDelete, locale, dictionary }) => {
  const [options, setOptions] = useState(initialResult.options)
  const [totalCount, setTotalCount] = useState(initialResult.totalCount)
  const [page, setPage] = useState(Math.max(0, initialResult.page - 1))
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingOption, setEditingOption] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

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
      const result = await getOptionsListPaginated({
        category: 'LEAVE_TYPE',
        page: page + 1,
        limit: rowsPerPage,
        search,
        locale
      })

      if (!result.success) {
        toast.error(result.error)

        return
      }

      setOptions(result.data.options)
      setTotalCount(result.data.totalCount)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.messages.loadFailed, locale, page, rowsPerPage, search])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const toggleStatus = async option => {
    setBusyId(option.id)

    try {
      const result = await toggleOptionStatus(option.id, !option.is_active, { locale })

      if (!result.success) return toast.error(result.error)

      toast.success(result.message)
      await refreshData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setBusyId(deleteTarget.id)

    try {
      const result = await deleteOption(deleteTarget.id, { locale })

      if (!result.success) return toast.error(result.error)

      toast.success(result.message)
      setDeleteTarget(null)
      await refreshData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader title={dictionary.leaveTypes.title} subheader={dictionary.leaveTypes.description} />
        {initialError && (
          <CardContent className='pb-0'>
            <Alert severity='error'>{initialError}</Alert>
          </CardContent>
        )}
        <CardContent className='border-bs border-divider'>
          <div className='mb-4 mt-5 flex flex-wrap items-center justify-between gap-4'>
            <CustomTextField
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              label={dictionary.common.search}
              placeholder={dictionary.leaveTypes.searchPlaceholder}
              className='is-full sm:is-[260px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search me-2 text-textSecondary' /> } }}
            />
            {canCreate && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => {
                  setEditingOption(null)
                  setFormOpen(true)
                }}
                className='is-full sm:is-auto'
              >
                {dictionary.leaveTypes.add}
              </Button>
            )}
          </div>
        </CardContent>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.leaveTypes.table.title}</th>
                <th>{dictionary.leaveTypes.table.description}</th>
                <th>{dictionary.common.status}</th>
                <th>{dictionary.common.createdDate}</th>
                <th className='text-right'>{dictionary.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={5} />
              ) : options.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={5}
                  icon='tabler-calendar-off'
                  title={dictionary.leaveTypes.emptyTitle}
                  description={dictionary.leaveTypes.emptyDescription}
                  actionLabel={canCreate ? dictionary.leaveTypes.addFirst : null}
                  onAction={
                    canCreate
                      ? () => {
                          setEditingOption(null)
                          setFormOpen(true)
                        }
                      : null
                  }
                />
              ) : (
                options.map(option => (
                  <tr key={option.id}>
                    <td>
                      <Typography color='text.primary' className='min-is-[210px] font-medium'>
                        {option.name}
                      </Typography>
                    </td>
                    <td>
                      <Typography
                        color='text.secondary'
                        className='max-is-[440px] truncate'
                        title={option.description || ''}
                      >
                        {option.description || dictionary.common.noDescription}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={option.is_active ? 'success' : 'secondary'}
                        label={option.is_active ? dictionary.common.active : dictionary.common.inactive}
                      />
                    </td>
                    <td>{formatDate(option.created_at, locale)}</td>
                    <td className='text-right'>
                      <div className='flex min-is-[120px] items-center justify-end gap-1'>
                        {canUpdate && (
                          <>
                            <Tooltip title={dictionary.common.edit}>
                              <IconButton
                                onClick={() => {
                                  setEditingOption(option)
                                  setFormOpen(true)
                                }}
                                disabled={busyId === option.id}
                              >
                                <i className='tabler-edit' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip
                              title={option.is_active ? dictionary.common.deactivate : dictionary.common.activate}
                            >
                              <IconButton
                                color={option.is_active ? 'primary' : 'secondary'}
                                onClick={() => toggleStatus(option)}
                                disabled={busyId === option.id}
                              >
                                <i className={option.is_active ? 'tabler-toggle-right' : 'tabler-toggle-left'} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {canDelete && (
                          <Tooltip title={dictionary.common.delete}>
                            <IconButton
                              color='error'
                              onClick={() => setDeleteTarget(option)}
                              disabled={busyId === option.id}
                            >
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
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageLabel={dictionary.common.rowsPerPage}
          ofLabel={dictionary.common.of}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
        />
      </Card>

      <LeaveTypeForm
        open={formOpen}
        option={editingOption}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={refreshData}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.leaveTypes.deleteTitle}
        description={dictionary.leaveTypes.deleteDescription}
        itemName={deleteTarget?.name}
        confirmText={dictionary.common.delete}
        cancelText={dictionary.common.cancel}
        loading={busyId === deleteTarget?.id}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

export default LeaveTypeTable

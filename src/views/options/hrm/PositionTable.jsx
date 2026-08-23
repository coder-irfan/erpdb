'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import { Avatar } from '@mui/material'

import CustomTextField from '@core/components/mui/TextField'
import { deleteOption, getOptionsListPaginated, toggleOptionStatus } from '@/actions/options'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'

import PositionForm from './PositionForm'

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))

const PositionTable = ({ initialResult, initialError, canCreate, canUpdate, canDelete, locale, dictionary }) => {
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
        category: 'STAFF_POSITION',
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

  const openCreateForm = () => {
    setEditingOption(null)
    setFormOpen(true)
  }

  const openEditForm = option => {
    setEditingOption(option)
    setFormOpen(true)
  }

  const handleStatusToggle = async option => {
    setBusyId(option.id)

    try {
      const result = await toggleOptionStatus(option.id, !option.is_active, { locale })

      if (!result.success) {
        toast.error(result.error)

        return
      }

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

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      setDeleteTarget(null)
      await refreshData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const renderActions = option => (
    <EntityActionsMenu
      actions={[
        canUpdate && {
          label: dictionary.common.edit,
          icon: 'tabler-edit',
          disabled: busyId === option.id,
          onClick: () => openEditForm(option)
        },
        canUpdate && {
          label: option.is_active ? dictionary.common.deactivate : dictionary.common.activate,
          icon: option.is_active ? 'tabler-toggle-right' : 'tabler-toggle-left',
          disabled: busyId === option.id,
          onClick: () => handleStatusToggle(option)
        },
        canDelete && {
          label: dictionary.common.delete,
          icon: 'tabler-trash',
          color: 'error',
          disabled: busyId === option.id,
          onClick: () => setDeleteTarget(option)
        }
      ]}
      moreActionsLabel={dictionary.common.actions}
    />
  )

  return (
    <>
      <Card>
        {initialError && (
          <CardContent className='pb-0'>
            <Alert severity='error'>{initialError}</Alert>
          </CardContent>
        )}
        <CardContent>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <CustomTextField
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              label={dictionary.common.search}
              placeholder={dictionary.positions.searchPlaceholder}
              className='is-full sm:is-[340px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
            />
            {canCreate && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={openCreateForm}
                className='is-full sm:is-auto'
              >
                {dictionary.positions.add}
              </Button>
            )}
          </div>
        </CardContent>

        <ResponsiveDataTable
          mobileRows={options}
          loading={loading}
          getMobileRowId={option => option.id}
          renderMobilePrimary={option => (
            <div className='flex min-is-0 items-center gap-3'>
              <Avatar variant='rounded' className='bg-primaryLighter text-primary w-7 h-7 lg:w-10 lg:h-10' />
              <div className='min-is-0'>
                <Typography color='text.primary' className='truncate font-medium'>
                  {option.name}
                </Typography>
                <Typography color='text.secondary' variant='body2' className='line-clamp-2'>
                  {option.description || dictionary.common.noDescription}
                </Typography>
              </div>
            </div>
          )}
          renderMobileStatus={option => (
            <Chip
              size='small'
              variant='tonal'
              color={option.is_active ? 'success' : 'secondary'}
              label={option.is_active ? dictionary.common.active : dictionary.common.inactive}
            />
          )}
          renderMobileActions={renderActions}
          mobileMetadata={[
            {
              id: 'created',
              label: dictionary.common.createdDate,
              render: option => formatDate(option.created_at, locale)
            }
          ]}
          emptyState={{
            icon: 'tabler-briefcase',
            title: dictionary.positions.emptyTitle,
            description: dictionary.positions.emptyDescription,
            actionLabel: canCreate ? dictionary.positions.addFirst : undefined,
            onAction: canCreate ? openCreateForm : undefined
          }}
        >
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.positions.table.title}</th>
                  <th>{dictionary.positions.table.description}</th>
                  <th>{dictionary.common.status}</th>
                  <th>{dictionary.common.createdDate}</th>
                  <th className='text-end'>{dictionary.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeletonRows columns={5} />
                ) : options.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={5}
                    icon='tabler-briefcase'
                    title={dictionary.positions.emptyTitle}
                    description={dictionary.positions.emptyDescription}
                    actionLabel={canCreate ? dictionary.positions.addFirst : null}
                    onAction={canCreate ? openCreateForm : null}
                  />
                ) : (
                  options.map(option => (
                    <tr key={option.id}>
                      <td>
                        <div className='flex min-is-[250px] items-center gap-3'>
                          <Avatar
                            variant='rounded'
                            className='bg-primaryLighter text-primary w-7 h-7 lg:w-10 lg:h-10'
                          ></Avatar>
                          <Typography color='text.primary' className='min-is-[210px] font-medium'>
                            {option.name}
                          </Typography>
                        </div>
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
                      <td className='text-end'>{renderActions(option)}</td>
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
          rowsPerPageLabel={dictionary.common.rowsPerPage}
          ofLabel={dictionary.common.of}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
        />
      </Card>

      <PositionForm
        open={formOpen}
        option={editingOption}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={refreshData}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.positions.deleteTitle || dictionary.common.delete}
        description={dictionary.positions.deleteDescription || dictionary.contractPolicies.deleteDescription}
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

export default PositionTable

'use client'

import { useCallback, useEffect, useState } from 'react'

// Next Imports
import dynamic from 'next/dynamic'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { deleteOption, getOptionsListPaginated, toggleOptionStatus } from '@/actions/options'
import ConfirmationDeleteModal from '@/components/dialogs/ConfirmationDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'

const ContractPolicyForm = dynamic(() => import('./ContractPolicyForm'), { ssr: false })

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))

const getDescriptionPreview = description =>
  (description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const ContractPolicyTable = ({ initialResult, initialError, canCreate, canUpdate, canDelete, locale, dictionary }) => {
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
  const [deletingOption, setDeletingOption] = useState(null)
  const [viewingOption, setViewingOption] = useState(null)

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
        category: 'CONTRACT_POLICY',
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
    if (!deletingOption) return

    setBusyId(deletingOption.id)

    try {
      const result = await deleteOption(deletingOption.id, { locale })

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      setDeletingOption(null)

      if (options.length === 1 && page > 0) setPage(currentPage => currentPage - 1)
      else await refreshData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const renderActions = option => (
    <EntityActionsMenu
      actions={[
        { label: dictionary.common.view, icon: 'tabler-eye', onClick: () => setViewingOption(option) },
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
          onClick: () => setDeletingOption(option)
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
              placeholder={dictionary.contractPolicies.searchPlaceholder}
              className='is-full sm:is-[300px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
            />
            {canCreate && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={openCreateForm}
                className='is-full sm:is-auto'
              >
                {dictionary.contractPolicies.add}
              </Button>
            )}
          </div>
        </CardContent>

        <ResponsiveDataTable
          mobileRows={options}
          loading={loading}
          getMobileRowId={option => option.id}
          renderMobilePrimary={option => (
            <div className='min-is-0'>
              <Typography color='text.primary' className='truncate font-medium'>
                {option.name}
              </Typography>
              <Typography color='text.secondary' className='line-clamp-2'>
                {getDescriptionPreview(option.description) || dictionary.common.noDescription}
              </Typography>
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
            icon: 'tabler-file-description',
            title: dictionary.contractPolicies.emptyTitle,
            description: dictionary.contractPolicies.emptyDescription,
            actionLabel: canCreate ? dictionary.contractPolicies.addFirst : undefined,
            onAction: canCreate ? openCreateForm : undefined
          }}
        >
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.contractPolicies.table.title}</th>
                  <th>{dictionary.contractPolicies.table.description}</th>
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
                    icon='tabler-file-description'
                    title={dictionary.contractPolicies.emptyTitle}
                    description={dictionary.contractPolicies.emptyDescription}
                    actionLabel={canCreate ? dictionary.contractPolicies.addFirst : null}
                    onAction={canCreate ? openCreateForm : null}
                  />
                ) : (
                  options.map(option => {
                    const description = getDescriptionPreview(option.description)

                    return (
                      <tr key={option.id}>
                        <td>
                          <Typography color='text.primary' className='min-is-[200px] font-medium'>
                            {option.name}
                          </Typography>
                        </td>
                        <td>
                          <Typography color='text.secondary' className='max-is-[440px] truncate'>
                            {description || dictionary.common.noDescription}
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
                    )
                  })
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

      {formOpen && (
        <ContractPolicyForm
          open
          option={editingOption}
          locale={locale}
          dictionary={dictionary}
          onClose={() => setFormOpen(false)}
          onSaved={refreshData}
        />
      )}

      <Dialog
        open={Boolean(viewingOption)}
        onClose={() => setViewingOption(null)}
        fullWidth
        maxWidth='lg'
        PaperProps={{ className: 'overflow-hidden rounded-xl' }}
      >
        <DialogTitle className='border-be border-divider bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-0'>
          <div className='flex items-start justify-between gap-4 p-6'>
            <div className='flex min-w-0 items-start gap-4'>
              <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm'>
                <i className='tabler-file-description text-2xl' />
              </span>
              <div className='min-w-0'>
                <Typography variant='h5' className='truncate'>
                  {viewingOption?.name}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {dictionary.contractPolicies.previewTitle}
                </Typography>
                <div className='mt-3 flex flex-wrap gap-2'>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={viewingOption?.is_active ? 'success' : 'secondary'}
                    label={viewingOption?.is_active ? dictionary.common.active : dictionary.common.inactive}
                  />
                  {viewingOption?.created_at && (
                    <Chip
                      size='small'
                      variant='outlined'
                      icon={<i className='tabler-calendar' />}
                      label={formatDate(viewingOption.created_at, locale)}
                    />
                  )}
                </div>
              </div>
            </div>
            <IconButton onClick={() => setViewingOption(null)} aria-label={dictionary.common.close}>
              <i className='tabler-x' />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent className='bg-actionHover p-4 sm:p-7'>
          <div className='mx-auto max-is-[850px]'>
            <div className='mb-3 flex items-center justify-between gap-3 px-1'>
              <Typography variant='overline' color='text.secondary'>
                Document preview
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Read-only
              </Typography>
            </div>
            {viewingOption?.description ? (
              <article
                className='policy-document-preview min-bs-[420px] rounded-xl border border-divider bg-backgroundPaper p-6 shadow-sm sm:p-10'
                dangerouslySetInnerHTML={{ __html: viewingOption.description }}
              />
            ) : (
              <div className='flex min-bs-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-divider bg-backgroundPaper text-center'>
                <i className='tabler-file-off mb-3 text-4xl text-textDisabled' />
                <Typography color='text.secondary'>{dictionary.common.noDescription}</Typography>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions className='border-bs border-divider px-6 py-4'>
          <Button variant='tonal' color='secondary' onClick={() => setViewingOption(null)}>
            {dictionary.common.close}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmationDeleteModal
        open={Boolean(deletingOption)}
        title={dictionary.contractPolicies.deleteTitle}
        description={dictionary.contractPolicies.deleteDescription}
        itemName={deletingOption?.name}
        confirmText={dictionary.common.delete}
        cancelText={dictionary.common.cancel}
        loading={Boolean(deletingOption && busyId === deletingOption.id)}
        onConfirm={confirmDelete}
        onClose={() => setDeletingOption(null)}
      />
    </>
  )
}

export default ContractPolicyTable

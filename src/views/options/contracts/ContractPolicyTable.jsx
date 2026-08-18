'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
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

import ContractPolicyForm from './ContractPolicyForm'

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

  return (
    <>
      <Card>
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
                        <Typography color='text.secondary' className='max-is-[440px] truncate' title={description}>
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
                      <td className='text-end'>
                        <div className='flex min-is-[150px] items-center justify-end gap-1'>
                          <Tooltip title={dictionary.common.view}>
                            <IconButton onClick={() => setViewingOption(option)}>
                              <i className='tabler-eye' />
                            </IconButton>
                          </Tooltip>
                          {(canUpdate || canDelete) && (
                            <>
                              {canUpdate && (
                                <>
                                  <Tooltip title={dictionary.common.edit}>
                                    <IconButton onClick={() => openEditForm(option)} disabled={busyId === option.id}>
                                      <i className='tabler-edit' />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip
                                    title={option.is_active ? dictionary.common.deactivate : dictionary.common.activate}
                                  >
                                    <IconButton
                                      color={option.is_active ? 'primary' : 'secondary'}
                                      onClick={() => handleStatusToggle(option)}
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
                                    onClick={() => setDeletingOption(option)}
                                    disabled={busyId === option.id}
                                  >
                                    <i className='tabler-trash' />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
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

      <ContractPolicyForm
        open={formOpen}
        option={editingOption}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={refreshData}
      />

      <Dialog open={Boolean(viewingOption)} onClose={() => setViewingOption(null)} fullWidth maxWidth='lg'>
        <DialogTitle className='flex items-start justify-between gap-4'>
          <div>
            <Typography variant='h5'>{viewingOption?.name}</Typography>
            <Typography color='text.secondary'>{dictionary.contractPolicies.previewTitle}</Typography>
          </div>
          <IconButton onClick={() => setViewingOption(null)} aria-label={dictionary.common.close}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers className='bg-actionHover'>
          {viewingOption?.description ? (
            <article
              className='policy-document-preview rounded shadow-sm'
              dangerouslySetInnerHTML={{ __html: viewingOption.description }}
            />
          ) : (
            <Typography color='text.secondary'>{dictionary.common.noDescription}</Typography>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteModal
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

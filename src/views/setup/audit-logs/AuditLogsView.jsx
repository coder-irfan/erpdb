'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { deleteAuditLog, getAuditLogsPage } from '@/actions/notifications'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'

import tableStyles from '@core/styles/table.module.css'

const CATEGORY_COLORS = { CONTRACT: 'primary', HRM: 'success', FINANCE: 'warning', CRM: 'info', SYSTEM: 'secondary' }

const AuditLogsView = ({ initialResult, initialError, locale, dictionary }) => {
  const [logs, setLogs] = useState(initialResult.logs)
  const [totalCount, setTotalCount] = useState(initialResult.totalCount)
  const [canDelete, setCanDelete] = useState(initialResult.canDelete)
  const [page, setPage] = useState(Math.max(0, initialResult.page - 1))
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadLogs = useCallback(async () => {
    setLoading(true)

    try {
      const result = await getAuditLogsPage({ page: page + 1, limit: rowsPerPage, search })

      if (!result.success) {
        toast.error(result.error || dictionary.loadFailed)

        return
      }

      setLogs(result.data.logs)
      setTotalCount(result.data.totalCount)
      setCanDelete(result.data.canDelete)
    } catch {
      toast.error(dictionary.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.loadFailed, page, rowsPerPage, search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const removeLog = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const result = await deleteAuditLog(deleteTarget.id)

      if (!result.success) {
        toast.error(result.error || dictionary.deleteFailed)

        return
      }

      setDeleteTarget(null)
      toast.success(dictionary.deleteSuccess)

      if (logs.length === 1 && page > 0) setPage(current => current - 1)
      else await loadLogs()
    } catch {
      toast.error(dictionary.deleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = timestamp =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))

  const categoryBadge = item => (
    <Chip size='small' variant='tonal' color={CATEGORY_COLORS[item.category] || 'secondary'} label={item.category} />
  )

  const deleteButton = item =>
    canDelete ? (
      <Tooltip title={dictionary.deleteAction}>
        <IconButton
          size='small'
          color='error'
          aria-label={dictionary.deleteAction}
          onClick={() => setDeleteTarget(item)}
        >
          <i className='tabler-trash' />
        </IconButton>
      </Tooltip>
    ) : null

  return (
    <div className='flex flex-col gap-4'>
      {initialError && <Alert severity='error'>{initialError}</Alert>}
      <Card>
        <CardContent className='border-be border-divider'>
          <CustomTextField
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder={dictionary.search}
            className='is-full sm:is-[360px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
          />
        </CardContent>
        <ResponsiveDataTable
          mobileRows={logs}
          loading={loading}
          getMobileRowId={item => item.id}
          renderMobilePrimary={item => (
            <div className='min-is-0'>
              <Typography className='truncate font-medium'>{item.action.replaceAll('_', ' ')}</Typography>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {item.actor || dictionary.systemActor}
              </Typography>
            </div>
          )}
          renderMobileStatus={categoryBadge}
          renderMobileActions={deleteButton}
          mobileMetadata={[
            { id: 'module', label: dictionary.module, render: item => item.module },
            { id: 'time', label: dictionary.time, render: item => formatDate(item.timestamp) }
          ]}
          emptyState={{ icon: 'tabler-history-off', title: dictionary.emptyTitle, description: dictionary.noActivity }}
        >
          <div className='no-scrollbar overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>{dictionary.action}</th>
                  <th>{dictionary.actor}</th>
                  <th>{dictionary.module}</th>
                  <th>{dictionary.category}</th>
                  <th>{dictionary.time}</th>
                  {canDelete && <th className='text-end'>{dictionary.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeletonRows columns={canDelete ? 6 : 5} rows={rowsPerPage} />
                ) : logs.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={canDelete ? 6 : 5}
                    icon='tabler-history-off'
                    title={dictionary.emptyTitle}
                    description={dictionary.noActivity}
                  />
                ) : (
                  logs.map(item => (
                    <tr key={item.id}>
                      <td>
                        <Typography className='font-medium'>{item.action.replaceAll('_', ' ')}</Typography>
                      </td>
                      <td>{item.actor || dictionary.systemActor}</td>
                      <td>{item.module}</td>
                      <td>{categoryBadge(item)}</td>
                      <td className='whitespace-nowrap'>{formatDate(item.timestamp)}</td>
                      {canDelete && <td className='text-end'>{deleteButton(item)}</td>}
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
          rowsPerPageOptions={[10, 25, 50]}
          rowsPerPageLabel={dictionary.rowsPerPage}
          ofLabel={dictionary.of}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
        />
      </Card>
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.deleteTitle}
        description={dictionary.deleteDescription}
        itemName={deleteTarget?.action.replaceAll('_', ' ')}
        confirmText={dictionary.deleteAction}
        cancelText={dictionary.cancel}
        loading={deleting}
        onConfirm={removeLog}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default AuditLogsView

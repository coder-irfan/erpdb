'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'

import ClientActivityDialog from './ClientActivityDialog'
import ClientFormDrawer from './ClientFormDrawer'
import ClientProfileModal from './ClientProfileModal'
import ClientStatsCards from './ClientStatsCards'
import ClientTableView from './ClientTableView'

const EMPTY = {
  clients: [],
  totalCount: 0,
  summary: { totalActive: 0, lifetimeRevenue: 0, activeProjects: 0, pendingBalance: 0 },
  options: { staff: [] }
}

const CrmClientsView = ({ locale, dictionary, currencyCode, canWrite, canDelete }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [managerId, setManagerId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [detailVersion, setDetailVersion] = useState(0)
  const [activityClient, setActivityClient] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(rowsPerPage), locale })

      if (search) params.set('search', search)
      if (managerId) params.set('account_manager_id', managerId)
      if (status) params.set('status', status)

      const response = await fetch(`/api/crm/clients?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.loadFailed)
      setData(result.data)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.messages.loadFailed, locale, managerId, page, rowsPerPage, search, status])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refresh = async () => {
    await loadData()
    setDetailVersion(value => value + 1)
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const response = await fetch(`/api/crm/clients/${deleteTarget.id}?locale=${locale}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      if (detailId === deleteTarget.id) setDetailId(null)
      setDeleteTarget(null)
      await loadData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setDeleting(false)
    }
  }

  const edit = client => {
    setEditingClient(client)
    setFormOpen(true)
  }

  const changeStatus = async (client, nextStatus) => {
    if (!nextStatus || nextStatus === client.status) return
    setStatusUpdating(client.id)

    try {
      const response = await fetch(`/api/crm/clients/${client.id}?locale=${locale}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })

      const result = await response.json()

      if (!response.ok || !result.success) toast.error(result.error || dictionary.messages.operationFailed)
      else {
        toast.success(result.message)
        await refresh()
      }
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setStatusUpdating(null)
    }
  }

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      <ClientStatsCards summary={data.summary} locale={locale} currencyCode={currencyCode} dictionary={dictionary} />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            className='is-full sm:is-[360px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
          />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover activeCount={Number(Boolean(managerId)) + Number(Boolean(status))} locale={locale}>
              <CustomTextField
                select
                label={dictionary.filters.manager}
                value={managerId || ''}
                onChange={event => {
                  setManagerId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected =>
                      data.options.staff.find(item => item.id === selected)?.full_name || dictionary.filters.allManagers
                  }
                }}
              >
                <MenuItem value=''>{dictionary.filters.allManagers}</MenuItem>
                {data.options.staff.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.full_name}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.status}
                value={status || ''}
                onChange={event => {
                  setStatus(event.target.value)
                  setPage(0)
                }}
                className='is-full'
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected => (selected ? dictionary.status[selected] : dictionary.filters.allStatuses)
                  }
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                <MenuItem value='ACTIVE'>{dictionary.status.ACTIVE}</MenuItem>
                <MenuItem value='INACTIVE'>{dictionary.status.INACTIVE}</MenuItem>
              </CustomTextField>
            </TableFiltersPopover>
            {canWrite && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => {
                  setEditingClient(null)
                  setFormOpen(true)
                }}
              >
                {dictionary.actions.add}
              </Button>
            )}
          </div>
        </CardContent>
        <ClientTableView
          data={data}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          locale={locale}
          currencyCode={currencyCode}
          dictionary={dictionary}
          canWrite={canWrite}
          canDelete={canDelete}
          statusUpdating={statusUpdating}
          onPageChange={(_, next) => setPage(next)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onView={client => setDetailId(client.id)}
          onActivity={setActivityClient}
          onEdit={edit}
          onDelete={setDeleteTarget}
          onStatusChange={changeStatus}
          onAdd={() => {
            setEditingClient(null)
            setFormOpen(true)
          }}
        />
      </Card>
      <ClientFormDrawer
        open={formOpen}
        client={editingClient}
        staff={data.options.staff}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
      <ClientProfileModal
        key={`${detailId}-${detailVersion}`}
        open={Boolean(detailId)}
        clientId={detailId}
        locale={locale}
        currencyCode={currencyCode}
        dictionary={dictionary}
        canWrite={canWrite}
        onClose={() => setDetailId(null)}
        onEdit={edit}
        onActivity={setActivityClient}
      />
      <ClientActivityDialog
        open={Boolean(activityClient)}
        client={activityClient}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setActivityClient(null)}
        onSaved={refresh}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.company_name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default CrmClientsView

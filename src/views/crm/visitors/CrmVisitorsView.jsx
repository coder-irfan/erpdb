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

import VisitorConvertDialog from './VisitorConvertDialog'
import VisitorFormDrawer from './VisitorFormDrawer'
import VisitorDetailDialog from './VisitorDetailDialog'
import VisitorStatsCards from './VisitorStatsCards'
import VisitorTableView from './VisitorTableView'

const EMPTY = {
  visitors: [],
  totalCount: 0,
  summary: { totalToday: 0, activeGuests: 0, completedToday: 0, convertedCount: 0 },
  options: { staff: [], purposes: [] }
}

const CrmVisitorsView = ({ locale, dictionary, canWrite, canDelete }) => {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [hostId, setHostId] = useState('')
  const [status, setStatus] = useState('')
  const [dateRange, setDateRange] = useState('TODAY')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVisitor, setEditingVisitor] = useState(null)
  const [viewingVisitor, setViewingVisitor] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)

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
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        date_range: dateRange,
        locale
      })

      if (search) params.set('search', search)
      if (hostId) params.set('host_staff_id', hostId)
      if (status) params.set('status', status)

      const response = await fetch(`/api/crm/visitors?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.loadFailed)
      setData(result.data)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dateRange, dictionary.messages.loadFailed, hostId, locale, page, rowsPerPage, search, status])

  useEffect(() => {
    loadData()
  }, [loadData])

  const checkout = async visitor => {
    setBusyId(visitor.id)

    try {
      const response = await fetch(`/api/crm/visitors/${visitor.id}/checkout?locale=${locale}`, { method: 'PATCH' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      await loadData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const convert = async () => {
    if (!convertTarget) return
    setBusyId(convertTarget.id)

    try {
      const response = await fetch(`/api/crm/visitors/${convertTarget.id}/convert-lead?locale=${locale}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      setConvertTarget(null)
      await loadData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)

    try {
      const response = await fetch(`/api/crm/visitors/${deleteTarget.id}?locale=${locale}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      setDeleteTarget(null)
      await loadData()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      <VisitorStatsCards summary={data.summary} dictionary={dictionary} />
      <Card className='border border-divider/70 shadow-sm'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <CustomTextField
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            className='is-full sm:is-[340px]'
            slotProps={{ input: { startAdornment: <i className='tabler-search' /> } }}
          />
          <div className='grid is-full grid-cols-2 gap-2 sm:flex sm:is-auto sm:flex-wrap sm:gap-3 sm:justify-end'>
            <TableFiltersPopover
              activeCount={Number(Boolean(hostId)) + Number(Boolean(status)) + Number(dateRange !== 'TODAY')}
              locale={locale}
            >
              <CustomTextField
                select
                label={dictionary.filters.host}
                value={hostId || ''}
                onChange={event => {
                  setHostId(event.target.value)
                  setPage(0)
                }}
                className='is-full'
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected =>
                      data.options.staff.find(item => item.id === selected)?.full_name || dictionary.filters.allHosts
                  }
                }}
              >
                <MenuItem value=''>{dictionary.filters.allHosts}</MenuItem>
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
                <MenuItem value='CHECKED_IN'>{dictionary.status.CHECKED_IN}</MenuItem>
                <MenuItem value='COMPLETED'>{dictionary.status.COMPLETED}</MenuItem>
              </CustomTextField>
              <CustomTextField
                select
                label={dictionary.filters.dateRange}
                value={dateRange || 'TODAY'}
                onChange={event => {
                  setDateRange(event.target.value)
                  setPage(0)
                }}
                className='is-full'
              >
                <MenuItem value='TODAY'>{dictionary.ranges.TODAY}</MenuItem>
                <MenuItem value='LAST_7_DAYS'>{dictionary.ranges.LAST_7_DAYS}</MenuItem>
                <MenuItem value='LAST_30_DAYS'>{dictionary.ranges.LAST_30_DAYS}</MenuItem>
                <MenuItem value='ALL'>{dictionary.ranges.ALL}</MenuItem>
              </CustomTextField>
            </TableFiltersPopover>
            {canWrite && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-user-plus' />}
                aria-label={dictionary.actions.add}
                title={dictionary.actions.add}
                onClick={() => {
                  setEditingVisitor(null)
                  setFormOpen(true)
                }}
              >
                <span>{dictionary.actions.add}</span>
              </Button>
            )}
          </div>
        </CardContent>
        <VisitorTableView
          data={data}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          locale={locale}
          dictionary={dictionary}
          canWrite={canWrite}
          canDelete={canDelete}
          busyId={busyId}
          onPageChange={(_, next) => setPage(next)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          onCheckout={checkout}
          onConvert={setConvertTarget}
          onEdit={visitor => {
            setEditingVisitor(visitor)
            setFormOpen(true)
          }}
          onDelete={setDeleteTarget}
          onView={setViewingVisitor}
          onAdd={() => {
            setEditingVisitor(null)
            setFormOpen(true)
          }}
        />
      </Card>
      <VisitorFormDrawer
        open={formOpen}
        visitor={editingVisitor}
        staff={data.options.staff}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />
      <VisitorDetailDialog
        open={Boolean(viewingVisitor)}
        visitor={viewingVisitor}
        locale={locale}
        dictionary={dictionary}
        purposeLabel={visitor =>
          data.options.purposes?.find(option => option.value === visitor.purpose)?.label ||
          dictionary.purposes[visitor.purpose] ||
          visitor.purpose
        }
        onClose={() => setViewingVisitor(null)}
      />
      <VisitorConvertDialog
        open={Boolean(convertTarget)}
        visitor={convertTarget}
        loading={Boolean(convertTarget && busyId === convertTarget.id)}
        dictionary={dictionary}
        onClose={() => setConvertTarget(null)}
        onConfirm={convert}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.delete.title}
        description={dictionary.delete.description}
        itemName={deleteTarget?.full_name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default CrmVisitorsView

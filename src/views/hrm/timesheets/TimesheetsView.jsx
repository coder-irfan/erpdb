'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import { Avatar } from '@mui/material'

import CustomTextField from '@core/components/mui/TextField'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableFiltersPopover from '@/components/table/TableFiltersPopover'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'

import AttendanceDrawer from './AttendanceDrawer'
import AttendanceStatsCards from './AttendanceStatsCards'

import tableStyles from '@core/styles/table.module.css'

const EMPTY_DATA = {
  records: [],
  unmarkedStaff: [],
  totalCount: 0,
  page: 1,
  totalPages: 1,
  summary: { total_present: 0, total_absent: 0, total_leave: 0, unmarked_count: 0 }
}

const STATUS_COLORS = { PRESENT: 'success', ABSENT: 'error', LEAVE: 'info' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const shiftDate = (date, offset) => {
  const value = new Date(`${date}T12:00:00.000Z`)

  value.setUTCDate(value.getUTCDate() + offset)

  return value.toISOString().slice(0, 10)
}

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00.000Z`)
  )

const escapeCsv = value => `"${String(value ?? '').replaceAll('"', '""')}"`

const TimesheetsView = ({ initialDate, canWrite, canDelete, defaultWorkHours, locale, dictionary }) => {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const changeDate = nextDate => {
    setSelectedDate(nextDate)
    setPage(0)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        locale,
        page: String(page + 1),
        limit: String(rowsPerPage)
      })

      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/hrm/timesheets?${params.toString()}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || dictionary.messages.loadFailed)

        return
      }

      setData(result.data)
    } catch {
      setError(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [dictionary.messages.loadFailed, locale, page, rowsPerPage, search, selectedDate, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const openCreate = () => {
    setEditingRecord(null)
    setDrawerOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/hrm/timesheets/${deleteTarget.id}?locale=${locale}`, { method: 'DELETE' })
      const result = await response.json()

      if (!response.ok || !result.success) toast.error(result.error || dictionary.messages.operationFailed)
      else {
        toast.success(result.message)
        setDeleteTarget(null)
        await loadData()
      }
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setDeleteLoading(false)
    }
  }

  const exportCsv = () => {
    const rows = [
      dictionary.export.columns,
      ...data.records.map(record => [
        record.staff.full_name,
        record.staff.position,
        dictionary.status[record.status],
        record.check_in_time || '',
        record.check_out_time || '',
        record.hours_worked || '',
        record.notes || ''
      ])
    ]

    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')

    link.href = url
    link.download = `attendance-${selectedDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='attendance-print-report flex flex-col gap-6'>
      <AttendanceStatsCards summary={data.summary} dictionary={dictionary} />

      <Card>
        <CardContent className='no-print flex flex-wrap items-center justify-between gap-4 border-be border-divider'>
          <CustomTextField
            className='is-full sm:max-is-[300px]'
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            slotProps={{ input: { startAdornment: <i className='tabler-search text-textSecondary' /> } }}
          />
          <div className='flex is-full flex-wrap items-center gap-2 sm:is-auto sm:justify-end'>
            <TableFiltersPopover
              activeCount={Number(Boolean(statusFilter)) + Number(selectedDate !== initialDate)}
              locale={locale}
            >
              <div className='flex items-end gap-2'>
                <Tooltip title={dictionary.date.previous}>
                  <IconButton
                    aria-label={dictionary.date.previous}
                    onClick={() => changeDate(shiftDate(selectedDate, -1))}
                  >
                    <i className='tabler-chevron-left' />
                  </IconButton>
                </Tooltip>
                <CustomTextField
                  type='date'
                  label={dictionary.date.date}
                  value={selectedDate}
                  className='is-full'
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={event => changeDate(event.target.value)}
                />
                <Tooltip title={dictionary.date.next}>
                  <IconButton aria-label={dictionary.date.next} onClick={() => changeDate(shiftDate(selectedDate, 1))}>
                    <i className='tabler-chevron-right' />
                  </IconButton>
                </Tooltip>
              </div>
              <Button variant='tonal' onClick={() => changeDate(initialDate)}>
                {dictionary.date.today}
              </Button>
              <CustomTextField
                select
                className='is-full'
                label={dictionary.filters.status}
                value={statusFilter}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected => (selected ? dictionary.status[selected] : dictionary.filters.allStatuses)
                  }
                }}
                onChange={event => {
                  setStatusFilter(event.target.value)
                  setPage(0)
                }}
              >
                <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
                {Object.keys(STATUS_COLORS).map(status => (
                  <MenuItem key={status} value={status}>
                    {dictionary.status[status]}
                  </MenuItem>
                ))}
              </CustomTextField>
            </TableFiltersPopover>
            <Button variant='tonal' startIcon={<i className='tabler-file-download' />} onClick={exportCsv}>
              {dictionary.actions.export}
            </Button>
            <Button variant='tonal' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>
              {dictionary.actions.print}
            </Button>
            {canWrite && (
              <Button variant='contained' startIcon={<i className='tabler-user-plus' />} onClick={openCreate}>
                {dictionary.actions.mark}
              </Button>
            )}
          </div>
        </CardContent>
        {error && <Alert severity='error'>{error}</Alert>}
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.fields.staff}</th>
                <th>{dictionary.fields.position}</th>
                <th>{dictionary.fields.status}</th>
                <th>{dictionary.fields.checkIn}</th>
                <th>{dictionary.fields.checkOut}</th>
                <th>{dictionary.fields.hours}</th>
                <th>{dictionary.fields.notes}</th>
                <th className='no-print text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={8} />
              ) : data.records.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={8}
                  icon='tabler-calendar-time'
                  title={dictionary.table.emptyTitle}
                  description={dictionary.table.emptyDescription}
                  actionLabel={canWrite && data.unmarkedStaff.length > 0 ? dictionary.actions.mark : undefined}
                  onAction={canWrite && data.unmarkedStaff.length > 0 ? openCreate : undefined}
                />
              ) : (
                data.records.map(record => (
                  <tr key={record.id}>
                    <td>
                      <div className='flex min-is-[250px] items-center gap-3'>
                        <Avatar variant='rounded' className='bg-primaryLighter text-primary'></Avatar>
                        <div className='flex min-is-0 flex-col'>
                          <Typography color='text.primary' className='font-medium'>
                            {record.staff.full_name}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {record.staff.email}
                          </Typography>
                        </div>
                      </div>
                    </td>
                    <td>{record.staff.position}</td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={STATUS_COLORS[record.status]}
                        label={dictionary.status[record.status]}
                      />
                    </td>
                    <td>{record.check_in_time || '—'}</td>
                    <td>{record.check_out_time || '—'}</td>
                    <td>
                      {record.hours_worked ? `${Number(record.hours_worked).toFixed(2)} ${dictionary.hoursShort}` : '—'}
                    </td>
                    <td>
                      {record.notes ? (
                        <Tooltip title={record.notes} arrow>
                          <Typography variant='body2' className='max-is-[180px] truncate'>
                            {record.notes}
                          </Typography>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='no-print text-end'>
                      <EntityActionsMenu
                        actions={[
                          canWrite && {
                            label: dictionary.actions.edit,
                            icon: 'tabler-edit',
                            onClick: () => {
                              setEditingRecord(record)
                              setDrawerOpen(true)
                            }
                          },
                          canDelete && { label: dictionary.actions.delete, icon: 'tabler-trash', color: 'error', onClick: () => setDeleteTarget(record) }
                        ]}
                        moreActionsLabel={dictionary.table.actions}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className='no-print'>
          <DashboardTablePagination
            count={data.totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            rowsPerPageLabel={dictionary.table.rowsPerPage}
            ofLabel={dictionary.table.of}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={event => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
          />
        </div>
      </Card>

      <AttendanceDrawer
        open={drawerOpen}
        record={editingRecord}
        date={selectedDate}
        staff={data.unmarkedStaff}
        defaultWorkHours={defaultWorkHours}
        locale={locale}
        dictionary={dictionary}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadData}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={dictionary.messages.deleteTitle}
        description={dictionary.messages.deleteDescription}
        itemName={deleteTarget?.staff.full_name}
        confirmText={dictionary.actions.delete}
        cancelText={dictionary.actions.cancel}
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default TimesheetsView

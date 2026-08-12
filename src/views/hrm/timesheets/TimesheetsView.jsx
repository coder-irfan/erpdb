'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'

import AttendanceDrawer from './AttendanceDrawer'
import AttendanceStatsCards from './AttendanceStatsCards'

import tableStyles from '@core/styles/table.module.css'

const EMPTY_DATA = {
  records: [],
  unmarkedStaff: [],
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
  const [statusFilter, setStatusFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/hrm/timesheets?date=${selectedDate}&locale=${locale}`, { cache: 'no-store' })
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
  }, [dictionary.messages.loadFailed, locale, selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return data.records.filter(record => {
      const matchesStatus = !statusFilter || record.status === statusFilter
      const matchesSearch = !query || record.staff.full_name.toLowerCase().includes(query)

      return matchesStatus && matchesSearch
    })
  }, [data.records, search, statusFilter])

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
      ...filteredRecords.map(record => [
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
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <Typography variant='h4'>{dictionary.title}</Typography>
            <Typography color='text.secondary'>{formatDate(selectedDate, locale)}</Typography>
          </div>
          <div className='no-print flex flex-wrap items-end gap-2'>
            <Tooltip title={dictionary.date.previous}>
              <IconButton
                aria-label={dictionary.date.previous}
                onClick={() => setSelectedDate(current => shiftDate(current, -1))}
              >
                <i className='tabler-chevron-left' />
              </IconButton>
            </Tooltip>
            <CustomTextField
              type='date'
              size='small'
              label={dictionary.date.date}
              value={selectedDate}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={event => setSelectedDate(event.target.value)}
            />
            <Tooltip title={dictionary.date.next}>
              <IconButton
                aria-label={dictionary.date.next}
                onClick={() => setSelectedDate(current => shiftDate(current, 1))}
              >
                <i className='tabler-chevron-right' />
              </IconButton>
            </Tooltip>
            <Button
              variant={selectedDate === initialDate ? 'contained' : 'tonal'}
              onClick={() => setSelectedDate(initialDate)}
            >
              {dictionary.date.today}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AttendanceStatsCards summary={data.summary} dictionary={dictionary} />

      <Card>
        <CardHeader
          title={dictionary.table.title}
          subheader={dictionary.table.description}
          action={
            <div className='no-print flex flex-wrap gap-2'>
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
          }
        />
        <CardContent className='no-print flex flex-wrap items-end justify-between gap-4 border-bs pt-5'>
          <CustomTextField
            className='is-full sm:max-is-[280px]'
            label={dictionary.filters.search}
            placeholder={dictionary.filters.searchPlaceholder}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <CustomTextField
            select
            className='is-full sm:is-[190px]'
            label={dictionary.filters.status}
            value={statusFilter}
            slotProps={{
              select: {
                displayEmpty: true,
                renderValue: selected => selected ? dictionary.status[selected] : dictionary.filters.allStatuses
              }
            }}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <MenuItem value=''>{dictionary.filters.allStatuses}</MenuItem>
            {Object.keys(STATUS_COLORS).map(status => (
              <MenuItem key={status} value={status}>
                {dictionary.status[status]}
              </MenuItem>
            ))}
          </CustomTextField>
        </CardContent>
        {error && <Alert severity='error'>{error}</Alert>}
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.fields.staff}</th>
                <th>{dictionary.fields.position}</th>
                <th>{dictionary.fields.status}</th>
                <th>{dictionary.fields.checkIn}</th>
                <th>{dictionary.fields.checkOut}</th>
                <th>{dictionary.fields.hours}</th>
                <th className='no-print text-right'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={7} />
              ) : filteredRecords.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={7}
                  icon='tabler-calendar-time'
                  title={dictionary.table.emptyTitle}
                  description={dictionary.table.emptyDescription}
                  actionLabel={canWrite && data.unmarkedStaff.length > 0 ? dictionary.actions.mark : undefined}
                  onAction={canWrite && data.unmarkedStaff.length > 0 ? openCreate : undefined}
                />
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id}>
                    <td>
                      <Typography color='text.primary' className='font-medium'>
                        {record.staff.full_name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {record.staff.email}
                      </Typography>
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
                    <td className='no-print'>
                      <div className='flex justify-end gap-1'>
                        {record.notes && (
                          <Tooltip title={record.notes} arrow>
                            <IconButton size='small' aria-label={dictionary.fields.notes}>
                              <i className='tabler-note' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canWrite && (
                          <Tooltip title={dictionary.actions.edit}>
                            <IconButton
                              size='small'
                              onClick={() => {
                                setEditingRecord(record)
                                setDrawerOpen(true)
                              }}
                            >
                              <i className='tabler-edit' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title={dictionary.actions.delete}>
                            <IconButton size='small' color='error' onClick={() => setDeleteTarget(record)}>
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

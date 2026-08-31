'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import TimePickerInput from '@/components/inputs/TimePickerInput'
import { EMPTY_TABLE_CELL } from '@/libs/tableCell'

const getEntries = (attendanceStaff, defaultWorkHours) =>
  attendanceStaff.map(staff => ({
    staff_id: staff.id,
    full_name: staff.full_name,
    position: staff.position,
    locked: Boolean(staff.record?.leave_request_id || staff.record?.leave_id),
    status: staff.record?.status || (staff.record?.leave_request_id || staff.record?.leave_id ? 'LEAVE' : 'PRESENT'),
    check_in_time: staff.record?.check_in_time || defaultWorkHours.start,
    check_out_time: staff.record?.check_out_time || defaultWorkHours.end,
    notes: staff.record?.notes || ''
  }))

const getInitials = name =>
  name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?'

const AttendanceDrawerSkeleton = ({ rows = 4 }) => (
  <div className='space-y-3' aria-busy='true' aria-label='Loading attendance staff'>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className='rounded-xl border border-divider bg-backgroundPaper/70 p-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <Skeleton variant='circular' width={36} height={36} animation='wave' />
            <div>
              <Skeleton variant='text' width={150} height={24} animation='wave' />
              <Skeleton variant='text' width={100} height={18} animation='wave' />
            </div>
          </div>
          <Skeleton variant='rounded' width={210} height={34} animation='wave' />
        </div>
        <div className='mt-4 grid grid-cols-1 gap-3 border-bs border-divider pt-4 sm:grid-cols-2'>
          <Skeleton variant='rounded' height={40} animation='wave' />
          <Skeleton variant='rounded' height={40} animation='wave' />
        </div>
      </div>
    ))}
  </div>
)

const AttendanceDrawer = ({
  open,
  date,
  attendanceStaff = [],
  defaultWorkHours,
  guard = {},
  loading = false,
  locale,
  dictionary,
  onClose,
  onSaved
}) => {
  const [entries, setEntries] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const blockedMessage = guard.isFuture
    ? dictionary.messages.futureDateBlocked
    : guard.payrollLocked && !guard.payrollOverride
      ? dictionary.messages.payrollLocked
      : ''

  useEffect(() => {
    if (!open) return

    setEntries(getEntries(attendanceStaff, defaultWorkHours))
    setSearch('')
    setSaving(false)
  }, [attendanceStaff, defaultWorkHours, open])

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    if (!query) return entries

    return entries.filter(entry => `${entry.full_name} ${entry.position || ''}`.toLocaleLowerCase().includes(query))
  }, [entries, search])

  const editableEntries = entries.filter(entry => !entry.locked)
  const controlsDisabled = saving || guard.blocked

  const statusSummary = useMemo(
    () =>
      ['PRESENT', 'ABSENT', 'LEAVE'].map(status => ({
        status,
        count: entries.filter(entry => entry.status === status).length
      })),
    [entries]
  )

  const updateEntry = (staffId, changes) => {
    setEntries(current => current.map(entry => (entry.staff_id === staffId ? { ...entry, ...changes } : entry)))
  }

  const changeStatus = (entry, status) => {
    if (!status) return

    updateEntry(entry.staff_id, {
      status,
      check_in_time: status === 'PRESENT' ? entry.check_in_time || defaultWorkHours.start : '',
      check_out_time: status === 'PRESENT' ? entry.check_out_time || defaultWorkHours.end : ''
    })
  }

  const saveAttendance = async () => {
    if (guard.blocked) {
      toast.error(blockedMessage)

      return
    }

    if (editableEntries.some(entry => entry.status === 'PRESENT' && (!entry.check_in_time || !entry.check_out_time))) {
      toast.error(dictionary.validation.required)

      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/hrm/timesheets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          locale,
          payrollOverride: guard.payrollOverride === true,
          records: editableEntries.map(({ staff_id, status, check_in_time, check_out_time, notes }) => ({
            staff_id,
            status,
            check_in_time,
            check_out_time,
            notes
          }))
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.operationFailed)

        return
      }

      toast.success(result.message)
      await onSaved(result.data)
      onClose()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[min(920px,100vw)] xl:is-[750px]' }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider px-4 py-5 sm:px-6'>
        <div>
          <Typography variant='h5'>{dictionary.actions.mark}</Typography>
          <Typography color='text.secondary'>
            {date} <span aria-hidden='true'>&middot;</span> {dictionary.drawer.description}
          </Typography>
        </div>
        <IconButton onClick={onClose} disabled={saving} aria-label={dictionary.actions.cancel}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />

      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 sm:px-6'>
          <div className='space-y-4 pt-5 sm:px-0'>
            {blockedMessage && <Alert severity='warning'>{blockedMessage}</Alert>}
            <CustomTextField
              fullWidth
              size='small'
              label={dictionary.filters.search}
              placeholder={dictionary.filters.searchPlaceholder}
              value={search}
              onChange={event => setSearch(event.target.value)}
              slotProps={{ input: { startAdornment: <i className='tabler-search me-2 text-textSecondary' /> } }}
            />
            <Typography variant='body2' color='text.secondary'>
              {visibleEntries.length} {dictionary.fields.staff}
            </Typography>
          </div>

          {loading ? (
            <AttendanceDrawerSkeleton />
          ) : (
            visibleEntries.map(entry => {
              const rowDisabled = controlsDisabled || entry.locked
              const showTimes = entry.status === 'PRESENT'

              return (
                <div
                  key={entry.staff_id}
                  className='rounded-xl border border-divider bg-backgroundDefault p-4 shadow-xs'
                >
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex min-is-0 items-center gap-3'>
                      <Avatar
                        className={`is-9 bs-9 text-xs font-semibold ${
                          entry.locked ? 'bg-info/15 text-info' : 'bg-primary/20 text-primary'
                        }`}
                      >
                        {getInitials(entry.full_name)}
                      </Avatar>
                      <div className='min-is-0'>
                        <Typography className='truncate text-lg font-medium text-textPrimary dark:text-gray-200'>
                          {entry.full_name}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' className='truncate'>
                          {entry.position || EMPTY_TABLE_CELL}
                          {entry.locked ? ` · ${dictionary.status.LEAVE}` : ''}
                        </Typography>
                      </div>
                    </div>
                    <ToggleButtonGroup
                      exclusive
                      size='small'
                      value={entry.status}
                      disabled={rowDisabled}
                      onChange={(_, status) => changeStatus(entry, status)}
                      className='grid w-full grid-cols-3 gap-1 rounded-lg border border-divider bg-actionHover p-1 sm:w-auto'
                    >
                      <ToggleButton
                        value='PRESENT'
                        className='rounded-md! border-0! px-3! py-1.5! text-xs! text-textSecondary! [&.Mui-selected]:bg-success/10! [&.Mui-selected]:text-success!'
                      >
                        {dictionary.status.PRESENT}
                      </ToggleButton>
                      <ToggleButton
                        value='ABSENT'
                        className='rounded-md! border-0! px-3! py-1.5! text-xs! text-textSecondary! [&.Mui-selected]:bg-error/10! [&.Mui-selected]:text-error!'
                      >
                        {dictionary.status.ABSENT}
                      </ToggleButton>
                      <ToggleButton
                        value='LEAVE'
                        className='rounded-md! border-0! px-3! py-1.5! text-xs! text-textSecondary! [&.Mui-selected]:bg-info/10! [&.Mui-selected]:text-info! [&.Mui-selected]:shadow-sm!'
                      >
                        {dictionary.status.LEAVE}
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </div>

                  <div className='mt-4 border-bs border-divider pt-4'>
                    {showTimes ? (
                      <div className='grid min-is-0 grid-cols-2 gap-3 sm:grid-cols-2'>
                        <TimePickerInput
                          locale={locale}
                          size='small'
                          label={dictionary.fields.checkIn}
                          className='[&>div]:h-10'
                          value={entry.check_in_time}
                          disabled={rowDisabled}
                          slotProps={{ inputLabel: { shrink: true } }}
                          onChange={event => updateEntry(entry.staff_id, { check_in_time: event.target.value })}
                        />
                        <TimePickerInput
                          locale={locale}
                          size='small'
                          label={dictionary.fields.checkOut}
                          className='[&>div]:h-10'
                          value={entry.check_out_time}
                          disabled={rowDisabled}
                          slotProps={{ inputLabel: { shrink: true } }}
                          onChange={event => updateEntry(entry.staff_id, { check_out_time: event.target.value })}
                        />
                      </div>
                    ) : (
                      <CustomTextField
                        fullWidth
                        size='small'
                        label={dictionary.fields.notes}
                        placeholder={dictionary.actions.addNote}
                        value={entry.notes}
                        disabled={rowDisabled}
                        onChange={event => updateEntry(entry.staff_id, { notes: event.target.value })}
                        sx={{ '& .MuiInputBase-root': { minHeight: 40 } }}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}

          {!loading && visibleEntries.length === 0 && (
            <div className='flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center'>
              <i className='tabler-user-search text-4xl text-textSecondary' />
              <Typography variant='h6'>{dictionary.drawer.noStaffFound}</Typography>
            </div>
          )}
        </div>

        <Divider />
        <div className='form-surface-actions sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-bs border-divider bg-background/95 p-4 backdrop-blur sm:px-6'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            {statusSummary.map(({ status, count }) => (
              <Typography
                key={status}
                variant='body2'
                className={
                  status === 'PRESENT'
                    ? 'font-medium text-emerald-600 dark:text-emerald-400'
                    : status === 'ABSENT'
                      ? 'font-medium text-rose-600 dark:text-rose-400'
                      : 'font-medium text-amber-600 dark:text-amber-400'
                }
              >
                {count} {dictionary.status[status]}
              </Typography>
            ))}
          </div>
          <div className='flex items-center gap-3'>
            <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>
              {dictionary.actions.cancel}
            </Button>
            <Button
              variant='contained'
              onClick={saveAttendance}
              disabled={controlsDisabled || editableEntries.length === 0}
            >
              <LoadingButtonContent loading={saving} loadingLabel={dictionary.actions.saving}>
                {dictionary.actions.saveAll}
              </LoadingButtonContent>
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default AttendanceDrawer

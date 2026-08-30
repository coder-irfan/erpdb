'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
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
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'

const getEntries = (attendanceStaff, defaultWorkHours) =>
  attendanceStaff.map(staff => ({
    staff_id: staff.id,
    full_name: staff.full_name,
    position: staff.position,
    locked: Boolean(staff.record?.leave_request_id),
    status: staff.record?.status || 'PRESENT',
    check_in_time: staff.record?.check_in_time || defaultWorkHours.start,
    check_out_time: staff.record?.check_out_time || defaultWorkHours.end,
    notes: staff.record?.notes || '',
    noteOpen: Boolean(staff.record?.notes)
  }))

const AttendanceDrawerSkeleton = ({ rows = 4 }) => (
  <div aria-busy='true' aria-label='Loading attendance staff'>
    <div className='space-y-3 md:hidden'>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className='overflow-hidden rounded-lg border border-divider p-4'>
          <Skeleton variant='text' width='55%' height={28} animation='wave' />
          <Skeleton variant='text' width='35%' height={20} animation='wave' />
          <div className='mt-3 grid grid-cols-3 gap-2'>
            <Skeleton variant='rounded' height={32} animation='wave' />
            <Skeleton variant='rounded' height={32} animation='wave' />
            <Skeleton variant='rounded' height={32} animation='wave' />
          </div>
          <div className='mt-3 grid grid-cols-2 gap-2'>
            <Skeleton variant='rounded' height={54} animation='wave' />
            <Skeleton variant='rounded' height={54} animation='wave' />
          </div>
          <Skeleton variant='rounded' height={40} animation='wave' className='mt-3' />
        </div>
      ))}
    </div>
    <div className='hidden divide-y divide-divider md:block'>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className='grid grid-cols-[minmax(140px,1fr)_180px_220px_96px] items-center gap-4 py-4 lg:grid-cols-[minmax(180px,1fr)_210px_270px_120px]'>
          <div>
            <Skeleton variant='text' width='65%' height={26} animation='wave' />
            <Skeleton variant='text' width='40%' height={20} animation='wave' />
          </div>
          <Skeleton variant='rounded' height={32} animation='wave' />
          <div className='grid grid-cols-2 gap-3'>
            <Skeleton variant='rounded' height={46} animation='wave' />
            <Skeleton variant='rounded' height={46} animation='wave' />
          </div>
          <Skeleton variant='rounded' height={32} animation='wave' />
        </div>
      ))}
    </div>
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
      PaperProps={{ className: 'is-full sm:is-[840px]' }}
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
        <div className='space-y-4 px-4 py-5 sm:px-6'>
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

        <div className='flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6 sm:px-6'>
          {loading ? <AttendanceDrawerSkeleton /> : visibleEntries.map(entry => {
            const rowDisabled = controlsDisabled || entry.locked
            const showTimes = entry.status === 'PRESENT'

            return (
              <div key={entry.staff_id} className='rounded-lg border border-divider p-4 md:rounded-none md:border-0 md:border-b md:p-0 md:py-4'>
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
                  <div className='min-is-0 md:is-[180px]'>
                    <Typography className='truncate font-medium'>{entry.full_name}</Typography>
                    <Typography variant='body2' color='text.secondary' className='truncate'>
                      {entry.position || '-'}
                      {entry.locked ? ` · ${dictionary.status.LEAVE}` : ''}
                    </Typography>
                  </div>
                  <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={entry.status}
                    disabled={rowDisabled}
                    onChange={(_, status) => changeStatus(entry, status)}
                    className='flex w-full md:w-auto'
                  >
                    <ToggleButton color='success' value='PRESENT' className='flex-1'>
                      {dictionary.status.PRESENT}
                    </ToggleButton>
                    <ToggleButton color='error' value='ABSENT' className='flex-1'>
                      {dictionary.status.ABSENT}
                    </ToggleButton>
                    <ToggleButton color='info' value='LEAVE' className='flex-1'>
                      {dictionary.status.LEAVE}
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <div className='grid min-is-0 grid-cols-2 gap-2 md:is-[270px] md:gap-3'>
                    <NativeDateTimeInput
                      mode='time'
                      locale={locale}
                      size='small'
                      label={dictionary.fields.checkIn}
                      value={showTimes ? entry.check_in_time : ''}
                      disabled={rowDisabled || !showTimes}
                      slotProps={{ inputLabel: { shrink: true } }}
                      onChange={event => updateEntry(entry.staff_id, { check_in_time: event.target.value })}
                    />
                    <NativeDateTimeInput
                      mode='time'
                      locale={locale}
                      size='small'
                      label={dictionary.fields.checkOut}
                      value={showTimes ? entry.check_out_time : ''}
                      disabled={rowDisabled || !showTimes}
                      slotProps={{ inputLabel: { shrink: true } }}
                      onChange={event => updateEntry(entry.staff_id, { check_out_time: event.target.value })}
                    />
                  </div>
                </div>

                <div className='mt-3 md:mt-2'>
                  {entry.noteOpen ? (
                    <div className='flex items-start gap-2'>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label={dictionary.fields.notes}
                        value={entry.notes}
                        disabled={rowDisabled}
                        onChange={event => updateEntry(entry.staff_id, { notes: event.target.value })}
                      />
                      {!entry.notes && !rowDisabled && (
                        <IconButton size='small' onClick={() => updateEntry(entry.staff_id, { noteOpen: false })}>
                          <i className='tabler-x' />
                        </IconButton>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant='tonal'
                      color='secondary'
                      size='small'
                      className='w-full md:w-auto'
                      startIcon={<i className='tabler-note' />}
                      disabled={rowDisabled}
                      onClick={() => updateEntry(entry.staff_id, { noteOpen: true })}
                    >
                      {dictionary.actions.addNote}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {!loading && visibleEntries.length === 0 && (
            <div className='flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center'>
              <i className='tabler-user-search text-4xl text-textSecondary' />
              <Typography variant='h6'>{dictionary.drawer.noStaffFound}</Typography>
            </div>
          )}
        </div>

        <Divider />
        <div className='form-surface-actions flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6'>
          <Typography variant='body2' color='text.secondary'>
            {editableEntries.length} {dictionary.drawer.readyToSave}
          </Typography>
          <div className='flex gap-3'>
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

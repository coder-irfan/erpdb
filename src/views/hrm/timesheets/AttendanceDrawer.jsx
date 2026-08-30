'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import LocalizedDateTimePicker from '@/components/inputs/LocalizedDateTimePicker'

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

const AttendanceDrawer = ({
  open,
  date,
  attendanceStaff = [],
  defaultWorkHours,
  guard = {},
  locale,
  dictionary,
  onClose,
  onSaved
}) => {
  const [entries, setEntries] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const blockedMessage = guard.isFuture ? dictionary.messages.futureDateBlocked : guard.payrollLocked ? dictionary.messages.payrollLocked : ''

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
      <div className='flex items-start justify-between gap-4 px-6 py-5'>
        <div>
          <Typography variant='h5'>{dictionary.actions.mark}</Typography>
          <Typography color='text.secondary'>
            {date} · {dictionary.drawer.description}
          </Typography>
        </div>
        <IconButton onClick={onClose} disabled={saving} aria-label={dictionary.actions.cancel}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />

      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='space-y-4 px-6 py-5'>
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

        <div className='flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6'>
          {visibleEntries.map(entry => {
            const rowDisabled = controlsDisabled || entry.locked
            const showTimes = entry.status === 'PRESENT'

            return (
              <div key={entry.staff_id} className='rounded-lg border border-divider bg-paper p-4 shadow-sm'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                  <div className='min-is-0 lg:is-[210px]'>
                    <Typography className='truncate font-medium'>{entry.full_name}</Typography>
                    <Typography variant='body2' color='text.secondary' className='truncate'>
                      {entry.position || '—'}
                      {entry.locked ? ` · ${dictionary.status.LEAVE}` : ''}
                    </Typography>
                  </div>
                  <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={entry.status}
                    disabled={rowDisabled}
                    onChange={(_, status) => changeStatus(entry, status)}
                    className='self-start lg:self-auto'
                  >
                    <ToggleButton color='success' value='PRESENT'>{dictionary.status.PRESENT}</ToggleButton>
                    <ToggleButton color='error' value='ABSENT'>{dictionary.status.ABSENT}</ToggleButton>
                    <ToggleButton color='info' value='LEAVE'>{dictionary.status.LEAVE}</ToggleButton>
                  </ToggleButtonGroup>
                  <div className='grid min-is-0 grid-cols-2 gap-3 lg:is-[270px]'>
                    <LocalizedDateTimePicker
                      mode='time'
                      locale={locale}
                      size='small'
                      label={dictionary.fields.checkIn}
                      value={showTimes ? entry.check_in_time : ''}
                      disabled={rowDisabled || !showTimes}
                      slotProps={{ inputLabel: { shrink: true } }}
                      onChange={event => updateEntry(entry.staff_id, { check_in_time: event.target.value })}
                    />
                    <LocalizedDateTimePicker
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

                <div className='mt-3'>
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
                      variant='text'
                      size='small'
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

          {visibleEntries.length === 0 && (
            <div className='flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center'>
              <i className='tabler-user-search text-4xl text-textSecondary' />
              <Typography variant='h6'>{dictionary.drawer.noStaffFound}</Typography>
            </div>
          )}
        </div>

        <Divider />
        <div className='flex flex-wrap items-center justify-between gap-3 p-6'>
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

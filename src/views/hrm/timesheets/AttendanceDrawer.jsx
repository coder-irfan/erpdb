'use client'

import { useEffect, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createTimesheetSchema } from '@/schemas/hrm/timesheets'

const LOCALIZED_COPY = {
  en: {
    markAll: 'Mark All Present',
    saveAll: 'Save All Attendance',
    complete: 'Attendance is complete for this date',
    completeDescription: 'Every active staff member has already been marked.'
  },
  ps: {
    markAll: 'ټول کارکوونکي حاضر ثبتول',
    saveAll: 'ټوله حاضري خوندي کول',
    complete: 'د دې نېټې حاضري بشپړه شوې ده',
    completeDescription: 'د ټولو فعالو کارکوونکو حاضري ثبت شوې ده.'
  },
  fa: {
    markAll: 'ثبت حضور همه',
    saveAll: 'ذخیره همه حاضری‌ها',
    complete: 'حاضری این تاریخ کامل است',
    completeDescription: 'حاضری تمام کارکنان فعال ثبت شده است.'
  }
}

const getDefaults = (record, date, defaultWorkHours, defaultStaffId = '') => ({
  staff_id: record?.staff_id || defaultStaffId,
  status: record?.status || 'PRESENT',
  date,
  check_in_time: record?.check_in_time || defaultWorkHours.start,
  check_out_time: record?.check_out_time || defaultWorkHours.end,
  notes: record?.notes || ''
})

const getBulkEntries = attendanceStaff =>
  attendanceStaff
    .filter(staff => !staff.record)
    .map(staff => ({
      staff_id: staff.id,
      full_name: staff.full_name,
      position: staff.position,
      locked: Boolean(staff.record?.leave_request_id),
      status: staff.record?.status || '',
      check_in_time: staff.record?.check_in_time || '',
      check_out_time: staff.record?.check_out_time || '',
      notes: staff.record?.notes || ''
    }))

const AttendanceDrawer = ({
  open,
  record,
  date,
  staff,
  attendanceStaff = [],
  defaultWorkHours,
  locale,
  dictionary,
  onClose,
  onSaved
}) => {
  const [staffQueue, setStaffQueue] = useState(staff)
  const [savingMode, setSavingMode] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkEntries, setBulkEntries] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const savingRequestRef = useRef(false)
  const initialDataRef = useRef({ staff, attendanceStaff })

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: valibotResolver(createTimesheetSchema(dictionary.validation)),
    defaultValues: getDefaults(record, date, defaultWorkHours)
  })

  const status = watch('status')
  const isSavingSingle = savingMode !== null
  const isSaving = isSavingSingle || bulkSaving
  const isAttendanceComplete = !record && attendanceStaff.length > 0 && attendanceStaff.every(item => item.record)

  useEffect(() => {
    initialDataRef.current = { staff, attendanceStaff }
  }, [attendanceStaff, staff])

  useEffect(() => {
    if (!open) return

    const { staff: initialStaff, attendanceStaff: initialAttendanceStaff } = initialDataRef.current

    setStaffQueue(initialStaff)
    setSavingMode(null)
    setBulkMode(false)
    setBulkSaving(false)
    setBulkEntries(getBulkEntries(initialAttendanceStaff))
    reset(getDefaults(record, date, defaultWorkHours, record ? '' : initialStaff[0]?.id || ''))
  }, [date, defaultWorkHours, open, record, reset])

  const setStatus = nextStatus => {
    if (!nextStatus) return

    setValue('status', nextStatus, { shouldDirty: true, shouldValidate: true })

    if (nextStatus === 'PRESENT') {
      setValue('check_in_time', defaultWorkHours.start)
      setValue('check_out_time', defaultWorkHours.end)
    } else {
      setValue('check_in_time', '')
      setValue('check_out_time', '')
    }
  }

  const submit = mode =>
    handleSubmit(async values => {
      if (savingRequestRef.current) return

      const isNext = mode === 'NEXT' && !record
      let nextQueue = staffQueue

      savingRequestRef.current = true
      setSavingMode(mode)

      // Move immediately so the next employee can be edited while this save finishes in the background.
      if (isNext) {
        nextQueue = staffQueue.filter(item => item.id !== values.staff_id)
        setStaffQueue(nextQueue)

        if (nextQueue.length > 0) reset(getDefaults(null, date, defaultWorkHours, nextQueue[0].id))
        else onClose()
      }

      try {
        const response = await fetch(record ? `/api/hrm/timesheets/${record.id}` : '/api/hrm/timesheets', {
          method: record ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            notes: record?.leave_request_id ? `Approved leave request ${record.leave_request_id}` : values.notes,
            locale
          })
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          toast.error(result.error || dictionary.messages.operationFailed)

          return
        }

        toast.success(result.message)
        void onSaved(result.data)

        if (!isNext) onClose()
      } catch {
        toast.error(dictionary.messages.operationFailed)
      } finally {
        savingRequestRef.current = false
        setSavingMode(null)
      }
    })()

  const markAllPresent = () => {
    setBulkMode(true)
    setBulkEntries(entries =>
      entries.map(entry =>
        entry.locked
          ? entry
          : {
              ...entry,
              status: 'PRESENT',
              check_in_time: defaultWorkHours.start,
              check_out_time: defaultWorkHours.end
            }
      )
    )
  }

  const updateBulkEntry = (staffId, changes) => {
    setBulkEntries(entries => entries.map(entry => (entry.staff_id === staffId ? { ...entry, ...changes } : entry)))
  }

  const saveBulkAttendance = async () => {
    if (bulkEntries.some(entry => !entry.status)) {
      toast.error(dictionary.validation.required)

      return
    }

    setBulkSaving(true)

    try {
      const response = await fetch('/api/hrm/timesheets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          locale,
          records: bulkEntries.map(({ staff_id, status, check_in_time, check_out_time, notes }) => ({
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
      setBulkSaving(false)
    }
  }

  const localizedCopy = LOCALIZED_COPY[locale] || LOCALIZED_COPY.en
  const markAllPresentLabel = dictionary.actions.markAllPresent || localizedCopy.markAll || dictionary.actions.mark
  const saveAllLabel = dictionary.actions.saveAll || localizedCopy.saveAll || dictionary.actions.save

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSaving ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[680px]' }}
    >
      <div className='flex items-start justify-between gap-4 p-6'>
        <div>
          <Typography variant='h5'>
            {bulkMode ? dictionary.drawer.title : record ? dictionary.drawer.editTitle : dictionary.drawer.title}
          </Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <div className='flex items-center gap-1'>
          {!record && !bulkMode && !isAttendanceComplete && attendanceStaff.some(item => !item.record) && (
            <Button variant='tonal' size='small' startIcon={<i className='tabler-users' />} onClick={markAllPresent}>
              {markAllPresentLabel}
            </Button>
          )}
          <IconButton onClick={onClose} disabled={isSaving}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </div>
      <Divider />
      {isAttendanceComplete ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center'>
          <div className='flex size-16 items-center justify-center rounded-full bg-success/15 text-success'>
            <i className='tabler-circle-check text-4xl' />
          </div>
          <div>
            <Typography variant='h6'>
              {dictionary.drawer.completeTitle || localizedCopy.complete || dictionary.table.emptyTitle}
            </Typography>
            <Typography color='text.secondary' className='mt-1'>
              {dictionary.drawer.completeDescription ||
                localizedCopy.completeDescription ||
                dictionary.table.description}
            </Typography>
          </div>
          <Button variant='tonal' onClick={onClose}>
            {dictionary.actions.cancel}
          </Button>
        </div>
      ) : bulkMode ? (
        <div className='flex flex-1 flex-col overflow-hidden'>
          <div className='flex flex-wrap items-center justify-between gap-3 px-6 pb-3 pt-5'>
            <Typography variant='body2' color='text.secondary'>
              {bulkEntries.length} {dictionary.fields.staff}
            </Typography>
            <Button variant='text' size='small' onClick={markAllPresent} disabled={bulkSaving}>
              {markAllPresentLabel}
            </Button>
          </div>
          <div className='flex flex-1 flex-col gap-3 overflow-y-auto px-6 pb-6'>
            {bulkEntries.map(entry => (
              <div key={entry.staff_id} className='rounded border border-divider p-3'>
                <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <Typography className='font-medium'>{entry.full_name}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {entry.position}
                      {entry.locked ? ` · ${dictionary.status.LEAVE}` : ''}
                    </Typography>
                  </div>
                  <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={entry.status}
                    disabled={entry.locked || bulkSaving}
                    onChange={(_, nextStatus) => {
                      if (!nextStatus) return

                      updateBulkEntry(entry.staff_id, {
                        status: nextStatus,
                        check_in_time: nextStatus === 'PRESENT' ? defaultWorkHours.start : '',
                        check_out_time: nextStatus === 'PRESENT' ? defaultWorkHours.end : ''
                      })
                    }}
                  >
                    <ToggleButton color='success' value='PRESENT'>
                      {dictionary.status.PRESENT}
                    </ToggleButton>
                    <ToggleButton color='error' value='ABSENT'>
                      {dictionary.status.ABSENT}
                    </ToggleButton>
                    <ToggleButton color='info' value='LEAVE'>
                      {dictionary.status.LEAVE}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </div>
                <CustomTextField
                  fullWidth
                  size='small'
                  label={dictionary.fields.notes}
                  value={entry.notes}
                  disabled={entry.locked || bulkSaving}
                  onChange={event => updateBulkEntry(entry.staff_id, { notes: event.target.value })}
                />
              </div>
            ))}
          </div>
          <Divider />
          <div className='flex flex-wrap justify-end gap-3 p-6'>
            <Button variant='tonal' color='secondary' onClick={onClose} disabled={bulkSaving}>
              {dictionary.actions.cancel}
            </Button>
            <Button variant='contained' onClick={saveBulkAttendance} disabled={bulkSaving || bulkEntries.length === 0}>
              <LoadingButtonContent loading={bulkSaving} loadingLabel={dictionary.actions.saving}>
                {saveAllLabel}
              </LoadingButtonContent>
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex flex-1 flex-col gap-5 overflow-y-auto p-6'>
          <CustomTextField fullWidth disabled label={dictionary.fields.date} value={date} />
          <input type='hidden' {...register('date')} />
          {record ? (
            <>
              <CustomTextField fullWidth disabled label={dictionary.fields.staff} value={record.staff.full_name} />
              <input type='hidden' {...register('staff_id')} />
            </>
          ) : (
            <Controller
              name='staff_id'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  select
                  fullWidth
                  label={dictionary.fields.staff}
                  value={field.value || ''}
                  error={Boolean(errors.staff_id)}
                  helperText={errors.staff_id?.message}
                >
                  <MenuItem value='' disabled>
                    {dictionary.placeholders.selectStaff}
                  </MenuItem>
                  {staffQueue.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.full_name} — {item.position}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
          )}
          <div>
            <Typography variant='body2' color='text.primary' className='mb-2'>
              {dictionary.fields.status}
            </Typography>
            <Controller
              name='status'
              control={control}
              render={() => (
                <ToggleButtonGroup exclusive fullWidth value={status} onChange={(_, value) => setStatus(value)}>
                  <ToggleButton color='success' value='PRESENT'>
                    {dictionary.status.PRESENT}
                  </ToggleButton>
                  <ToggleButton color='error' value='ABSENT'>
                    {dictionary.status.ABSENT}
                  </ToggleButton>
                  <ToggleButton color='info' value='LEAVE'>
                    {dictionary.status.LEAVE}
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />
            {errors.status && (
              <Typography variant='caption' color='error'>
                {errors.status.message}
              </Typography>
            )}
          </div>
          {status === 'PRESENT' && (
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
              <CustomTextField
                fullWidth
                type='time'
                label={dictionary.fields.checkIn}
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.check_in_time)}
                helperText={errors.check_in_time?.message}
                {...register('check_in_time')}
              />
              <CustomTextField
                fullWidth
                type='time'
                label={dictionary.fields.checkOut}
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.check_out_time)}
                helperText={errors.check_out_time?.message}
                {...register('check_out_time')}
              />
            </div>
          )}
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={dictionary.fields.notes}
            disabled={Boolean(record?.leave_request_id)}
            error={Boolean(errors.notes)}
            helperText={errors.notes?.message}
            {...register('notes')}
          />
          <div className='mt-auto flex flex-wrap justify-end gap-3 pt-4'>
            <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSavingSingle}>
              {dictionary.actions.cancel}
            </Button>
            {!record && (
              <Button
                variant='tonal'
                onClick={() => submit('NEXT')}
                disabled={savingMode === 'NEXT' || staffQueue.length === 0}
              >
                <LoadingButtonContent loading={savingMode === 'NEXT'} loadingLabel={dictionary.actions.saving}>
                  {dictionary.actions.saveNext}
                </LoadingButtonContent>
              </Button>
            )}
            <Button
              variant='contained'
              onClick={() => submit('SAVE')}
              disabled={savingMode === 'SAVE' || (!record && staffQueue.length === 0)}
            >
              <LoadingButtonContent loading={savingMode === 'SAVE'} loadingLabel={dictionary.actions.saving}>
                {record ? dictionary.actions.saveChanges : dictionary.actions.save}
              </LoadingButtonContent>
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default AttendanceDrawer

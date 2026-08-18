'use client'

import { useEffect } from 'react'

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

const getDefaults = (record, date, defaultWorkHours) => ({
  staff_id: record?.staff_id || '',
  status: record?.status || 'PRESENT',
  date,
  check_in_time: record?.check_in_time || defaultWorkHours.start,
  check_out_time: record?.check_out_time || defaultWorkHours.end,
  notes: record?.notes || ''
})

const AttendanceDrawer = ({ open, record, date, staff, defaultWorkHours, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createTimesheetSchema(dictionary.validation)),
    defaultValues: getDefaults(record, date, defaultWorkHours)
  })

  const status = watch('status')

  useEffect(() => {
    if (open) reset(getDefaults(record, date, defaultWorkHours))
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

  const submit = stayOpen =>
    handleSubmit(async values => {
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
        await onSaved(result.data)

        if (stayOpen && !record) reset(getDefaults(null, date, defaultWorkHours))
        else onClose()
      } catch {
        toast.error(dictionary.messages.operationFailed)
      }
    })()

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[520px]' }}
    >
      <div className='flex items-start justify-between gap-4 p-6'>
        <div>
          <Typography variant='h5'>{record ? dictionary.drawer.editTitle : dictionary.drawer.title}</Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
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
                {staff.map(item => (
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
          <>
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
          </>
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
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          {!record && (
            <Button variant='tonal' onClick={() => submit(true)} disabled={isSubmitting || staff.length === 0}>
              <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
                {dictionary.actions.saveNext}
              </LoadingButtonContent>
            </Button>
          )}
          <Button
            variant='contained'
            onClick={() => submit(false)}
            disabled={isSubmitting || (!record && staff.length === 0)}
          >
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {record ? dictionary.actions.saveChanges : dictionary.actions.save}
            </LoadingButtonContent>
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export default AttendanceDrawer

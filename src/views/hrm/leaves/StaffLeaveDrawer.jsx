'use client'

import { useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import { createLeaveSchema } from '@/schemas/hrm/leaves'
import { calculateLeaveWorkingDays, getKabulToday } from '@/utils/leaveDates'
import { formatStatusLabel } from '@/utils/formatStatusLabel'

const today = () => getKabulToday()

const withCurrentOption = (options, current) => {
  if (!current || options.some(option => option.id === current.id)) return options

  return [...options, current]
}

const getDefaults = (leave, currentStaffId, statuses = []) => ({
  staff_id: leave?.staff_id || currentStaffId || '',
  leave_type_id: leave?.leave_type_id || '',
  start_date: leave?.start_date || today(),
  end_date: leave?.end_date || today(),
  reason: leave?.reason || '',
  is_paid: leave?.is_paid ?? true,
  status_id: leave?.status_id || statuses.find(status => status.value === 'PENDING')?.id || ''
})

const StaffLeaveDrawer = ({ open, leave, options, currentStaffId, canManage, locale, dictionary, onClose, onSaved }) => {
  const [balance, setBalance] = useState(null)
  const staffOptions = useMemo(() => withCurrentOption(options.staff, leave?.staff), [leave?.staff, options.staff])
  const leaveTypes = useMemo(() => withCurrentOption(options.leaveTypes, leave?.leave_type), [leave?.leave_type, options.leaveTypes])

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createLeaveSchema(dictionary.validation)),
    defaultValues: getDefaults(leave, currentStaffId, options.statuses)
  })

  useEffect(() => {
    if (open) reset(getDefaults(leave, currentStaffId, options.statuses))
  }, [currentStaffId, leave, open, options.statuses, reset])

  const startDate = watch('start_date')
  const endDate = watch('end_date')
  const staffId = watch('staff_id')
  const leaveTypeId = watch('leave_type_id')
  const calculatedDays = startDate && endDate ? calculateLeaveWorkingDays(startDate, endDate, options.holidays || []) : 0

  useEffect(() => {
    if (!open || !staffId || !leaveTypeId || !startDate) {
      setBalance(null)

      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({ staff_id: staffId, leave_type_id: leaveTypeId, year: startDate.slice(0, 4) })

    if (leave?.id) params.set('exclude_leave_id', leave.id)

    fetch(`/api/hrm/leaves/balance?${params}`, { cache: 'no-store', signal: controller.signal })
      .then(response => response.json())
      .then(result => setBalance(result.success ? result.data : null))
      .catch(error => {
        if (error.name !== 'AbortError') setBalance(null)
      })

    return () => controller.abort()
  }, [leave?.id, leaveTypeId, open, staffId, startDate])

  const submit = async values => {
    if (calculatedDays < 1) return

    try {
      const response = await fetch(leave ? `/api/hrm/leaves/${leave.id}` : '/api/hrm/leaves', {
        method: leave ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.operationFailed)

        return
      }

      toast.success(result.message)
      await onSaved()
      onClose()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  const closeDrawer = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <Drawer anchor='right' open={open} onClose={closeDrawer} slotProps={{ paper: { className: 'is-full sm:is-[540px]' } }}>
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-6'>
        <div>
          <Typography variant='h5'>{leave ? dictionary.drawer.editTitle : dictionary.drawer.title}</Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <IconButton onClick={closeDrawer} disabled={isSubmitting} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
      <form className='form-surface-scroll flex flex-1 flex-col gap-5 p-6' onSubmit={handleSubmit(submit)} noValidate>
        <FormSectionCards labels={[dictionary.tabs?.general || 'Leave request', dictionary.tabs?.approval || 'Balance and approval']}>
        <Controller
          name='staff_id'
          control={control}
          render={({ field }) => (
            <CustomTextField {...field} select fullWidth required label={dictionary.fields.staff} value={field.value || ''} disabled={isSubmitting || !canManage} error={Boolean(errors.staff_id)} helperText={errors.staff_id?.message}>
              <MenuItem value='' disabled>{dictionary.placeholders.selectStaff}</MenuItem>
              {staffOptions.map(staff => <MenuItem key={staff.id} value={staff.id}>{staff.full_name} <>&mdash;</> {staff.position}</MenuItem>)}
            </CustomTextField> 
          )}
        />
        <Controller
          name='leave_type_id'
          control={control}
          render={({ field }) => (
            <CustomTextField {...field} onChange={event => {
              field.onChange(event)
              const selected = leaveTypes.find(type => type.id === event.target.value)

              if (selected) setValue('is_paid', selected.is_paid_leave)
            }} select fullWidth required label={dictionary.fields.leaveType} value={field.value || ''} disabled={isSubmitting} error={Boolean(errors.leave_type_id)} helperText={errors.leave_type_id?.message}>
              <MenuItem value='' disabled>{dictionary.placeholders.selectLeaveType}</MenuItem>
              {leaveTypes.map(type => <MenuItem key={type.id} value={type.id}>{type.label}</MenuItem>)}
            </CustomTextField>
          )}
        />
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
          <NativeDateTimeInput fullWidth required locale={locale} label={dictionary.fields.startDate} disabled={isSubmitting} error={Boolean(errors.start_date)} helperText={errors.start_date?.message} {...register('start_date')} />
          <NativeDateTimeInput fullWidth required locale={locale} label={dictionary.fields.endDate} disabled={isSubmitting} error={Boolean(errors.end_date) || calculatedDays < 1} helperText={errors.end_date?.message || (calculatedDays < 1 ? dictionary.validation.dateRangeInvalid : '')} {...register('end_date')} />
        </div>
        <div className='flex items-center justify-between rounded border border-primary/20 bg-primaryLighter p-4'>
          <Typography color='text.secondary'>Net Working Days (Fridays and public holidays excluded)</Typography>
          <Typography variant='h5' color={calculatedDays > 0 ? 'primary.main' : 'error.main'}>{Math.max(0, calculatedDays)}</Typography>
        </div>
        {balance && (
          <div className='rounded border border-divider p-4'>
            <Typography variant='subtitle2'>Leave balance</Typography>
            <Typography color='text.secondary'>
              {balance.allowed == null
                ? 'Yearly allowance is not configured for this leave type.'
                : `Allowed: ${balance.allowed} / Taken: ${balance.taken} / Pending: ${balance.pending} / Remaining: ${balance.remaining}`}
            </Typography>
            {balance.remaining != null && calculatedDays > balance.remaining && (
              <Typography color='error.main' variant='body2'>Requested days exceed the remaining balance.</Typography>
            )}
          </div>
        )}
        <Controller
          name='is_paid'
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={event => field.onChange(event.target.checked)} />}
              label={`Paid Leave: ${field.value ? 'Yes' : 'No'}`}
              disabled={isSubmitting || !canManage}
            />
          )}
        />
        {!leave && canManage && (
          <Controller
            name='status_id'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} select fullWidth label={dictionary.fields.initialStatus} value={field.value || ''} disabled={isSubmitting}>
                <MenuItem value='' disabled>{dictionary.placeholders.selectStatus}</MenuItem>
                {options.statuses
                  .filter(status => ['PENDING', 'APPROVED'].includes(status.value))
                  .map(status => <MenuItem key={status.id} value={status.id}>{formatStatusLabel(status.value, dictionary.status[status.value] || status.label)}</MenuItem>)}
              </CustomTextField>
            )}
          />
        )}
        <CustomTextField fullWidth multiline minRows={4} label={dictionary.fields.reason} placeholder={dictionary.placeholders.reason} disabled={isSubmitting} error={Boolean(errors.reason)} helperText={errors.reason?.message} {...register('reason')} />
        </FormSectionCards>
        <div className='form-surface-actions -mx-6 -mb-6 mt-auto flex justify-end gap-3 p-6'>
          <Button type='button' variant='tonal' color='secondary' onClick={closeDrawer} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' disabled={isSubmitting || calculatedDays < 1 || (balance?.remaining != null && calculatedDays > balance.remaining)}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>{leave ? dictionary.actions.saveChanges : dictionary.actions.submit}</LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default StaffLeaveDrawer

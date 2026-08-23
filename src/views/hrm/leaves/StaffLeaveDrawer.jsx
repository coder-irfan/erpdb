'use client'

import { useEffect, useMemo } from 'react'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createLeaveSchema } from '@/schemas/hrm/leaves'
import { calculateLeaveDays, getKabulToday } from '@/utils/leaveDates'

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
  status_id: leave?.status_id || statuses.find(status => status.value === 'PENDING')?.id || ''
})

const StaffLeaveDrawer = ({ open, leave, options, currentStaffId, canManage, locale, dictionary, onClose, onSaved }) => {
  const staffOptions = useMemo(() => withCurrentOption(options.staff, leave?.staff), [leave?.staff, options.staff])
  const leaveTypes = useMemo(() => withCurrentOption(options.leaveTypes, leave?.leave_type), [leave?.leave_type, options.leaveTypes])

  const {
    control,
    register,
    handleSubmit,
    reset,
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
  const calculatedDays = startDate && endDate ? calculateLeaveDays(startDate, endDate) : 0

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
      <div className='flex items-start justify-between gap-4 p-6'>
        <div>
          <Typography variant='h5'>{leave ? dictionary.drawer.editTitle : dictionary.drawer.title}</Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <IconButton onClick={closeDrawer} disabled={isSubmitting} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
      <form className='flex flex-1 flex-col gap-5 overflow-y-auto p-6' onSubmit={handleSubmit(submit)} noValidate>
        <Controller
          name='staff_id'
          control={control}
          render={({ field }) => (
            <CustomTextField {...field} select fullWidth required label={dictionary.fields.staff} value={field.value || ''} disabled={isSubmitting || !canManage} error={Boolean(errors.staff_id)} helperText={errors.staff_id?.message}>
              <MenuItem value='' disabled>{dictionary.placeholders.selectStaff}</MenuItem>
              {staffOptions.map(staff => <MenuItem key={staff.id} value={staff.id}>{staff.full_name} — {staff.position}</MenuItem>)}
            </CustomTextField> 
          )}
        />
        <Controller
          name='leave_type_id'
          control={control}
          render={({ field }) => (
            <CustomTextField {...field} select fullWidth required label={dictionary.fields.leaveType} value={field.value || ''} disabled={isSubmitting} error={Boolean(errors.leave_type_id)} helperText={errors.leave_type_id?.message}>
              <MenuItem value='' disabled>{dictionary.placeholders.selectLeaveType}</MenuItem>
              {leaveTypes.map(type => <MenuItem key={type.id} value={type.id}>{type.label}</MenuItem>)}
            </CustomTextField>
          )}
        />
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
          <CustomTextField fullWidth required type='date' label={dictionary.fields.startDate} slotProps={{ inputLabel: { shrink: true } }} disabled={isSubmitting} error={Boolean(errors.start_date)} helperText={errors.start_date?.message} {...register('start_date')} />
          <CustomTextField fullWidth required type='date' label={dictionary.fields.endDate} slotProps={{ inputLabel: { shrink: true } }} disabled={isSubmitting} error={Boolean(errors.end_date) || calculatedDays < 1} helperText={errors.end_date?.message || (calculatedDays < 1 ? dictionary.validation.dateRangeInvalid : '')} {...register('end_date')} />
        </div>
        <div className='flex items-center justify-between rounded border border-primary/20 bg-primaryLighter p-4'>
          <Typography color='text.secondary'>{dictionary.drawer.calculatedDays}</Typography>
          <Typography variant='h5' color={calculatedDays > 0 ? 'primary.main' : 'error.main'}>{Math.max(0, calculatedDays)}</Typography>
        </div>
        {!leave && canManage && (
          <Controller
            name='status_id'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} select fullWidth label={dictionary.fields.initialStatus} value={field.value || ''} disabled={isSubmitting}>
                <MenuItem value='' disabled>{dictionary.placeholders.selectStatus}</MenuItem>
                {options.statuses
                  .filter(status => ['PENDING', 'APPROVED'].includes(status.value))
                  .map(status => <MenuItem key={status.id} value={status.id}>{dictionary.status[status.value] || status.label}</MenuItem>)}
              </CustomTextField>
            )}
          />
        )}
        <CustomTextField fullWidth multiline minRows={4} label={dictionary.fields.reason} placeholder={dictionary.placeholders.reason} disabled={isSubmitting} error={Boolean(errors.reason)} helperText={errors.reason?.message} {...register('reason')} />
        <div className='mt-auto flex justify-end gap-3 pt-4'>
          <Button type='button' variant='tonal' color='secondary' onClick={closeDrawer} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' disabled={isSubmitting || calculatedDays < 1}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>{leave ? dictionary.actions.saveChanges : dictionary.actions.submit}</LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default StaffLeaveDrawer

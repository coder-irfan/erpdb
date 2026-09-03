'use client'

import { useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
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

const toDateValue = value => {
  if (!value) return ''
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const withCurrentOption = (options, current) => {
  if (!current || options.some(option => option.id === current.id)) return options

  return [...options, current]
}

const getDefaults = (leave, currentStaffId, statuses = []) => ({
  staff_id: leave?.staff_id || currentStaffId || '',
  leave_type_id: leave?.leave_type_id || '',
  start_date: toDateValue(leave?.start_date) || today(),
  end_date: toDateValue(leave?.end_date) || today(),
  total_days: leave?.total_days == null ? '' : Number(leave.total_days),
  duration_type: leave?.duration_type || 'FULL_DAY',
  half_day_shift: leave?.half_day_shift || '',
  reason: leave?.reason || '',
  is_paid: leave?.is_paid ?? true,
  status_id: leave?.status_id || statuses.find(status => status.value === 'PENDING')?.id || ''
})

const StaffLeaveDrawer = ({
  open,
  leave,
  options,
  currentStaffId,
  canManage,
  locale,
  dictionary,
  onClose,
  onSaved
}) => {
  const [balance, setBalance] = useState(null)
  const staffOptions = useMemo(() => withCurrentOption(options.staff, leave?.staff), [leave?.staff, options.staff])

  const leaveTypes = useMemo(
    () => withCurrentOption(options.leaveTypes, leave?.leave_type),
    [leave?.leave_type, options.leaveTypes]
  )

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
  const isPaid = watch('is_paid')
  const durationType = watch('duration_type')
  const isHalfDay = durationType === 'HALF_DAY'

  const calculatedDays = isHalfDay
    ? calculateLeaveWorkingDays(startDate, startDate, options.holidays || []) > 0
      ? 0.5
      : 0
    : startDate && endDate
      ? Math.trunc(calculateLeaveWorkingDays(startDate, endDate, options.holidays || []))
      : 0

  const projectedPending = balance && isPaid ? balance.pending + calculatedDays : balance?.pending

  const projectedRemaining =
    balance?.allowed == null || !isPaid ? balance?.remaining : balance.allowed - balance.taken - projectedPending

  const hasInsufficientPaidBalance = Boolean(isPaid) && balance?.remaining != null && calculatedDays > balance.remaining

  useEffect(() => {
    if (isHalfDay && startDate && endDate !== startDate) {
      setValue('end_date', startDate, { shouldDirty: true, shouldValidate: true })
    }
  }, [endDate, isHalfDay, setValue, startDate])

  useEffect(() => {
    if (!open) return

    setValue('total_days', calculatedDays || '', { shouldDirty: false, shouldValidate: false })
  }, [calculatedDays, open, setValue])

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
    if (calculatedDays < 0.5) {
      toast.error(dictionary.validation.dateRangeInvalid)

      return
    }

    try {
      const response = await fetch(leave ? `/api/hrm/leaves/${leave.id}` : '/api/hrm/leaves', {
        method: leave ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          start_date: toDateValue(values.start_date),
          end_date: isHalfDay ? toDateValue(values.start_date) : toDateValue(values.end_date),
          total_days: Number(calculatedDays),
          locale
        })
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

  const submitInvalid = formErrors => {
    console.error('HRM leave form validation failed:', formErrors)

    const firstError =
      formErrors.root || formErrors.total_days || Object.values(formErrors).find(error => error?.message)

    toast.error(firstError?.message || dictionary.messages.operationFailed)
  }

  const closeDrawer = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={closeDrawer}
      slotProps={{ paper: { className: 'is-full sm:is-[540px]' } }}
    >
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
      <form
        className='form-surface-scroll flex flex-1 flex-col gap-5 px-4 pt-5 overflow-x-hidden'
        onSubmit={handleSubmit(submit, submitInvalid)}
        noValidate
      >
        <FormSectionCards
          labels={[dictionary.tabs?.general || 'Leave request', dictionary.tabs?.approval || 'Balance and approval']}
        >
          <Controller
            name='staff_id'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                fullWidth
                required
                label={dictionary.fields.staff}
                value={field.value || ''}
                disabled={isSubmitting || !canManage}
                error={Boolean(errors.staff_id)}
                helperText={errors.staff_id?.message}
              >
                {staffOptions.map(staff => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.full_name} <>&mdash;</> {staff.position}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='leave_type_id'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                onChange={event => {
                  field.onChange(event)
                  const selected = leaveTypes.find(type => type.id === event.target.value)

                  setValue('is_paid', selected?.is_paid_leave ?? false, { shouldDirty: true, shouldValidate: true })
                }}
                select
                fullWidth
                required
                label={dictionary.fields.leaveType}
                value={field.value || ''}
                disabled={isSubmitting}
                error={Boolean(errors.leave_type_id)}
                helperText={errors.leave_type_id?.message}
              >
                {leaveTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='duration_type'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                fullWidth
                label='Duration Type'
                value={field.value || 'FULL_DAY'}
                disabled={isSubmitting}
                onChange={event => {
                  field.onChange(event.target.value)
                  if (event.target.value === 'FULL_DAY') setValue('half_day_shift', '')
                }}
              >
                <MenuItem value='FULL_DAY'>Full Day(s)</MenuItem>
                <MenuItem value='HALF_DAY'>Half Day</MenuItem>
              </CustomTextField>
            )}
          />
          <div className='grid grid-cols-1 items-end gap-5 sm:grid-cols-2'>
            <div className='self-end'>
              <NativeDateTimeInput
                fullWidth
                required
                locale={locale}
                label={dictionary.fields.startDate}
                disabled={isSubmitting}
                error={Boolean(errors.start_date)}
                helperText={errors.start_date?.message}
                {...register('start_date')}
              />
            </div>
            {!isHalfDay && (
              <NativeDateTimeInput
                fullWidth
                required
                locale={locale}
                label={dictionary.fields.endDate}
                disabled={isSubmitting}
                error={Boolean(errors.end_date) || calculatedDays < 0.5}
                helperText={
                  errors.end_date?.message || (calculatedDays < 0.5 ? dictionary.validation.dateRangeInvalid : '')
                }
                {...register('end_date')}
              />
            )}
            {isHalfDay && (
              <Controller
                name='half_day_shift'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    required
                    label='Half-Day Shift'
                    value={field.value || ''}
                    disabled={isSubmitting}
                    error={Boolean(errors.half_day_shift)}
                    helperText={errors.half_day_shift?.message}
                  >
                    <MenuItem value='MORNING'>Morning</MenuItem>
                    <MenuItem value='AFTERNOON'>Afternoon</MenuItem>
                  </CustomTextField>
                )}
              />
            )}
          </div>
          <div className='flex items-center justify-between rounded border border-primary/20 bg-primaryLighter p-4'>
            <Typography color='text.secondary'>Net Working Days (Fridays and public holidays excluded)</Typography>
            <Typography variant='h5' color={calculatedDays > 0 ? 'primary.main' : 'error.main'}>
              {Math.max(0, calculatedDays)}
            </Typography>
          </div>
          {errors.total_days?.message && (
            <Typography color='error.main' variant='body2'>
              {errors.total_days.message}
            </Typography>
          )}
          {balance && (
            <div className='rounded border border-divider p-4'>
              <Typography variant='subtitle2'>Leave balance</Typography>
              <Typography color='text.secondary'>
                {balance.allowed == null
                  ? 'Yearly allowance is not configured for this leave type.'
                  : isPaid
                    ? `Allowed: ${balance.allowed} / Taken: ${balance.taken} / Pending: ${balance.pending} → ${projectedPending} / Remaining: ${balance.remaining} → ${projectedRemaining} days`
                    : `Allowed: ${balance.allowed} / Taken: ${balance.taken} / Pending: ${balance.pending} / Remaining: ${balance.remaining}`}
              </Typography>
              {!isPaid && (
                <Typography
                  className='mt-2 inline-flex rounded bg-secondaryLighter px-2 py-1'
                  color='warning.dark'
                  variant='body2'
                >
                  Unpaid Leave (Does not deduct from {balance.allowed ?? 0} annual days)
                </Typography>
              )}
            </div>
          )}
          {hasInsufficientPaidBalance && (
            <Alert severity='warning'>
              Requested days ({calculatedDays}) exceed available balance ({balance.remaining}).
            </Alert>
          )}
          <Controller
            name='is_paid'
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch checked={Boolean(field.value)} onChange={event => field.onChange(event.target.checked)} />
                }
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
                <CustomTextField
                  {...field}
                  select
                  fullWidth
                  label={dictionary.fields.initialStatus}
                  value={field.value || ''}
                  disabled={isSubmitting}
                >
                  {options.statuses
                    .filter(status => ['PENDING', 'APPROVED'].includes(status.value))
                    .map(status => (
                      <MenuItem key={status.id} value={status.id}>
                        {formatStatusLabel(status.value, dictionary.status[status.value] || status.label)}
                      </MenuItem>
                    ))}
                </CustomTextField>
              )}
            />
          )}
          <CustomTextField
            fullWidth
            multiline
            minRows={4}
            label={dictionary.fields.reason}
            disabled={isSubmitting}
            error={Boolean(errors.reason)}
            helperText={errors.reason?.message}
            {...register('reason')}
          />
        </FormSectionCards>
        <div className='form-surface-actions -mx-6 -mb-6 mt-auto flex justify-end gap-3 p-4'>
          <Button type='button' variant='tonal' color='secondary' onClick={closeDrawer} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={isSubmitting || calculatedDays < 0.5 || hasInsufficientPaidBalance}
          >
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {leave ? dictionary.actions.saveChanges : dictionary.actions.submit}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default StaffLeaveDrawer

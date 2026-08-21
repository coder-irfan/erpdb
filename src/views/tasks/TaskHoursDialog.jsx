'use client'

import { useEffect } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { logTaskHours } from '@/actions/tasks'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { logTaskHoursSchema } from '@/schemas/tasks'

const TaskHoursDialog = ({ open, task, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: valibotResolver(logTaskHoursSchema(dictionary.validation)), defaultValues: { hours: '' } })

  useEffect(() => {
    if (open) reset({ hours: '' })
  }, [open, reset])

  const submit = async values => {
    const result = await logTaskHours(task.id, { ...values, locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)
    toast.success(result.message)
    onClose()
    await onSaved()
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth='xs'>
      <DialogTitle className='flex items-start justify-between gap-3'>
        <div>
          <Typography variant='h5'>{dictionary.hours.title}</Typography>
          <Typography color='text.secondary'>{task?.title}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className='flex flex-col gap-4'>
        <Typography color='text.secondary'>{dictionary.hours.description}</Typography>
        <Typography variant='body2'>{dictionary.hours.current.replace('{hours}', task?.actual_hours || 0)}</Typography>
        <Controller
          name='hours'
          control={control}
          render={({ field }) => (
            <CustomTextField
              {...field}
              autoFocus
              type='number'
              label={dictionary.fields.hoursToAdd}
              error={Boolean(errors.hours)}
              helperText={errors.hours?.message}
              inputProps={{ min: 0.01, step: '0.25' }}
            />
          )}
        />
      </DialogContent>
      <DialogActions className='p-5'>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
          {dictionary.actions.cancel}
        </Button>
        <Button variant='contained' onClick={handleSubmit(submit)} disabled={isSubmitting}>
          <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
            {dictionary.actions.log}
          </LoadingButtonContent>
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TaskHoursDialog

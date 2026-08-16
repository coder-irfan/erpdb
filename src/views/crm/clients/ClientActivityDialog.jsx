'use client'

import { useEffect } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createActivitySchema } from '@/schemas/crm/leads'

const TYPES = ['CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP']
const EMPTY = { activity_type: 'CALL', title: '', description: '', due_date: '', is_completed: false }

const ClientActivityDialog = ({ open, client, locale, dictionary, onClose, onSaved }) => {
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: valibotResolver(createActivitySchema(dictionary.validation)), defaultValues: EMPTY })

  useEffect(() => { if (open) reset(EMPTY) }, [open, reset])

  if (!client) return null

  const submit = async values => {
    try {
      const response = await fetch(`/api/crm/clients/${client.id}/activities?locale=${locale}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      onClose()
      await onSaved()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth='sm'>
      <DialogTitle component='div'><Typography variant='h5' component='span'>{dictionary.activity.addTitle}</Typography><Typography variant='body2' color='text.secondary'>{client.company_name}</Typography></DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent dividers className='flex flex-col gap-4'>
          <Controller name='activity_type' control={control} render={({ field }) => <CustomTextField {...field} select value={field.value || 'CALL'} label={dictionary.activity.type} error={Boolean(errors.activity_type)} helperText={errors.activity_type?.message}>{TYPES.map(type => <MenuItem key={type} value={type}>{dictionary.activity.types[type]}</MenuItem>)}</CustomTextField>} />
          <Controller name='title' control={control} render={({ field }) => <CustomTextField {...field} value={field.value || ''} label={dictionary.activity.subject} error={Boolean(errors.title)} helperText={errors.title?.message} />} />
          <Controller name='description' control={control} render={({ field }) => <CustomTextField {...field} value={field.value || ''} multiline minRows={4} label={dictionary.activity.description} error={Boolean(errors.description)} helperText={errors.description?.message} />} />
          <Controller name='due_date' control={control} render={({ field }) => <CustomTextField {...field} value={field.value || ''} type='datetime-local' label={dictionary.activity.dueDate} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.due_date)} helperText={errors.due_date?.message} />} />
        </DialogContent>
        <DialogActions className='p-5'><Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>{dictionary.actions.cancel}</Button><Button type='submit' variant='contained' disabled={isSubmitting}><LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>{dictionary.activity.add}</LoadingButtonContent></Button></DialogActions>
      </form>
    </Dialog>
  )
}

export default ClientActivityDialog

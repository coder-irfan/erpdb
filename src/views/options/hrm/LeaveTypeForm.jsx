'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createOption, updateOption } from '@/actions/options'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createOptionSchema } from '@/schemas/options'

const DEFAULT_VALUES = { name: '', category: 'LEAVE_TYPE', description: '', is_active: true }

const LeaveTypeForm = ({ open, option, locale, dictionary, onClose, onSaved }) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: valibotResolver(createOptionSchema(dictionary.validation)), defaultValues: DEFAULT_VALUES })

  useEffect(() => {
    if (!open) return

    reset(
      option
        ? {
            name: option.name || '',
            category: 'LEAVE_TYPE',
            description: option.description || '',
            is_active: option.is_active
          }
        : DEFAULT_VALUES
    )
  }, [open, option, reset])

  const closeForm = () => {
    if (!isSubmitting) onClose()
  }

  const submitForm = async values => {
    try {
      const payload = { ...values, category: 'LEAVE_TYPE', locale }
      const result = option ? await updateOption(option.id, payload) : await createOption(payload)

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      await onSaved()
      onClose()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  return (
    <Dialog open={open} onClose={closeForm} fullWidth maxWidth='sm'>
      <form onSubmit={handleSubmit(submitForm)} noValidate>
        <input type='hidden' {...register('category')} />
        <DialogTitle>{option ? dictionary.leaveTypes.editTitle : dictionary.leaveTypes.addTitle}</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-5'>
          <CustomTextField
            fullWidth
            label={dictionary.leaveTypes.fields.name}
            placeholder={dictionary.leaveTypes.fields.namePlaceholder}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />
          <CustomTextField
            fullWidth
            multiline
            minRows={4}
            label={dictionary.leaveTypes.fields.description}
            placeholder={dictionary.leaveTypes.fields.descriptionPlaceholder}
            error={Boolean(errors.description)}
            helperText={errors.description?.message}
            disabled={isSubmitting}
            {...register('description')}
          />
          <Controller
            name='is_active'
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    color={field.value ? 'primary' : 'secondary'}
                    checked={field.value}
                    onChange={event => field.onChange(event.target.checked)}
                  />
                }
                label={field.value ? dictionary.common.active : dictionary.common.inactive}
                disabled={isSubmitting}
              />
            )}
          />
        </DialogContent>
        <DialogActions className='p-5'>
          <Button variant='tonal' color='secondary' onClick={closeForm} disabled={isSubmitting}>
            {dictionary.common.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.common.saving}>
              {option ? dictionary.common.saveChanges : dictionary.common.create}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default LeaveTypeForm

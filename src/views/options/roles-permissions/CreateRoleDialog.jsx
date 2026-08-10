'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createRoleSchema } from '@/utils/validation/roleSchemas'

import PermissionMatrix from './PermissionMatrix'

const DEFAULT_VALUES = { name: '', displayName: '', description: '', permissionIds: [] }

const CreateRoleDialog = ({ open, groups, onClose, onSubmit, translations }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createRoleSchema(translations.validation)),
    defaultValues: DEFAULT_VALUES
  })

  const permissionIds = watch('permissionIds')

  useEffect(() => {
    if (!open) reset(DEFAULT_VALUES)
  }, [open, reset])

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  const submitForm = async values => {
    const succeeded = await onSubmit(values)

    if (succeeded) {
      reset(DEFAULT_VALUES)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <span>
          <Typography variant='h5' component='span'>
            {translations.createRoleForm.title}
          </Typography>
          <Typography component='span' className='mt-1 block' color='text.secondary'>
            {translations.createRoleForm.description}
          </Typography>
        </span>
        <IconButton onClick={handleClose} disabled={isSubmitting} aria-label={translations.close}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(submitForm)} noValidate>
        <DialogContent dividers className='flex flex-col gap-6'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <CustomTextField
              fullWidth
              label={translations.createRoleForm.name}
              placeholder={translations.createRoleForm.namePlaceholder}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              disabled={isSubmitting}
              {...register('name')}
            />
            <CustomTextField
              fullWidth
              label={translations.createRoleForm.displayName}
              placeholder={translations.createRoleForm.displayNamePlaceholder}
              error={Boolean(errors.displayName)}
              helperText={errors.displayName?.message}
              disabled={isSubmitting}
              {...register('displayName')}
            />
          </div>
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={translations.createRoleForm.descriptionLabel}
            placeholder={translations.createRoleForm.descriptionPlaceholder}
            error={Boolean(errors.description)}
            helperText={errors.description?.message}
            disabled={isSubmitting}
            {...register('description')}
          />
          <PermissionMatrix
            groups={groups}
            selectedPermissionIds={permissionIds}
            onChange={ids => setValue('permissionIds', ids, { shouldValidate: true, shouldDirty: true })}
            translations={translations}
            disabled={isSubmitting}
          />
        </DialogContent>
        <DialogActions className='p-6'>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={isSubmitting}>
            {translations.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={translations.createRoleForm.submitting}>
              {translations.createRoleForm.submit}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default CreateRoleDialog

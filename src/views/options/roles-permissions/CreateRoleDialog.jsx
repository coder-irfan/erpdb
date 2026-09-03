'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
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
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : handleClose}
      slotProps={{ paper: { className: 'is-full sm:is-[680px] lg:is-[760px]' } }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-6'>
        <div>
          <Typography variant='h5' component='span'>
            {translations.createRoleForm.title}
          </Typography>
          <Typography component='span' className='mt-1 block' color='text.secondary'>
            {translations.createRoleForm.description}
          </Typography>
        </div>
        <IconButton onClick={handleClose} disabled={isSubmitting} aria-label={translations.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
      <form className='flex min-bs-0 flex-1 flex-col' onSubmit={handleSubmit(submitForm)} noValidate>
        <div className='form-surface-scroll flex flex-1 flex-col gap-6 p-6'>
          <FormSectionCards labels={[translations.createRoleForm.title, translations.permissions || 'Permissions']}>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <CustomTextField
              fullWidth
              label={translations.createRoleForm.name}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              disabled={isSubmitting}
              {...register('name')}
            />
            <CustomTextField
              fullWidth
              label={translations.createRoleForm.displayName}
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
          </FormSectionCards>
        </div>
        <Divider />
        <div className='form-surface-actions flex justify-end gap-3 px-6 py-3'>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={isSubmitting}>
            {translations.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={translations.createRoleForm.submitting}>
              {translations.createRoleForm.submit}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default CreateRoleDialog

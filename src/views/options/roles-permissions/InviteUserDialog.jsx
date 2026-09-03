'use client'

import { useEffect } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createInviteUserSchema } from '@/utils/validation/roleSchemas'

const DEFAULT_VALUES = { name: '', email: '', roleId: '', staffId: '' }

const InviteUserDialog = ({ open, roles, staff, onClose, onSubmit, translations }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createInviteUserSchema(translations.validation)),
    defaultValues: DEFAULT_VALUES
  })

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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <span>
          <Typography variant='h5' component='span'>
            {translations.inviteForm.title}
          </Typography>
          <Typography component='span' className='mt-1 block' color='text.secondary'>
            {translations.inviteForm.description}
          </Typography>
        </span>
        <IconButton onClick={handleClose} disabled={isSubmitting} aria-label={translations.close}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(submitForm)} noValidate>
        <DialogContent dividers className='flex flex-col gap-5'>
          <CustomTextField
            fullWidth
            label={translations.inviteForm.fullName}
            autoComplete='name'
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />
          <CustomTextField
            fullWidth
            type='email'
            label={translations.inviteForm.email}
            autoComplete='email'
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />
          <CustomTextField
            fullWidth
            select
            label={translations.inviteForm.role}
            defaultValue=''
            error={Boolean(errors.roleId)}
            helperText={errors.roleId?.message}
            disabled={isSubmitting}
            {...register('roleId')}
          >
            {roles.map(role => (
              <MenuItem key={role.id} value={role.id}>
                {role.displayName}
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            fullWidth
            select
            label={translations.inviteForm.employee}
            defaultValue=''
            error={Boolean(errors.staffId)}
            helperText={errors.staffId?.message}
            disabled={isSubmitting}
            {...register('staffId', { setValueAs: value => value || null })}
          >
            <MenuItem value=''>{staff.length > 0 ? '' : translations.inviteForm.noStaffAvailable}</MenuItem>
            {staff.map(employee => (
              <MenuItem key={employee.id} value={employee.id}>
                {`${employee.name} — ${employee.position}`}
              </MenuItem>
            ))}
          </CustomTextField>
        </DialogContent>
        <DialogActions className='p-6'>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={isSubmitting}>
            {translations.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={translations.inviteForm.submitting}>
              {translations.inviteForm.submit}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default InviteUserDialog

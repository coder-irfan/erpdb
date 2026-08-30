'use client'

import { useEffect } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import { createClientSchema } from '@/schemas/crm/clients'

const EMPTY = {
  company_name: '',
  primary_contact_name: '',
  email: '',
  phone: '',
  address: '',
  tax_number: '',
  account_manager_id: '',
  status: 'ACTIVE',
  notes: ''
}

const ClientFormDrawer = ({ open, client, staff, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: valibotResolver(createClientSchema(dictionary.validation)), defaultValues: EMPTY })

  useEffect(() => {
    reset(
      client
        ? {
            company_name: client.company_name || '',
            primary_contact_name: client.primary_contact_name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            tax_number: client.tax_id || '',
            account_manager_id: client.account_manager_id || '',
            status: client.status || 'ACTIVE',
            notes: client.notes || ''
          }
        : EMPTY
    )
  }, [client, open, reset])

  const submit = async values => {
    try {
      const endpoint = client ? `/api/crm/clients/${client.id}?locale=${locale}` : `/api/crm/clients?locale=${locale}`

      const response = await fetch(endpoint, {
        method: client ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      onClose()
      await onSaved()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  const field = (name, label, props = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field: controllerField }) => (
        <CustomTextField
          {...controllerField}
          {...props}
          value={controllerField.value ?? ''}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message}
        />
      )}
    />
  )

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[600px]' }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{client ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form onSubmit={handleSubmit(submit)} className='form-surface-scroll flex flex-1 flex-col gap-5 p-5' noValidate>
        <FormSectionCards labels={[dictionary.tabs?.general || 'Client information', dictionary.tabs?.relationship || 'Relationship management']}>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {field('company_name', dictionary.fields.company)}
          {field('primary_contact_name', dictionary.fields.contact)}
          {field('email', dictionary.fields.email, { type: 'email' })}
          {field('phone', dictionary.fields.phone)}
          {field('tax_number', dictionary.fields.tax)}
          <Controller
            name='account_manager_id'
            control={control}
            render={({ field: controllerField }) => (
              <CustomTextField
                {...controllerField}
                select
                value={controllerField.value || ''}
                label={dictionary.fields.manager}
                error={Boolean(errors.account_manager_id)}
                helperText={errors.account_manager_id?.message}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected =>
                      staff.find(item => item.id === selected)?.full_name || dictionary.placeholders.manager
                  }
                }}
              >
                <MenuItem value=''>{dictionary.placeholders.manager}</MenuItem>
                {staff.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.full_name} — {item.position}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='status'
            control={control}
            render={({ field: controllerField }) => (
              <CustomTextField
                {...controllerField}
                select
                value={controllerField.value || 'ACTIVE'}
                label={dictionary.fields.status}
                error={Boolean(errors.status)}
                helperText={errors.status?.message}
              >
                <MenuItem value='ACTIVE'>{dictionary.status.ACTIVE}</MenuItem>
                <MenuItem value='INACTIVE'>{dictionary.status.INACTIVE}</MenuItem>
              </CustomTextField>
            )}
          />
        </div>
        {field('address', dictionary.fields.address, { multiline: true, minRows: 3 })}
        {field('notes', dictionary.fields.notes, { multiline: true, minRows: 3 })}
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 p-5'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {client ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default ClientFormDrawer

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
import { createLeadSchema } from '@/schemas/crm/leads'

const EMPTY_FORM = {
  title: '',
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  source_id: '',
  status_id: '',
  assigned_to_id: '',
  estimated_value: 0,
  currency: 'AFN',
  next_follow_up_date: '',
  notes: ''
}

const getDefaults = (lead, options, baseCurrency) =>
  lead
    ? {
        ...EMPTY_FORM,
        ...lead,
        estimated_value: Number(lead.estimated_value || 0),
        source_id: lead.source_id || '',
        status_id: lead.status_id || '',
        assigned_to_id: lead.assigned_to_id || '',
        next_follow_up_date: lead.next_follow_up_date?.slice(0, 16) || ''
      }
    : { ...EMPTY_FORM, currency: baseCurrency, status_id: options.statuses[0]?.id || '' }

const LeadDrawer = ({ open, lead, options, baseCurrency, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createLeadSchema(dictionary.validation)),
    defaultValues: getDefaults(lead, options, baseCurrency)
  })

  useEffect(() => {
    if (open) reset(getDefaults(lead, options, baseCurrency))
  }, [baseCurrency, lead, open, options, reset])

  const submit = async values => {
    try {
      const response = await fetch(
        lead ? `/api/crm/leads/${lead.id}?locale=${locale}` : `/api/crm/leads?locale=${locale}`,
        {
          method: lead ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)
      toast.success(result.message)
      await onSaved()
      onClose()
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
      PaperProps={{ className: 'is-full sm:is-[560px]' }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{lead ? dictionary.drawer.editTitle : dictionary.drawer.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form onSubmit={handleSubmit(submit)} className='form-surface-scroll flex flex-1 flex-col gap-5 px-5' noValidate>
        <FormSectionCards
          labels={[
            dictionary.tabs?.general || 'Lead information',
            dictionary.tabs?.pipeline || 'Pipeline and ownership'
          ]}
        >
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {field('title', dictionary.fields.title)}
            {field('company_name', dictionary.fields.company)}
            {field('contact_name', dictionary.fields.contact)}
            {field('email', dictionary.fields.email, { type: 'email' })}
            {field('phone', dictionary.fields.phone)}
            <Controller
              name='estimated_value'
              control={control}
              render={({ field: controllerField }) => (
                <CustomTextField
                  {...controllerField}
                  type='number'
                  value={controllerField.value ?? 0}
                  label={dictionary.fields.value}
                  inputProps={{ min: 0, step: '0.01' }}
                  error={Boolean(errors.estimated_value)}
                  helperText={errors.estimated_value?.message}
                  onChange={event =>
                    controllerField.onChange(event.target.value === '' ? 0 : Number(event.target.value))
                  }
                />
              )}
            />
            <Controller
              name='currency'
              control={control}
              render={({ field: controllerField }) => (
                <CustomTextField
                  {...controllerField}
                  select
                  value={controllerField.value || baseCurrency}
                  label={dictionary.fields.currency}
                  error={Boolean(errors.currency)}
                  helperText={errors.currency?.message}
                >
                  <MenuItem value='AFN'>AFN</MenuItem>
                  <MenuItem value='USD'>USD</MenuItem>
                </CustomTextField>
              )}
            />
            <Controller
              name='source_id'
              control={control}
              render={({ field: controllerField }) => (
                <CustomTextField
                  {...controllerField}
                  select
                  value={controllerField.value || ''}
                  label={dictionary.fields.source}
                  error={Boolean(errors.source_id)}
                  helperText={errors.source_id?.message}
                >
                  <MenuItem value='' disabled>
                    {dictionary.placeholders.source}
                  </MenuItem>
                  {options.sources.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            <Controller
              name='status_id'
              control={control}
              render={({ field: controllerField }) => (
                <CustomTextField
                  {...controllerField}
                  select
                  value={controllerField.value || ''}
                  label={dictionary.fields.status}
                  error={Boolean(errors.status_id)}
                  helperText={errors.status_id?.message}
                >
                  <MenuItem value='' disabled>
                    {dictionary.placeholders.status}
                  </MenuItem>
                  {options.statuses.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            <Controller
              name='assigned_to_id'
              control={control}
              render={({ field: controllerField }) => (
                <CustomTextField
                  {...controllerField}
                  select
                  value={controllerField.value || ''}
                  label={dictionary.fields.assigned}
                  error={Boolean(errors.assigned_to_id)}
                  helperText={errors.assigned_to_id?.message}
                >
                  <MenuItem value=''>{dictionary.placeholders.unassigned}</MenuItem>
                  {options.staff.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.full_name}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            {field('next_follow_up_date', dictionary.fields.followUp, {
              type: 'datetime-local',
              slotProps: { inputLabel: { shrink: true } }
            })}
          </div>
          {field('notes', dictionary.fields.notes, { multiline: true, minRows: 4 })}
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 pt-5'>
          <Button variant='tonal' color='secondary' disabled={isSubmitting} onClick={onClose}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {lead ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default LeadDrawer

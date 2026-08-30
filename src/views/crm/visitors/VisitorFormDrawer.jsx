'use client'

import { useEffect, useState } from 'react'

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
import { createVisitorSchema } from '@/schemas/crm/visitors'

const EMPTY_VALUES = {
  full_name: '',
  phone: '',
  email: '',
  company_name: '',
  purpose: '',
  host_staff_id: '',
  notes: ''
}

const VisitorFormDrawer = ({ open, visitor, staff, locale, dictionary, onClose, onSaved }) => {
  const [purposes, setPurposes] = useState([])
  const [purposesLoading, setPurposesLoading] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createVisitorSchema(dictionary.validation)),
    defaultValues: EMPTY_VALUES
  })

  useEffect(() => {
    if (!open) return

    reset(
      visitor
        ? {
            full_name: visitor.full_name || '',
            phone: visitor.phone || '',
            email: visitor.email || '',
            company_name: visitor.company_name || '',
            purpose: visitor.purpose || '',
            host_staff_id: visitor.host_staff_id || '',
            notes: visitor.notes || ''
          }
        : EMPTY_VALUES
    )
  }, [open, reset, visitor])

  useEffect(() => {
    if (!open) return
    let active = true

    const loadPurposes = async () => {
      setPurposesLoading(true)

      try {
        const response = await fetch('/api/options/crm/visitors', { cache: 'no-store' })
        const result = await response.json()

        if (!active) return
        if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.loadFailed)
        setPurposes(result.data.options)
      } catch {
        if (active) toast.error(dictionary.messages.loadFailed)
      } finally {
        if (active) setPurposesLoading(false)
      }
    }

    loadPurposes()

    return () => {
      active = false
    }
  }, [dictionary.messages.loadFailed, open])

  const submit = async values => {
    try {
      const endpoint = visitor
        ? `/api/crm/visitors/${visitor.id}?locale=${locale}`
        : `/api/crm/visitors?locale=${locale}`

      const response = await fetch(endpoint, {
        method: visitor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.messages.operationFailed)

        return
      }

      toast.success(result.message)
      onClose()
      await onSaved()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  const closeDrawer = () => {
    if (!isSubmitting) onClose()
  }

  const purposeOptions =
    visitor?.purpose && !purposes.some(option => option.value === visitor.purpose)
      ? [{ id: `current-${visitor.id}`, label: dictionary.purposes[visitor.purpose] || visitor.purpose, value: visitor.purpose }, ...purposes]
      : purposes

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={closeDrawer}
      transitionDuration={300}
      slotProps={{ paper: { className: 'is-full sm:is-[580px]' } }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{visitor ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={closeDrawer} disabled={isSubmitting} aria-label={dictionary.actions.cancel}>
          <i className='tabler-x' />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit(submit)} className='flex min-bs-0 flex-1 flex-col' noValidate>
        <div className='form-surface-scroll p-5'>
          <FormSectionCards labels={[dictionary.tabs?.general || 'Visitor information', dictionary.tabs?.visit || 'Visit details']}>
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            <Controller
              name='full_name'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  value={field.value || ''}
                  label={dictionary.fields.name}
                  error={Boolean(errors.full_name)}
                  helperText={errors.full_name?.message}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name='phone'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  value={field.value || ''}
                  label={dictionary.fields.phone}
                  error={Boolean(errors.phone)}
                  helperText={errors.phone?.message}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  value={field.value || ''}
                  type='email'
                  label={dictionary.fields.email}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message || dictionary.form.emailHelp}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name='company_name'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  value={field.value || ''}
                  label={dictionary.fields.company}
                  error={Boolean(errors.company_name)}
                  helperText={errors.company_name?.message}
                  disabled={isSubmitting}
                />
              )}
            />
            <Controller
              name='purpose'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  select
                  value={field.value || ''}
                  label={dictionary.fields.purpose}
                  error={Boolean(errors.purpose)}
                  helperText={errors.purpose?.message}
                  disabled={isSubmitting || purposesLoading}
                  slotProps={{
                    select: {
                      displayEmpty: true,
                      renderValue: selected =>
                        selected
                          ? purposeOptions.find(option => option.value === selected)?.label || selected
                          : dictionary.placeholders.purpose
                    }
                  }}
                >
                  <MenuItem value='' disabled>
                    {dictionary.placeholders.purpose}
                  </MenuItem>
                  {purposeOptions.map(option => (
                    <MenuItem key={option.id} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            <Controller
              name='host_staff_id'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  select
                  value={field.value || ''}
                  label={dictionary.fields.host}
                  error={Boolean(errors.host_staff_id)}
                  helperText={errors.host_staff_id?.message}
                  disabled={isSubmitting}
                  slotProps={{
                    select: {
                      displayEmpty: true,
                      renderValue: selected =>
                        staff.find(item => item.id === selected)?.full_name || dictionary.placeholders.host
                    }
                  }}
                >
                  <MenuItem value='' disabled>
                    {dictionary.placeholders.host}
                  </MenuItem>
                  {staff.map(item => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.full_name} — {item.position}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            <Controller
              name='notes'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  value={field.value || ''}
                  multiline
                  minRows={4}
                  label={dictionary.fields.notes}
                  className='sm:col-span-2'
                  error={Boolean(errors.notes)}
                  helperText={errors.notes?.message}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          </FormSectionCards>
        </div>

        <div className='form-surface-actions flex justify-end gap-3 p-5'>
          <Button variant='tonal' color='secondary' disabled={isSubmitting} onClick={closeDrawer}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {visitor ? dictionary.actions.save : dictionary.actions.checkin}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default VisitorFormDrawer

'use client'

import { useEffect, useMemo } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createContract, updateContract } from '@/actions/contracts'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createContractSchema } from '@/schemas/contracts'
import { calculateContractEndDate, toDateInputValue } from '@/utils/contractDuration'

const getDefaultStatus = statuses => statuses.find(option => option.is_default)?.id || statuses.find(option => option.value === 'DRAFT')?.id || statuses[0]?.id || ''

const getEmptyValues = formOptions => ({
  client_id: '',
  title: '',
  contract_type_id: '',
  contract_duration: '',
  total_amount: '',
  currency: formOptions.baseCurrency || 'AFN',
  exchange_rate: String(formOptions.exchangeRate || '65'),
  start_date: toDateInputValue(new Date()),
  status_id: getDefaultStatus(formOptions.options.CONTRACT_STATUS || []),
  country_id: formOptions.options.CONTRACT_COUNTRY?.find(option => option.is_default)?.id || '',
  level_id: formOptions.options.CONTRACT_LEVEL?.find(option => option.is_default)?.id || '',
  account_manager_id: '',
  auto_renew: false
})

const ContractFormDrawer = ({ open, contract, formOptions, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createContractSchema(dictionary.validation)),
    defaultValues: getEmptyValues(formOptions)
  })

  const startDate = useWatch({ control, name: 'start_date' })
  const durationId = useWatch({ control, name: 'contract_duration' })
  const durations = formOptions.options.CONTRACT_DURATION || []
  const selectedDuration = durations.find(option => option.id === durationId)

  const endDate = useMemo(
    () => toDateInputValue(calculateContractEndDate(startDate, selectedDuration)),
    [selectedDuration, startDate]
  )

  useEffect(() => {
    if (!open) return

    reset(
      contract
        ? {
            client_id: contract.client_id || '',
            title: contract.title || '',
            contract_type_id: contract.contract_type_id || '',
            contract_duration: contract.contract_duration || '',
            total_amount: String(contract.total_amount || ''),
            currency: contract.currency || formOptions.baseCurrency || 'AFN',
            exchange_rate: String(contract.exchange_rate || formOptions.exchangeRate || '65'),
            start_date: toDateInputValue(contract.start_date),
            status_id: contract.status_id || getDefaultStatus(formOptions.options.CONTRACT_STATUS || []),
            country_id: contract.country_id || '',
            level_id: contract.level_id || '',
            account_manager_id: contract.account_manager_id || '',
            auto_renew: Boolean(contract.auto_renew)
          }
        : getEmptyValues(formOptions)
    )
  }, [contract, formOptions, open, reset])

  const submit = async values => {
    const result = contract
      ? await updateContract(contract.id, { ...values, locale })
      : await createContract({ ...values, locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)

    toast.success(result.message)
    onClose()
    await onSaved()
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

  const selectField = (name, label, options, placeholder) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <CustomTextField
          {...field}
          select
          value={field.value || ''}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message}
          slotProps={{
            select: {
              displayEmpty: true,
              renderValue: selected => options.find(option => option.id === selected)?.label || placeholder
            }
          }}
        >
          <MenuItem value=''>{placeholder}</MenuItem>
          {options.map(option => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
        </CustomTextField>
      )}
    />
  )

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[680px]' }}
    >
      <div className='flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{contract ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}><i className='tabler-x' /></IconButton>
      </div>
      <form onSubmit={handleSubmit(submit)} className='flex flex-1 flex-col gap-5 overflow-y-auto p-5' noValidate>
        <Controller
          name='client_id'
          control={control}
          render={({ field }) => (
            <Autocomplete
              options={formOptions.clients}
              value={formOptions.clients.find(client => client.id === field.value) || null}
              onChange={(_, value) => field.onChange(value?.id || '')}
              getOptionLabel={option => option.company_name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <div>
                    <Typography variant='body2'>{option.company_name}</Typography>
                    <Typography variant='caption' color='text.secondary'>{option.primary_contact_name} · {option.email}</Typography>
                  </div>
                </li>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label={dictionary.fields.client}
                  placeholder={dictionary.placeholders.client}
                  error={Boolean(errors.client_id)}
                  helperText={errors.client_id?.message}
                />
              )}
            />
          )}
        />
        {field('title', dictionary.fields.title)}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {selectField('contract_type_id', dictionary.fields.serviceType, formOptions.options.CONTRACT_TYPE || [], dictionary.placeholders.serviceType)}
          {selectField('contract_duration', dictionary.fields.duration, durations, dictionary.placeholders.duration)}
          {field('start_date', dictionary.fields.startDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
          <CustomTextField
            label={dictionary.fields.endDate}
            type='date'
            value={endDate}
            disabled
            helperText={selectedDuration ? dictionary.form.endDateHelp : dictionary.form.selectDurationHelp}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          {field('total_amount', dictionary.fields.amount, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
          <Controller
            name='currency'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} select value={field.value || formOptions.baseCurrency || 'AFN'} label={dictionary.fields.currency} error={Boolean(errors.currency)} helperText={errors.currency?.message}>
                <MenuItem value='AFN'>AFN</MenuItem>
                <MenuItem value='USD'>USD</MenuItem>
              </CustomTextField>
            )}
          />
          {field('exchange_rate', dictionary.fields.exchangeRate, { type: 'number', inputProps: { min: 0, step: '0.0001' } })}
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {selectField('status_id', dictionary.fields.status, formOptions.options.CONTRACT_STATUS || [], dictionary.placeholders.status)}
          <Controller
            name='account_manager_id'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={formOptions.staff}
                value={formOptions.staff.find(person => person.id === field.value) || null}
                onChange={(_, value) => field.onChange(value?.id || '')}
                getOptionLabel={option => option.full_name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => <CustomTextField {...params} label={dictionary.fields.manager} placeholder={dictionary.placeholders.manager} error={Boolean(errors.account_manager_id)} helperText={errors.account_manager_id?.message} />}
              />
            )}
          />
          {selectField('country_id', dictionary.fields.country, formOptions.options.CONTRACT_COUNTRY || [], dictionary.placeholders.country)}
          {selectField('level_id', dictionary.fields.level, formOptions.options.CONTRACT_LEVEL || [], dictionary.placeholders.level)}
        </div>
        <Controller
          name='auto_renew'
          control={control}
          render={({ field }) => (
            <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={event => field.onChange(event.target.checked)} />} label={dictionary.fields.autoRenew} />
          )}
        />
        <div className='mt-auto flex justify-end gap-3 pt-4'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' disabled={isSubmitting || !endDate}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {contract ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default ContractFormDrawer

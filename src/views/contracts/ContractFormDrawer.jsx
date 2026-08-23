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
import { createStaffContract, updateStaffContract } from '@/actions/hrm/contracts'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { CONTRACT_TYPE_DOMAINS, getContractTypeDomain } from '@/data/contractTypes'
import { createContractSchema } from '@/schemas/contracts'
import { createStaffContractSchema } from '@/schemas/hrm/contracts'
import { calculateContractEndDate, toDateInputValue } from '@/utils/contractDuration'

const TARGETS = ['HRM', 'CUSTOMER', 'FINANCE', 'OTHERS']

const getDefaultStatus = statuses =>
  statuses.find(option => option.is_default)?.id ||
  statuses.find(option => option.value === 'DRAFT')?.id ||
  statuses[0]?.id ||
  ''

const getEmptyValues = (formOptions, defaultTarget = 'CUSTOMER') => ({
  target_category: defaultTarget,
  client_id: '',
  lead_id: '',
  staff_id: '',
  title: '',
  contract_type_id: '',
  template_id: '',
  contract_duration: '',
  position_title: '',
  base_salary: '',
  total_amount: '',
  currency: formOptions.baseCurrency || 'AFN',
  exchange_rate: String(formOptions.exchangeRate || '65'),
  start_date: toDateInputValue(new Date()),
  end_date: '',
  status_id: getDefaultStatus(formOptions.options.CONTRACT_STATUS || []),
  country_id: '',
  level_id: '',
  account_manager_id: '',
  auto_renew: false,
  invoice_id: '',
  installment_schedule: ''
})

const ContractFormDrawer = ({
  open,
  contract,
  formOptions,
  locale,
  dictionary,
  defaultTarget = 'CUSTOMER',
  onClose,
  onSaved
}) => {
  const statusOptions = useMemo(() => {
    const configured = formOptions.options.CONTRACT_STATUS || []

    if (!contract?.status || configured.some(option => option.id === contract.status.id)) return configured

    return [...configured, contract.status]
  }, [contract?.status, formOptions.options.CONTRACT_STATUS])

  const resolver = useMemo(
    () => async (values, context, options) => {
      const schema =
        values.target_category === 'HRM'
          ? createStaffContractSchema(dictionary.validation)
          : createContractSchema(dictionary.validation)

      return valibotResolver(schema)(values, context, options)
    },
    [dictionary.validation]
  )

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({ resolver, defaultValues: getEmptyValues(formOptions, defaultTarget) })

  const targetCategory = useWatch({ control, name: 'target_category' }) || defaultTarget
  const startDate = useWatch({ control, name: 'start_date' })
  const durationId = useWatch({ control, name: 'contract_duration' })
  const durations = formOptions.options.CONTRACT_DURATION || []
  const selectedDuration = durations.find(option => option.id === durationId)

  const calculatedEndDate = useMemo(
    () => toDateInputValue(calculateContractEndDate(startDate, selectedDuration)),
    [selectedDuration, startDate]
  )

  const typeCategory = CONTRACT_TYPE_DOMAINS[targetCategory] || CONTRACT_TYPE_DOMAINS.CUSTOMER

  const configuredTypeOptions = (formOptions.options.CONTRACT_TYPES || []).filter(
    option => option.category === typeCategory
  )

  const typeOptions =
    contract?.contract_type && !configuredTypeOptions.some(option => option.id === contract.contract_type.id)
      ? [...configuredTypeOptions, contract.contract_type]
      : configuredTypeOptions

  useEffect(() => {
    if (!open) return

    const editingTarget = contract?.contract_type?.category
      ? getContractTypeDomain(contract.contract_type.category)
      : defaultTarget

    reset(
      contract
        ? {
            ...getEmptyValues(formOptions, editingTarget),
            target_category: editingTarget,
            client_id: contract.client_id || '',
            lead_id: contract.lead_id || '',
            staff_id: contract.staff_id || '',
            title: contract.title || '',
            contract_type_id: contract.contract_type_id || '',
            template_id: contract.contract_type?.category === 'CONTRACT_POLICY' ? contract.contract_type_id : '',
            contract_duration: contract.contract_duration || '',
            position_title: contract.position_title || '',
            base_salary: String(contract.base_salary || ''),
            total_amount: String(contract.total_amount || ''),
            currency: contract.currency || formOptions.baseCurrency || 'AFN',
            exchange_rate: String(contract.exchange_rate || formOptions.exchangeRate || '65'),
            start_date: toDateInputValue(contract.start_date),
            end_date: toDateInputValue(contract.end_date),
            status_id: contract.status_id || getDefaultStatus(formOptions.options.CONTRACT_STATUS || []),
            country_id: contract.country_id || '',
            level_id: contract.level_id || '',
            account_manager_id: contract.account_manager_id || '',
            auto_renew: Boolean(contract.auto_renew)
          }
        : getEmptyValues(formOptions, defaultTarget)
    )
  }, [contract, defaultTarget, formOptions, open, reset])

  const submit = async values => {
    const payload = { ...values, end_date: values.end_date || calculatedEndDate, locale }

    const result =
      values.target_category === 'HRM'
        ? contract
          ? await updateStaffContract(contract.id, payload)
          : await createStaffContract(payload)
        : contract
          ? await updateContract(contract.id, payload)
          : await createContract(payload)

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)

    toast.success(result.message)
    onClose()
    await onSaved(result.data)
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

  const clientField = (
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
          renderInput={params => (
            <CustomTextField
              {...params}
              label={targetCategory === 'FINANCE' ? 'Linked Client' : 'Customer / Client'}
              placeholder={dictionary.placeholders.client}
              error={Boolean(errors.client_id)}
              helperText={errors.client_id?.message}
            />
          )}
        />
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
          <Typography color='text.secondary'>One contract engine, adapted to the selected target.</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}><i className='tabler-x' /></IconButton>
      </div>
      <form onSubmit={handleSubmit(submit)} className='flex flex-1 flex-col gap-5 overflow-y-auto p-5' noValidate>
        <Controller
          name='target_category'
          control={control}
          render={({ field }) => (
            <CustomTextField {...field} select label='Target Category' disabled={Boolean(contract)}>
              {TARGETS.map(target => (
                <MenuItem key={target} value={target}>
                  {{ HRM: 'HRM / Staff', CUSTOMER: 'Customers / Clients', FINANCE: 'Invoices / Finance', OTHERS: 'Others' }[target]}
                </MenuItem>
              ))}
            </CustomTextField>
          )}
        />

        {targetCategory === 'HRM' && (
          <>
            {selectField(
              'staff_id',
              'Staff Member',
              formOptions.staff.map(person => ({ ...person, label: person.full_name })),
              'Select staff member'
            )}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {selectField('contract_type_id', 'Contract Type', typeOptions, 'Select HRM type')}
              {selectField('template_id', 'Agreed Terms / Template', formOptions.templates || [], 'Select template')}
              {field('position_title', 'Position Title')}
              {field('base_salary', 'Base Salary', { type: 'number', inputProps: { min: 0.01, step: '0.01' } })}
              {field('start_date', dictionary.fields.startDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
              {field('end_date', dictionary.fields.endDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
            </div>
          </>
        )}

        {targetCategory === 'CUSTOMER' && (
          <>
            {clientField}
            {selectField('lead_id', 'Linked Lead (Optional)', (formOptions.leads || []).map(lead => ({ ...lead, label: lead.title })), 'Select lead')}
            {field('title', dictionary.fields.title)}
          </>
        )}

        {targetCategory === 'FINANCE' && (
          <>
            {clientField}
            <Controller
              name='invoice_id'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  select
                  label='Invoice Number'
                  onChange={event => {
                    field.onChange(event)
                    const invoice = (formOptions.invoices || []).find(item => item.id === event.target.value)

                    if (invoice) {
                      setValue('client_id', invoice.client_id)
                      setValue('title', `Finance Agreement - ${invoice.invoice_number}`)
                      setValue('total_amount', invoice.amount)
                      setValue('currency', invoice.currency)
                    }
                  }}
                >
                  <MenuItem value=''>Select invoice</MenuItem>
                  {(formOptions.invoices || []).map(invoice => <MenuItem key={invoice.id} value={invoice.id}>{invoice.invoice_number}</MenuItem>)}
                </CustomTextField>
              )}
            />
          </>
        )}

        {targetCategory === 'OTHERS' && field('title', 'Third Party / Entity Name')}

        {targetCategory !== 'HRM' && (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {selectField(
                'contract_type_id',
                targetCategory === 'OTHERS' ? 'Contract Purpose' : 'Contract Type',
                typeOptions,
                'Select contract type'
              )}
              {targetCategory !== 'OTHERS' &&
                selectField(
                  'contract_duration',
                  targetCategory === 'FINANCE' ? 'Payment Terms' : dictionary.fields.duration,
                  durations,
                  dictionary.placeholders.duration
                )}
              {field('start_date', dictionary.fields.startDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
              {targetCategory === 'OTHERS' ? (
                field('end_date', dictionary.fields.endDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })
              ) : (
                <CustomTextField label={dictionary.fields.endDate} type='date' value={calculatedEndDate} disabled slotProps={{ inputLabel: { shrink: true } }} />
              )}
              {field('total_amount', targetCategory === 'OTHERS' ? 'Contract Amount' : dictionary.fields.amount, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
              <Controller
                name='currency'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select label={dictionary.fields.currency}>
                    <MenuItem value='AFN'>AFN</MenuItem>
                    <MenuItem value='USD'>USD</MenuItem>
                  </CustomTextField>
                )}
              />
              {field('exchange_rate', dictionary.fields.exchangeRate, { type: 'number', inputProps: { min: 0, step: '0.0001' } })}
              {targetCategory === 'FINANCE' && field('installment_schedule', 'Installment Schedule', { multiline: true, minRows: 2 })}
            </div>
            {targetCategory === 'CUSTOMER' && (
              <Controller
                name='auto_renew'
                control={control}
                render={({ field }) => (
                  <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={event => field.onChange(event.target.checked)} />} label={dictionary.fields.autoRenew} />
                )}
              />
            )}
          </>
        )}

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {selectField('status_id', dictionary.fields.status, statusOptions, dictionary.placeholders.status)}
          {targetCategory === 'HRM' && (
            <Controller
              name='currency'
              control={control}
              render={({ field }) => (
                <CustomTextField {...field} select label={dictionary.fields.currency}>
                  <MenuItem value='AFN'>AFN</MenuItem>
                  <MenuItem value='USD'>USD</MenuItem>
                </CustomTextField>
              )}
            />
          )}
        </div>

        <div className='mt-auto flex justify-end gap-3 pt-4'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
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

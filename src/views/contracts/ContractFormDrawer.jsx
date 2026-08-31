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
import DateDurationHelper from '@/components/contracts/DateDurationHelper'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import { CONTRACT_TYPE_DOMAINS } from '@/data/contractTypes'
import { createContractSchema } from '@/schemas/contracts'
import { createStaffContractSchema } from '@/schemas/hrm/contracts'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency } from '@/utils/formatCurrency'

const getDefaultStatus = statuses =>
  statuses.find(option => option.is_default)?.id ||
  statuses.find(option => option.value === 'DRAFT')?.id ||
  statuses[0]?.id ||
  ''

const getEmptyValues = formOptions => ({
  client_id: '',
  vendor_id: '',
  vendor_name: '',
  vendor_contact_name: '',
  vendor_contact_email: '',
  vendor_phone: '',
  vendor_address: '',
  lead_id: '',
  staff_id: '',
  title: '',
  contract_type_id: '',
  template_id: '',
  termination_reason: '',
  probation_days: 90,
  notice_period_days: 30,
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
  installment_schedule: '',
  termination_date: ''
})

const ContractFormDrawer = ({
  open,
  contract,
  formOptions,
  locale,
  dictionary,
  contractContext = 'CUSTOMER',
  initialValues = null,
  drawerTitle = null,
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
        contractContext === 'HRM'
          ? createStaffContractSchema(dictionary.validation)
          : createContractSchema(dictionary.validation)

      return valibotResolver(schema)({ ...values, target_category: contractContext }, context, options)
    },
    [contractContext, dictionary.validation]
  )

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({ resolver, defaultValues: getEmptyValues(formOptions) })

  const targetCategory = contractContext
  const startDate = useWatch({ control, name: 'start_date' })
  const endDate = useWatch({ control, name: 'end_date' })
  const statusId = useWatch({ control, name: 'status_id' })
  const currency = useWatch({ control, name: 'currency' })
  const baseSalary = useWatch({ control, name: 'base_salary' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })
  const configuredDurations = formOptions.options.CONTRACT_DURATION
  const durations = useMemo(() => configuredDurations || [], [configuredDurations])

  const selectedStatus = statusOptions.find(option => option.id === statusId)

  const baseSalaryPreview = useMemo(
    () =>
      convertToBaseCurrency(
        Number(baseSalary) || 0,
        currency,
        Number(exchangeRate) || 0,
        formOptions.baseCurrency || 'AFN'
      ),
    [baseSalary, currency, exchangeRate, formOptions.baseCurrency]
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

    const resetValues = contract
      ? {
          ...getEmptyValues(formOptions),
          client_id: contract.client_id || '',
          vendor_id: contract.vendor_id || '',
          vendor_name:
            contract.vendor?.company_name ||
            (contract.contract_type?.category === 'CONTRACT_TYPE_OTHER' ? contract.title : ''),
          vendor_contact_name: contract.vendor?.contact_name || '',
          vendor_contact_email: contract.vendor?.email || '',
          vendor_phone: contract.vendor?.phone || '',
          vendor_address: contract.vendor?.address || '',
          lead_id: contract.lead_id || '',
          staff_id: contract.staff_id || '',
          title: contract.title || '',
          contract_type_id: contract.contract_type_id || '',
          template_id:
            contract.template_id ||
            (contract.contract_type?.category === 'CONTRACT_POLICY' ? contract.contract_type_id : ''),
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
          auto_renew: Boolean(contract.auto_renew),
          probation_days: contract.probation_days || 90,
          notice_period_days: contract.notice_period_days || 30,
          termination_date: toDateInputValue(contract.termination_date),
          termination_reason: contract.termination_reason || ''
        }
      : initialValues
        ? {
            ...getEmptyValues(formOptions),
            ...initialValues,
            staff_id: initialValues.staff_id || '',
            contract_type_id: initialValues.contract_type_id || '',
            template_id: initialValues.template_id || '',
            position_title: initialValues.position_title || '',
            base_salary: String(initialValues.base_salary || ''),
            currency: initialValues.currency || formOptions.baseCurrency || 'AFN',
            exchange_rate: String(initialValues.exchange_rate || formOptions.exchangeRate || '65'),
            start_date: toDateInputValue(initialValues.start_date || new Date()),
            end_date: toDateInputValue(initialValues.end_date),
            status_id: initialValues.status_id || getDefaultStatus(formOptions.options.CONTRACT_STATUS || [])
          }
        : getEmptyValues(formOptions)

    reset(resetValues)
  }, [contract, formOptions, initialValues, open, reset, targetCategory])

  const submit = async values => {
    const payload = {
      ...values,
      locale
    }

    delete payload.target_category

    const result =
      targetCategory === 'HRM'
        ? contract
          ? await updateStaffContract(contract.id, payload)
          : await createStaffContract(payload)
        : contract
          ? await updateContract(contract.id, payload, targetCategory)
          : await createContract(payload, targetCategory)

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)

    toast.success(result.message)
    onClose()
    await onSaved(result.data)
  }

  const field = (name, label, props = {}) => {
    const FieldComponent = props.type === 'date' ? NativeDateTimeInput : CustomTextField
    const resolvedProps = props.type === 'date' ? { ...props, type: undefined, locale } : props

    return (
      <Controller
        name={name}
        control={control}
        render={({ field: controllerField }) => (
          <FieldComponent
            {...controllerField}
            {...resolvedProps}
            value={controllerField.value ?? ''}
            label={label}
            error={Boolean(errors[name])}
            helperText={errors[name]?.message || resolvedProps.helperText}
          />
        )}
      />
    )
  }

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
          {options.map(option => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          ))}
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
              label='Customer / Client'
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
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>
            {drawerTitle || (contract ? dictionary.form.editTitle : dictionary.form.addTitle)}
          </Typography>
          <Typography color='text.secondary'>
            {dictionary.form.moduleDescription || dictionary.form.description}
          </Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form
        onSubmit={handleSubmit(submit)}
        className='form-surface-scroll flex flex-1 flex-col gap-5 px-5'
        noValidate
      >
        <FormSectionCards
          labels={[
            dictionary.form.generalSection,
            dictionary.form.termsSection,
            dictionary.form.financialSection
          ]}
        >
          {targetCategory === 'HRM' && (
            <>
              {selectField(
                'staff_id',
                dictionary.fields.staffMember,
                formOptions.staff.map(person => ({ ...person, label: person.full_name })),
                dictionary.placeholders.staffMember
              )}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {selectField(
                  'contract_type_id',
                  dictionary.fields.contractType,
                  typeOptions,
                  dictionary.placeholders.contractType
                )}
                {selectField(
                  'template_id',
                  dictionary.fields.template,
                  formOptions.templates || [],
                  dictionary.placeholders.template
                )}
                {field('position_title', dictionary.fields.positionTitle)}
                {field('base_salary', dictionary.fields.baseSalary, {
                  type: 'number',
                  inputProps: { min: 0.01, step: '0.01' }
                })}
                {field('start_date', dictionary.fields.startDate, {
                  type: 'date',
                  slotProps: { inputLabel: { shrink: true } }
                })}
                <div className='flex flex-col gap-2'>
                  {field('end_date', dictionary.fields.endDate, {
                    type: 'date',
                    slotProps: { inputLabel: { shrink: true } }
                  })}
                  <DateDurationHelper
                    startDate={startDate}
                    endDate={endDate}
                    durationOptions={durations}
                    onEndDateChange={value => setValue('end_date', value, { shouldDirty: true, shouldValidate: true })}
                  />
                </div>
                {field('probation_days', dictionary.fields.probationDays, {
                  type: 'number',
                  inputProps: { min: 1, step: '1' }
                })}
                {field('notice_period_days', dictionary.fields.noticePeriodDays, {
                  type: 'number',
                  inputProps: { min: 1, step: '1' }
                })}
              </div>
            </>
          )}

          {targetCategory === 'CUSTOMER' && (
            <>
              {clientField}
              {selectField(
                'lead_id',
                'Linked Lead (Optional)',
                (formOptions.leads || []).map(lead => ({ ...lead, label: lead.title })),
                'Select lead'
              )}
              {selectField(
                'template_id',
                'Agreement Template',
                formOptions.templates || [],
                'Select agreement template'
              )}
              {field('title', dictionary.fields.title)}
            </>
          )}

          {targetCategory === 'OTHERS' && (
            <>
              <Controller
                name='vendor_id'
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={formOptions.vendors || []}
                    value={(formOptions.vendors || []).find(vendor => vendor.id === field.value) || null}
                    onChange={(_, vendor) => {
                      field.onChange(vendor?.id || '')
                      if (!vendor) return
                      setValue('vendor_name', vendor.company_name, { shouldValidate: true })
                      setValue('vendor_contact_name', vendor.contact_name, { shouldValidate: true })
                      setValue('vendor_contact_email', vendor.email, { shouldValidate: true })
                      setValue('vendor_phone', vendor.phone || '')
                      setValue('vendor_address', vendor.address || '')
                    }}
                    getOptionLabel={vendor => vendor.company_name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, vendor) => (
                      <li {...props} key={vendor.id}>
                        <div>
                          <Typography variant='body2'>{vendor.company_name}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {vendor.contact_name} <>&middot;</> {vendor.email}
                          </Typography>
                        </div>
                      </li>
                    )}
                    renderInput={params => (
                      <CustomTextField
                        {...params}
                        label='Select Existing Vendor (Optional)'
                        placeholder='Search saved vendors'
                      />
                    )}
                  />
                )}
              />
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {field('vendor_name', 'Third-Party Company / Vendor Name', {
                  required: true,
                  placeholder: 'e.g. Azizi Bank'
                })}
                {field('vendor_contact_name', 'Vendor Representative / Contact Person', { required: true })}
                {field('vendor_contact_email', 'Vendor Contact Email', { required: true, type: 'email' })}
                {field('vendor_phone', 'Vendor Contact Phone')}
              </div>
              {field('vendor_address', 'Vendor Address', { multiline: true, minRows: 2 })}
              {field('title', 'Agreement Title / Subject')}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {selectField(
                  'account_manager_id',
                  'Internal Owner / Responsible Lead',
                  (formOptions.staff || []).map(person => ({
                    ...person,
                    label: `${person.full_name}${person.position ? ` - ${person.position}` : ''}`
                  })),
                  'Select responsible employee'
                )}
                {selectField('country_id', 'Country', formOptions.options.COUNTRY || [], 'Select country')}
              </div>
            </>
          )}

          {targetCategory !== 'HRM' && (
            <>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {selectField(
                  'contract_type_id',
                  targetCategory === 'OTHERS' ? 'Contract Purpose' : 'Contract Type',
                  typeOptions,
                  'Select contract type'
                )}
                {field('start_date', dictionary.fields.startDate, {
                  type: 'date',
                  slotProps: { inputLabel: { shrink: true } }
                })}
                <div className='flex flex-col gap-2'>
                  {field('end_date', dictionary.fields.endDate, {
                    type: 'date',
                    slotProps: { inputLabel: { shrink: true } }
                  })}
                  <DateDurationHelper
                    startDate={startDate}
                    endDate={endDate}
                    durationOptions={durations}
                    onEndDateChange={value => setValue('end_date', value, { shouldDirty: true, shouldValidate: true })}
                  />
                </div>
                {field('total_amount', targetCategory === 'OTHERS' ? 'Contract Amount' : dictionary.fields.amount, {
                  type: 'number',
                  inputProps: { min: 0, step: '0.01' }
                })}
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
                {field('exchange_rate', dictionary.fields.exchangeRate, {
                  type: 'number',
                  inputProps: { min: 0, step: '0.0001' }
                })}
              </div>
              {['CUSTOMER', 'OTHERS'].includes(targetCategory) && (
                <Controller
                  name='auto_renew'
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(field.value)}
                          onChange={event => field.onChange(event.target.checked)}
                        />
                      }
                      label={dictionary.fields.autoRenew}
                    />
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
            {targetCategory === 'HRM' &&
              currency === 'USD' &&
              field('exchange_rate', dictionary.fields.exchangeRate, {
                type: 'number',
                inputProps: { min: 0.0001, step: '0.0001' }
              })}
          </div>

          {targetCategory === 'HRM' && currency === 'USD' && (
            <div className='rounded border border-success/20 bg-successLighter p-3'>
              <Typography variant='caption'>Base currency preview</Typography>
              <Typography className='font-semibold'>
                {formatCurrency(baseSalaryPreview, locale, formOptions.baseCurrency || 'AFN')}
              </Typography>
            </div>
          )}

          {selectedStatus?.value === 'TERMINATED' && (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {field('termination_date', 'Termination Date', {
                type: 'date',
                slotProps: { inputLabel: { shrink: true } }
              })}
              {field('termination_reason', 'Termination Reason', {
                multiline: true,
                minRows: 3,
                placeholder: 'Explain why this contract is being terminated.'
              })}
            </div>
          )}
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 pt-5'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
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

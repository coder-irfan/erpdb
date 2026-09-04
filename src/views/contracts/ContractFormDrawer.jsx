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
import useActiveCountries from '@/hooks/useActiveCountries'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import { CONTRACT_TYPE_DOMAINS } from '@/data/contractTypes'
import { createContractSchema } from '@/schemas/contracts'
import { createStaffContractSchema } from '@/schemas/hrm/contracts'
import { getContractDurationHelperText, toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const getDefaultStatus = statuses =>
  statuses.find(option => option.is_default)?.id ||
  statuses.find(option => option.value === 'DRAFT')?.id ||
  statuses[0]?.id ||
  ''

const SectionTitle = ({ children }) => children

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
  contract_duration: '',
  legal_clause_ids: (formOptions.clauses || []).filter(clause => clause.is_default).map(clause => clause.id),
  termination_reason: '',
  probation_days: 90,
  notice_period_days: 30,
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
  const durationId = useWatch({ control, name: 'contract_duration' })
  const statusId = useWatch({ control, name: 'status_id' })
  const staffId = useWatch({ control, name: 'staff_id' })
  const configuredDurations = formOptions.options.CONTRACT_DURATION
  const countries = useActiveCountries(open, formOptions.options.COUNTRY || [])
  const countryOptions = useMemo(
    () => contract?.country && !countries.some(option => option.id === contract.country.id)
      ? [...countries, { ...contract.country, disabled: true }]
      : countries,
    [contract, countries]
  )
  const durations = useMemo(() => configuredDurations || [], [configuredDurations])
  const durationHelperText = getContractDurationHelperText(startDate, endDate)

  const selectedStatus = statusOptions.find(option => option.id === statusId)

  const selectedStaff = useMemo(
    () =>
      (formOptions.staff || []).find(person => person.id === staffId) ||
      (contract?.staff_id === staffId ? contract.staff : null),
    [contract?.staff, contract?.staff_id, formOptions.staff, staffId]
  )

  const typeCategory = CONTRACT_TYPE_DOMAINS[targetCategory] || CONTRACT_TYPE_DOMAINS.CUSTOMER

  const configuredTypeOptions = (formOptions.options.CONTRACT_TYPES || []).filter(
    option =>
      option.category === typeCategory ||
      (['CUSTOMER', 'OTHERS'].includes(targetCategory) && option.category === 'CONTRACT_TYPE')
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
          contract_duration: contract.contract_duration || '',
          legal_clause_ids: Array.isArray(contract.legal_clause_ids) ? contract.legal_clause_ids : [],
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
            contract_duration: initialValues.contract_duration || initialValues.duration_id || '',
            legal_clause_ids: Array.isArray(initialValues.legal_clause_ids) ? initialValues.legal_clause_ids : [],
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

  const selectField = (name, label, options) => (
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
              renderValue: selected => options.find(option => option.id === selected)?.label || ''
            }
          }}
        >
          {!options.length && <MenuItem disabled value=''>No active countries/options available</MenuItem>}
          {options.map(option => (
            <MenuItem disabled={option.disabled} key={option.id} value={option.id}>
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
              error={Boolean(errors.client_id)}
              helperText={errors.client_id?.message}
            />
          )}
        />
      )}
    />
  )

  const legalClausesField = (
    <Controller
      name='legal_clause_ids'
      control={control}
      render={({ field }) => (
        <Autocomplete
          multiple
          options={formOptions.clauses || []}
          value={(formOptions.clauses || []).filter(clause => (field.value || []).includes(clause.id))}
          onChange={(_, clauses) => field.onChange(clauses.map(clause => clause.id))}
          getOptionLabel={clause => clause.label}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={params => (
            <CustomTextField
              {...params}
              label='Select Legal Clauses to Include'
              helperText='Selected clauses are saved into the contract document snapshot.'
              error={Boolean(errors.legal_clause_ids)}
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
      <form onSubmit={handleSubmit(submit)} className='form-surface-scroll flex flex-1 flex-col gap-5 px-5' noValidate>
        <FormSectionCards
          labels={[dictionary.form.generalSection, dictionary.form.termsSection, dictionary.form.financialSection]}
        >
          {targetCategory === 'OTHERS' && <SectionTitle>Third-Party Details</SectionTitle>}

          {targetCategory === 'HRM' && (
            <>
              {selectField(
                'staff_id',
                dictionary.fields.staffMember,
                (formOptions.staff || []).map(person => ({ ...person, label: person.full_name }))
              )}
              {selectedStaff && (
                <div className='grid grid-cols-1 gap-3 rounded border border-primary/20 bg-primaryLighter p-4 sm:grid-cols-2'>
                  <div>
                    <Typography variant='caption' color='text.secondary'>
                      {dictionary.fields.position || dictionary.fields.positionTitle}
                    </Typography>
                    <Typography className='font-medium'>{selectedStaff.position || '—'}</Typography>
                  </div>
                  <div>
                    <Typography variant='caption' color='text.secondary'>
                      {dictionary.fields.baseSalary}
                    </Typography>
                    <Typography className='font-medium'>
                      {formatCurrency(
                        selectedStaff.salary,
                        locale,
                        selectedStaff.salary_currency || formOptions.baseCurrency || 'AFN'
                      )}
                    </Typography>
                  </div>
                </div>
              )}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {selectField('contract_type_id', dictionary.fields.contractType, typeOptions)}
                {field('start_date', dictionary.fields.startDate, {
                  type: 'date',
                  slotProps: { inputLabel: { shrink: true } }
                })}
                <DateDurationHelper
                  startDate={startDate}
                  endDate={endDate}
                  durationId={durationId}
                  durationOptions={durations}
                  onDurationChange={value => setValue('contract_duration', value, { shouldDirty: true })}
                  onEndDateChange={value => setValue('end_date', value, { shouldDirty: true, shouldValidate: true })}
                />
                {field('end_date', dictionary.fields.endDate, {
                  type: 'date',
                  helperText: durationHelperText,
                  slotProps: { inputLabel: { shrink: true } }
                })}
                {field('probation_days', dictionary.fields.probationDays, {
                  type: 'number',
                  inputProps: { min: 1, step: '1' }
                })}
                {field('notice_period_days', dictionary.fields.noticePeriodDays, {
                  type: 'number',
                  inputProps: { min: 1, step: '1' }
                })}
              </div>
              {selectField('template_id', dictionary.fields.template, formOptions.templates || [])}
              {legalClausesField}
            </>
          )}

          {targetCategory === 'CUSTOMER' && (
            <>
              {clientField}
              {selectField(
                'lead_id',
                'Linked Lead (Optional)',
                (formOptions.leads || []).map(lead => ({ ...lead, label: lead.title }))
              )}
              {selectField('template_id', 'Agreement Template', formOptions.templates || [])}
              {legalClausesField}
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

                      if (!vendor) {
                        setValue('vendor_name', '', { shouldDirty: true, shouldValidate: true })
                        setValue('vendor_contact_name', '', { shouldDirty: true, shouldValidate: true })
                        setValue('vendor_contact_email', '', { shouldDirty: true, shouldValidate: true })
                        setValue('vendor_phone', '', { shouldDirty: true })
                        setValue('vendor_address', '', { shouldDirty: true })

                        return
                      }

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
                    renderInput={params => <CustomTextField {...params} label='Select Existing Vendor (Optional)' />}
                  />
                )}
              />
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {field('vendor_name', 'Third-Party Company / Vendor Name', {
                  required: true
                })}
                {field('vendor_contact_name', 'Vendor Representative / Contact Person', { required: true })}
                {field('vendor_contact_email', 'Vendor Contact Email', { required: true, type: 'email' })}
                {field('vendor_phone', 'Vendor Contact Phone')}
              </div>
              {field('vendor_address', 'Vendor Address', { multiline: true, minRows: 2 })}
            </>
          )}

          {targetCategory === 'OTHERS' && <SectionTitle>Contract Details</SectionTitle>}

          {targetCategory === 'OTHERS' && (
            <>
              {field('title', 'Agreement Title / Subject')}
              {selectField('template_id', 'Contract Template', formOptions.templates || [])}
              {legalClausesField}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {selectField('contract_type_id', 'Contract Type', typeOptions)}
                {selectField('country_id', 'Country / Jurisdiction', countryOptions)}
                {field('start_date', dictionary.fields.startDate, {
                  type: 'date',
                  slotProps: { inputLabel: { shrink: true } }
                })}
                <DateDurationHelper
                  startDate={startDate}
                  endDate={endDate}
                  durationId={durationId}
                  durationOptions={durations}
                  onDurationChange={value => setValue('contract_duration', value, { shouldDirty: true })}
                  onEndDateChange={value => setValue('end_date', value, { shouldDirty: true, shouldValidate: true })}
                />
                {field('end_date', dictionary.fields.endDate, {
                  type: 'date',
                  helperText: durationHelperText,
                  slotProps: { inputLabel: { shrink: true } }
                })}
                {selectField(
                  'account_manager_id',
                  'Internal Owner / Responsible Lead',
                  (formOptions.staff || []).map(person => ({
                    ...person,
                    label: `${person.full_name}${person.position ? ` - ${person.position}` : ''}`
                  }))
                )}
                {selectField('country_id', 'Country / Jurisdiction', countryOptions)}
              </div>
            </>
          )}

          {targetCategory === 'CUSTOMER' && (
            <>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {selectField('contract_type_id', 'Contract Type', typeOptions)}
                {field('start_date', dictionary.fields.startDate, {
                  type: 'date',
                  slotProps: { inputLabel: { shrink: true } }
                })}
                <DateDurationHelper
                  startDate={startDate}
                  endDate={endDate}
                  durationId={durationId}
                  durationOptions={durations}
                  onDurationChange={value => setValue('contract_duration', value, { shouldDirty: true })}
                  onEndDateChange={value => setValue('end_date', value, { shouldDirty: true, shouldValidate: true })}
                />
                {field('end_date', dictionary.fields.endDate, {
                  type: 'date',
                  helperText: durationHelperText,
                  slotProps: { inputLabel: { shrink: true } }
                })}
                {field('total_amount', dictionary.fields.amount, {
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
                <Controller
                  name='auto_renew'
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      className='m-0 min-bs-10 self-center'
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
              </div>
            </>
          )}

          {targetCategory === 'OTHERS' && <SectionTitle>Financial &amp; Status</SectionTitle>}

          {targetCategory === 'OTHERS' && (
            <>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {field('total_amount', 'Contract Amount', {
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
                <Controller
                  name='auto_renew'
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      className='m-0 min-bs-10 self-center'
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
              </div>
            </>
          )}

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {selectField('status_id', dictionary.fields.status, statusOptions)}
          </div>

          {selectedStatus?.value === 'TERMINATED' && (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {field('termination_date', 'Termination Date', {
                type: 'date',
                slotProps: { inputLabel: { shrink: true } }
              })}
              {field('termination_reason', 'Termination Reason', {
                multiline: true,
                minRows: 3
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

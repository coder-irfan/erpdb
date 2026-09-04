'use client'

import { useEffect, useMemo } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createStaffContract, updateStaffContract } from '@/actions/hrm/contracts'
import DateDurationHelper from '@/components/contracts/DateDurationHelper'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import { createStaffContractSchema } from '@/schemas/hrm/contracts'
import { getContractDurationHelperText } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatStatusLabel } from '@/utils/formatStatusLabel'

const toInputDate = value => (value ? new Date(value).toISOString().slice(0, 10) : '')

const getDefaultValues = (contract, statuses, options = {}) => ({
  staff_id: contract?.staff_id || '',
  contract_type_id: contract?.contract_type_id || '',
  template_id: contract?.contract_type?.category === 'CONTRACT_POLICY' ? contract.contract_type_id : '',
  contract_duration: contract?.duration_id || '',
  legal_clause_ids: Array.isArray(contract?.legal_clause_ids)
    ? contract.legal_clause_ids
    : (options.clauses || []).filter(clause => clause.is_default).map(clause => clause.id),
  start_date: toInputDate(contract?.start_date) || new Date().toISOString().slice(0, 10),
  end_date: toInputDate(contract?.end_date),
  probation_days: String(contract?.probation_days ?? 90),
  notice_period_days: String(contract?.notice_period_days ?? 30),
  document_url: contract?.document_url || '',
  status_id: contract?.status_id || statuses.find(status => status.value === 'DRAFT')?.id || statuses[0]?.id || ''
})

const withCurrentOption = (options, currentOption) => {
  if (!currentOption || options.some(option => option.id === currentOption.id)) return options

  return [...options, currentOption]
}

const TEMPLATE_FIELDS = [
  ['staffName', '{STAFF_NAME}'],
  ['tazkira', '{TAZKIRA_NO}'],
  ['position', '{POSITION}'],
  ['salary', '{BASE_SALARY}'],
  ['startDate', '{START_DATE}'],
  ['companyName', '{COMPANY_NAME}']
]

const StaffContractDrawer = ({ open, contract, options, locale, dictionary, onClose, onSaved }) => {
  const staffOptions = useMemo(
    () => withCurrentOption(options.staff, contract?.staff),
    [contract?.staff, options.staff]
  )

  const contractTypeOptions = useMemo(
    () => withCurrentOption(options.contractTypes || [], contract?.contract_type),
    [contract?.contract_type, options.contractTypes]
  )

  const statusOptions = useMemo(
    () => withCurrentOption(options.statuses, contract?.status),
    [contract?.status, options.statuses]
  )

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createStaffContractSchema(dictionary.validation)),
    defaultValues: getDefaultValues(contract, statusOptions, options)
  })

  const staffId = useWatch({ control, name: 'staff_id' })
  const startDate = useWatch({ control, name: 'start_date' })
  const endDate = useWatch({ control, name: 'end_date' })
  const durationId = useWatch({ control, name: 'contract_duration' })
  const configuredDurations = options.options?.CONTRACT_DURATION
  const durationOptions = useMemo(() => configuredDurations || [], [configuredDurations])
  const durationHelperText = getContractDurationHelperText(startDate, endDate)
  const selectedStaff = staffOptions.find(staff => staff.id === staffId) || null

  useEffect(() => {
    if (!open) return

    const resetValues = getDefaultValues(contract, statusOptions, options)

    reset(resetValues)
  }, [contract, open, options, reset, statusOptions])

  const handleStaffChange = event => {
    const selectedId = event.target.value

    setValue('staff_id', selectedId, { shouldDirty: true, shouldValidate: true })
  }

  const submitForm = async values => {
    try {
      const payload = { ...values, locale }

      const result = contract ? await updateStaffContract(contract.id, payload) : await createStaffContract(payload)

      if (!result.success) {
        toast.error(result.error)

        return
      }

      toast.success(result.message)
      onSaved(result.data)
      onClose()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[540px]' }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-6'>
        <div>
          <Typography variant='h5'>{contract ? dictionary.drawer.editTitle : dictionary.drawer.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
      <form className='form-surface-scroll flex flex-1 flex-col gap-5 px-5 pt-5' onSubmit={handleSubmit(submitForm)}>
        <FormSectionCards
          labels={[
            dictionary.tabs?.general || 'Contract assignment',
            dictionary.tabs?.terms || 'Employment terms',
            dictionary.tabs?.compensation || 'Compensation'
          ]}
        >
          {contract && (
            <CustomTextField
              fullWidth
              disabled
              label={dictionary.fields.contractNumber}
              value={contract.contract_number}
            />
          )}
          <Controller
            name='staff_id'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                fullWidth
                required
                label={dictionary.fields.staffMember}
                value={field.value || ''}
                error={Boolean(errors.staff_id)}
                helperText={errors.staff_id?.message}
                onChange={handleStaffChange}
              >
                {staffOptions.map(staff => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='template_id'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                fullWidth
                required
                label={dictionary.fields.template || dictionary.fields.contractType}
                value={field.value || ''}
                error={Boolean(errors.template_id)}
                helperText={errors.template_id?.message}
              >
                {options.policies.map(policy => (
                  <MenuItem key={policy.id} value={policy.id}>
                    {policy.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='legal_clause_ids'
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={options.clauses || []}
                value={(options.clauses || []).filter(clause => (field.value || []).includes(clause.id))}
                onChange={(_, clauses) => field.onChange(clauses.map(clause => clause.id))}
                getOptionLabel={clause => clause.label}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={params => (
                  <CustomTextField
                    {...params}
                    label='Select Legal Clauses to Include'
                    helperText='Selected clauses are saved into the contract document snapshot.'
                  />
                )}
              />
            )}
          />
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            {selectedStaff && (
              <div className='rounded border border-primary/20 bg-primaryLighter p-4 sm:col-span-2'>
                <Typography variant='caption' color='text.secondary'>
                  {dictionary.fields.position || 'Position'} · {dictionary.fields.baseSalary}
                </Typography>
                <Typography className='font-medium'>
                  {selectedStaff.position || '—'} ·{' '}
                  {formatCurrency(
                    selectedStaff.salary,
                    locale,
                    selectedStaff.salary_currency || options.setup.currency_code || 'AFN'
                  )}
                </Typography>
              </div>
            )}
            <Controller
              name='contract_type_id'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  select
                  fullWidth
                  required
                  label={dictionary.fields.contractType}
                  value={field.value || ''}
                  error={Boolean(errors.contract_type_id)}
                  helperText={errors.contract_type_id?.message}
                >
                  {contractTypeOptions.map(type => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            <NativeDateTimeInput
              fullWidth
              required
              locale={locale}
              label={dictionary.fields.startDate}
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.start_date)}
              helperText={errors.start_date?.message}
              {...register('start_date')}
            />
            <DateDurationHelper
              startDate={startDate}
              endDate={endDate}
              durationId={durationId}
              durationOptions={durationOptions}
              onDurationChange={value => setValue('contract_duration', value, { shouldDirty: true })}
              onEndDateChange={value => setValue('end_date', value, { shouldDirty: true, shouldValidate: true })}
            />
            <NativeDateTimeInput
              fullWidth
              required
              locale={locale}
              label={dictionary.fields.endDate}
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.end_date)}
              helperText={errors.end_date?.message || durationHelperText}
              {...register('end_date')}
            />
            <CustomTextField
              fullWidth
              required
              type='number'
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              label={dictionary.fields.probationDays}
              error={Boolean(errors.probation_days)}
              helperText={errors.probation_days?.message}
              {...register('probation_days')}
            />
            <CustomTextField
              fullWidth
              required
              type='number'
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              label={dictionary.fields.noticePeriodDays}
              error={Boolean(errors.notice_period_days)}
              helperText={errors.notice_period_days?.message}
              {...register('notice_period_days')}
            />
          </div>
          <Controller
            name='status_id'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                fullWidth
                required
                label={dictionary.fields.status}
                value={field.value || ''}
                error={Boolean(errors.status_id)}
                helperText={errors.status_id?.message}
              >
                {statusOptions.map(status => (
                  <MenuItem key={status.id} value={status.id}>
                    {formatStatusLabel(status.value, dictionary.status[status.value] || status.label)}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <div className='rounded border border-primary/20 bg-primaryLighter p-4'>
            <div className='mb-3 flex items-start gap-3'>
              <i className='tabler-sparkles mt-0.5 text-primary' />
              <div>
                <Typography className='font-medium' color='text.primary'>
                  {dictionary.drawer.templateHelpTitle}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {dictionary.drawer.templateHelpSubtitle}
                </Typography>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {TEMPLATE_FIELDS.map(([key, variable]) => (
                <Tooltip key={key} title={variable} arrow>
                  <Chip size='small' variant='tonal' color='primary' label={dictionary.drawer.templateFields[key]} />
                </Tooltip>
              ))}
            </div>
          </div>
        </FormSectionCards>
        <div className='form-surface-actions -mx-6 -mb-6 mt-auto flex justify-end gap-3 p-4'>
          <Button type='button' variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {contract ? dictionary.actions.saveChanges : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default StaffContractDrawer

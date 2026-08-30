'use client'

import { useEffect, useMemo } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createStaffContract, updateStaffContract } from '@/actions/hrm/contracts'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import LocalizedDateTimePicker from '@/components/inputs/LocalizedDateTimePicker'
import { createStaffContractSchema } from '@/schemas/hrm/contracts'

const toInputDate = value => (value ? new Date(value).toISOString().slice(0, 10) : '')

const getDefaultValues = (contract, statuses, baseCurrency) => ({
  staff_id: contract?.staff_id || '',
  contract_type_id: contract?.contract_type_id || '',
  template_id: contract?.contract_type?.category === 'CONTRACT_POLICY' ? contract.contract_type_id : '',
  position_title: contract?.position_title || '',
  base_salary: contract?.base_salary || '',
  currency: contract?.currency || baseCurrency,
  start_date: toInputDate(contract?.start_date) || new Date().toISOString().slice(0, 10),
  end_date: toInputDate(contract?.end_date),
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
    defaultValues: getDefaultValues(contract, statusOptions, options.setup.currency_code || 'AFN')
  })

  useEffect(() => {
    if (open) reset(getDefaultValues(contract, statusOptions, options.setup.currency_code || 'AFN'))
  }, [contract, open, options.setup.currency_code, reset, statusOptions])

  const handleStaffChange = event => {
    const selectedId = event.target.value
    const staff = staffOptions.find(item => item.id === selectedId)

    setValue('staff_id', selectedId, { shouldDirty: true, shouldValidate: true })

    if (staff) {
      setValue('position_title', staff.position, { shouldDirty: true, shouldValidate: true })
      setValue('base_salary', staff.salary, { shouldDirty: true, shouldValidate: true })
      setValue('currency', staff.salary_currency || options.setup.currency_code || 'AFN', {
        shouldDirty: true,
        shouldValidate: true
      })
    }
  }

  const submitForm = async values => {
    try {
      const result = contract
        ? await updateStaffContract(contract.id, { ...values, locale })
        : await createStaffContract({ ...values, locale })

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
      <div className='flex items-start justify-between gap-4 p-6'>
        <div>
          <Typography variant='h5'>{contract ? dictionary.drawer.editTitle : dictionary.drawer.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.drawer.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
      <form className='flex flex-1 flex-col gap-5 overflow-y-auto p-6' onSubmit={handleSubmit(submitForm)}>
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
              <MenuItem value='' disabled>
                {dictionary.placeholders.selectStaff}
              </MenuItem>
              {staffOptions.map(staff => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.full_name}
                </MenuItem>
              ))}
            </CustomTextField>
          )}
        />
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
              <MenuItem value='' disabled>
              {dictionary.placeholders.selectContractType || dictionary.placeholders.selectPolicy}
            </MenuItem>
              {contractTypeOptions.map(type => (
                <MenuItem key={type.id} value={type.id}>
                  {type.label}
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
              <MenuItem value='' disabled>{dictionary.placeholders.selectPolicy}</MenuItem>
              {options.policies.map(policy => <MenuItem key={policy.id} value={policy.id}>{policy.label}</MenuItem>)}
            </CustomTextField>
          )}
        />
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
          <CustomTextField
            fullWidth
            required
            label={dictionary.fields.position}
            error={Boolean(errors.position_title)}
            helperText={errors.position_title?.message}
            {...register('position_title')}
          />
          <CustomTextField
            fullWidth
            required
            type='number'
            slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
            label={dictionary.fields.baseSalary}
            error={Boolean(errors.base_salary)}
            helperText={errors.base_salary?.message}
            {...register('base_salary')}
          />
          <Controller
            name='currency'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                fullWidth
                required
                label={dictionary.fields.currency}
                value={field.value || options.setup.currency_code || 'AFN'}
                error={Boolean(errors.currency)}
                helperText={errors.currency?.message}
              >
                <MenuItem value='AFN'>AFN</MenuItem>
                <MenuItem value='USD'>USD</MenuItem>
              </CustomTextField>
            )}
          />
          <LocalizedDateTimePicker
            fullWidth
            required
            locale={locale}
            label={dictionary.fields.startDate}
            slotProps={{ inputLabel: { shrink: true } }}
            error={Boolean(errors.start_date)}
            helperText={errors.start_date?.message}
            {...register('start_date')}
          />
          <LocalizedDateTimePicker
            fullWidth
            locale={locale}
            label={dictionary.fields.endDate}
            slotProps={{ inputLabel: { shrink: true } }}
            error={Boolean(errors.end_date)}
            helperText={errors.end_date?.message}
            {...register('end_date')}
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
              <MenuItem value='' disabled>
                {dictionary.placeholders.selectStatus}
              </MenuItem>
              {statusOptions.map(status => (
                <MenuItem key={status.id} value={status.id}>
                  {dictionary.status[status.value] || status.label}
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
        <div className='mt-auto flex justify-end gap-3 pt-4'>
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

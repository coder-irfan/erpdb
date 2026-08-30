'use client'

import { useEffect, useMemo } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createProject, updateProject } from '@/actions/projects'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import RichTextEditor from '@/components/forms/RichTextEditor'
import { createProjectSchema } from '@/schemas/projects'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency } from '@/utils/formatCurrency'

const defaultOption = options => options.find(option => option.is_default)?.id || options[0]?.id || ''

const emptyValues = options => ({
  title: '',
  description: '',
  client_id: '',
  contract_id: '',
  project_manager_id: '',
  status_id: defaultOption(options.statuses),
  priority_id: defaultOption(options.priorities),
  project_area: '',
  project_sponsor: '',
  estimated_hours: '0',
  actual_hours: '0',
  budget: '',
  currency: options.baseCurrency || 'AFN',
  exchange_rate: String(options.exchangeRate || '65'),
  start_date: toDateInputValue(new Date()),
  end_date: toDateInputValue(new Date()),
  actual_end_date: ''
})

const ProjectFormDrawer = ({ open, project, options, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createProjectSchema(dictionary.validation)),
    defaultValues: emptyValues(options)
  })
  const clientId = useWatch({ control, name: 'client_id' })
  const budget = useWatch({ control, name: 'budget' })
  const currency = useWatch({ control, name: 'currency' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })
  const baseAmount = useMemo(
    () => convertToBaseCurrency(budget, currency, exchangeRate, options.baseCurrency),
    [budget, currency, exchangeRate, options.baseCurrency]
  )
  const contracts = options.contracts.filter(contract => !clientId || contract.client_id === clientId)

  useEffect(() => {
    if (!open) return
    reset(
      project
        ? {
            title: project.title || '',
            description: project.description || '',
            client_id: project.client_id || '',
            contract_id: project.contract_id || '',
            project_manager_id: project.project_manager_id || '',
            status_id: project.status_id || defaultOption(options.statuses),
            priority_id: project.priority_id || defaultOption(options.priorities),
            project_area: project.project_area || '',
            project_sponsor: project.project_sponsor || '',
            estimated_hours: String(project.estimated_hours || '0'),
            actual_hours: String(project.actual_hours || '0'),
            budget: String(project.budget || ''),
            currency: project.currency || options.baseCurrency || 'AFN',
            exchange_rate: String(project.exchange_rate || options.exchangeRate || '65'),
            start_date: toDateInputValue(project.start_date),
            end_date: toDateInputValue(project.end_date),
            actual_end_date: toDateInputValue(project.actual_end_date)
          }
        : emptyValues(options)
    )
  }, [open, options, project, reset])

  const submit = async values => {
    const result = project
      ? await updateProject(project.id, { ...values, locale })
      : await createProject({ ...values, locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)
    toast.success(result.message)
    onClose()
    await onSaved(result.data?.id)
  }

  const field = (name, label, props = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field: input }) => (
        <CustomTextField
          {...input}
          {...props}
          value={input.value ?? ''}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message}
        />
      )}
    />
  )
  const select = (name, label, items, placeholder, allowEmpty = false) => (
    <Controller
      name={name}
      control={control}
      render={({ field: input }) => (
        <CustomTextField
          {...input}
          select
          value={input.value || ''}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message}
          slotProps={{
            select: {
              displayEmpty: true,
              renderValue: value => items.find(item => item.id === value)?.label || placeholder
            }
          }}
        >
          {allowEmpty && <MenuItem value=''>{placeholder}</MenuItem>}
          {items.map(item => (
            <MenuItem key={item.id} value={item.id}>
              {item.label}
            </MenuItem>
          ))}
        </CustomTextField>
      )}
    />
  )

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[720px]' }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{project ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form className='form-surface-scroll flex flex-1 flex-col gap-5 px-5' onSubmit={handleSubmit(submit)} noValidate>
        <FormSectionCards
          labels={[
            dictionary.tabs?.general || 'Project information',
            dictionary.tabs?.planning || 'Planning and ownership',
            dictionary.tabs?.financial || 'Financial terms'
          ]}
        >
          {field('title', dictionary.fields.title)}
          <Controller
            name='description'
            control={control}
            render={({ field: input }) => (
              <RichTextEditor
                className='sm:col-span-2'
                {...input}
                value={input.value || ''}
                label={dictionary.fields.description}
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
              />
            )}
          />
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <Controller
              name='client_id'
              control={control}
              render={({ field: input }) => (
                <Autocomplete
                  options={options.clients}
                  value={options.clients.find(client => client.id === input.value) || null}
                  onChange={(_, value) => input.onChange(value?.id || '')}
                  getOptionLabel={option => option.company_name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
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
            <Controller
              name='contract_id'
              control={control}
              render={({ field: input }) => (
                <Autocomplete
                  options={contracts}
                  value={contracts.find(contract => contract.id === input.value) || null}
                  onChange={(_, value) => input.onChange(value?.id || '')}
                  getOptionLabel={option => `${option.contract_number} · ${option.title}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      label={dictionary.fields.contract}
                      placeholder={dictionary.placeholders.contract}
                      error={Boolean(errors.contract_id)}
                      helperText={errors.contract_id?.message}
                    />
                  )}
                />
              )}
            />
            <Controller
              name='project_manager_id'
              control={control}
              render={({ field: input }) => (
                <Autocomplete
                  options={options.staff}
                  value={options.staff.find(staff => staff.id === input.value) || null}
                  onChange={(_, value) => input.onChange(value?.id || '')}
                  getOptionLabel={option => option.full_name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      label={dictionary.fields.manager}
                      placeholder={dictionary.placeholders.manager}
                      error={Boolean(errors.project_manager_id)}
                      helperText={errors.project_manager_id?.message}
                    />
                  )}
                />
              )}
            />
            {select('status_id', dictionary.fields.status, options.statuses, dictionary.placeholders.status)}
            {select('priority_id', dictionary.fields.priority, options.priorities, dictionary.placeholders.priority)}
            {field('estimated_hours', dictionary.fields.estimatedHours, {
              type: 'number',
              inputProps: { min: 0, step: '0.25' }
            })}
            {field('project_area', dictionary.fields.area)}
            {field('project_sponsor', dictionary.fields.sponsor)}
          </div>
          <div className='rounded border border-divider p-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              {field('budget', dictionary.fields.budget, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
              <Controller
                name='currency'
                control={control}
                render={({ field: input }) => (
                  <CustomTextField {...input} select label={dictionary.fields.currency}>
                    <MenuItem value='AFN'>AFN</MenuItem>
                    <MenuItem value='USD'>USD</MenuItem>
                  </CustomTextField>
                )}
              />
              {field('exchange_rate', dictionary.fields.exchangeRate, {
                type: 'number',
                inputProps: { min: 0.0001, step: '0.0001' }
              })}
            </div>
            <div className='mt-3 flex items-center justify-between rounded bg-actionHover px-4 py-3'>
              <Typography variant='body2' color='text.secondary'>
                {dictionary.form.basePreview.replace('{currency}', options.baseCurrency)}
              </Typography>
              <Typography className='font-semibold text-primary'>
                {formatCurrency(baseAmount, locale, options.baseCurrency)}
              </Typography>
            </div>
          </div>
          <div className={`grid grid-cols-1 gap-4 ${project ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {field('start_date', dictionary.fields.startDate, {
              type: 'date',
              slotProps: { inputLabel: { shrink: true } }
            })}
            {field('end_date', dictionary.fields.endDate, {
              type: 'date',
              slotProps: { inputLabel: { shrink: true } }
            })}
            {project &&
              field('actual_end_date', dictionary.fields.actualEndDate, {
                type: 'date',
                disabled: true,
                slotProps: { inputLabel: { shrink: true } }
              })}
          </div>
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 pt-5'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {project ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default ProjectFormDrawer

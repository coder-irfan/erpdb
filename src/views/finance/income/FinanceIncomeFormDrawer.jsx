'use client'

import { useEffect, useMemo } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createFinanceIncome, updateFinanceIncome } from '@/actions/financeIncome'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createFinanceIncomeSchema } from '@/schemas/financeIncome'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const defaultIncomeType = options =>
  options.incomeTypes.find(option => option.is_default)?.id || options.incomeTypes[0]?.id || ''

const emptyValues = options => ({
  name: '',
  client_id: '',
  project_id: '',
  contract_id: '',
  invoice_id: '',
  income_type_id: defaultIncomeType(options),
  total_amount: '',
  paid_amount: '0',
  currency: options.baseCurrency || 'AFN',
  exchange_rate: String(options.exchangeRate || '65'),
  received_by_id: options.currentStaffId || '',
  payment_method_id: options.paymentMethods.find(option => option.is_default)?.id || options.paymentMethods[0]?.id || '',
  payment_date: toDateInputValue(new Date()),
  notes: '',
  pay_details: '',
  remind_date: ''
})

const STATUS_COLORS = { PAID: 'success', PARTIAL: 'warning', PENDING: 'error' }

const FinanceIncomeFormDrawer = ({ open, income, options, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createFinanceIncomeSchema(dictionary.validation)),
    defaultValues: emptyValues(options)
  })

  const clientId = useWatch({ control, name: 'client_id' })
  const projectId = useWatch({ control, name: 'project_id' })
  const contractId = useWatch({ control, name: 'contract_id' })
  const invoiceId = useWatch({ control, name: 'invoice_id' })
  const incomeTypeId = useWatch({ control, name: 'income_type_id' })
  const totalAmount = useWatch({ control, name: 'total_amount' })
  const paidAmount = useWatch({ control, name: 'paid_amount' })
  const currency = useWatch({ control, name: 'currency' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })
  const total = toFiniteNumber(totalAmount)
  const paid = toFiniteNumber(paidAmount)
  const remaining = Math.max(0, total - paid)
  const derivedStatus = total > 0 && paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING'
  const selectedIncomeType = options.incomeTypes.find(option => option.id === incomeTypeId)
  const isClientIncome = Boolean(selectedIncomeType?.requires_invoice || invoiceId)

  const baseAmount = useMemo(
    () => convertToBaseCurrency(total, currency, exchangeRate, options.baseCurrency),
    [currency, exchangeRate, options.baseCurrency, total]
  )

  const totalUsd = currency === 'USD' ? total : toFiniteNumber(exchangeRate) > 0 ? total / toFiniteNumber(exchangeRate) : 0
  const projects = options.projects.filter(project => !clientId || project.client_id === clientId)
  const contracts = options.contracts.filter(contract => !clientId || contract.client_id === clientId)
  const invoices = options.invoices.filter(invoice => !clientId || invoice.client_id === clientId)

  useEffect(() => {
    if (!open) return

    reset(
      income
        ? {
            name: income.name || '',
            client_id: income.client_id || '',
            project_id: income.project_id || '',
            contract_id: income.contract_id || '',
            invoice_id: income.invoice_id || '',
            income_type_id: income.income_type_id || defaultIncomeType(options),
            total_amount: String(income.total_amount || ''),
            paid_amount: String(income.paid_amount || '0'),
            currency: income.currency || options.baseCurrency || 'AFN',
            exchange_rate: String(income.exchange_rate || options.exchangeRate || '65'),
            received_by_id: income.received_by_id || '',
            payment_method_id: income.payment_method_id || options.paymentMethods[0]?.id || '',
            payment_date: toDateInputValue(income.payment_date || income.created_at),
            notes: income.notes || '',
            pay_details: income.pay_details || '',
            remind_date: toDateInputValue(income.remind_date)
          }
        : emptyValues(options)
    )
  }, [income, open, options, reset])

  const submit = async values => {
    const type = options.incomeTypes.find(option => option.id === values.income_type_id)

    if (type?.requires_invoice && !values.invoice_id) {
      setError('invoice_id', { type: 'manual', message: dictionary.validation.invoiceRequired })

      return
    }

    const result = income
      ? await updateFinanceIncome(income.id, { ...values, locale })
      : await createFinanceIncome({ ...values, locale })

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

  const relationField = (name, label, items, placeholder, getLabel, onSelected, getDisabled, disabled = false) => (
    <Controller
      name={name}
      control={control}
      render={({ field: controllerField }) => (
        <Autocomplete
          options={items}
          disabled={disabled}
          value={items.find(item => item.id === controllerField.value) || null}
          onChange={(_, value) => {
            controllerField.onChange(value?.id || '')
            onSelected?.(value)
          }}
          getOptionLabel={getLabel}
          getOptionDisabled={getDisabled}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={params => (
            <CustomTextField
              {...params}
              label={label}
              placeholder={placeholder}
              error={Boolean(errors[name])}
              helperText={errors[name]?.message}
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
      slotProps={{ paper: { className: 'is-full sm:is-[700px]' } }}
    >
      <div className='flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{income ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form className='flex flex-1 flex-col gap-5 overflow-y-auto p-5' onSubmit={handleSubmit(submit)} noValidate>
        {field('name', dictionary.fields.name)}

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {isClientIncome && relationField(
            'client_id',
            dictionary.fields.client,
            options.clients,
            dictionary.placeholders.client,
            item => item.company_name,
            value => {
              if (!value) return
              const selectedProject = options.projects.find(item => item.id === projectId)
              const selectedContract = options.contracts.find(item => item.id === contractId)
              const selectedInvoice = options.invoices.find(item => item.id === invoiceId)

              if (selectedProject && selectedProject.client_id !== value.id) setValue('project_id', '')
              if (selectedContract && selectedContract.client_id !== value.id) setValue('contract_id', '')
              if (selectedInvoice && selectedInvoice.client_id !== value.id) setValue('invoice_id', '')
            },
            undefined,
            Boolean(invoiceId)
          )}
          <Controller
            name='income_type_id'
            control={control}
            render={({ field: controllerField }) => (
              <CustomTextField
                {...controllerField}
                select
                onChange={event => {
                  controllerField.onChange(event)
                  const nextType = options.incomeTypes.find(item => item.id === event.target.value)

                  if (nextType?.requires_invoice) {
                    setError('invoice_id', { type: 'manual', message: dictionary.validation.invoiceRequired })
                  }
                }}
                value={controllerField.value || ''}
                label={dictionary.fields.incomeType}
                error={Boolean(errors.income_type_id)}
                helperText={errors.income_type_id?.message}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected => options.incomeTypes.find(item => item.id === selected)?.label || dictionary.placeholders.incomeType
                  }
                }}
              >
                <MenuItem value='' disabled>{dictionary.placeholders.incomeType}</MenuItem>
                {options.incomeTypes.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
              </CustomTextField>
            )}
          />
          {isClientIncome && relationField(
            'project_id',
            dictionary.fields.project,
            projects,
            dictionary.placeholders.project,
            item => `${item.project_code} · ${item.title}`,
            value => value && setValue('client_id', value.client_id),
            undefined,
            Boolean(invoiceId)
          )}
          {isClientIncome && relationField(
            'contract_id',
            dictionary.fields.contract,
            contracts,
            dictionary.placeholders.contract,
            item => `${item.contract_number} · ${item.title}`,
            value => value && setValue('client_id', value.client_id),
            undefined,
            Boolean(invoiceId)
          )}
          {relationField(
            'invoice_id',
            dictionary.fields.invoice,
            invoices,
            dictionary.placeholders.invoice,
            item => item.invoice_number,
            value => {
              if (!value) {
                setValue('client_id', '')
                setValue('contract_id', '')
                setValue('project_id', '')

                return
              }

              setValue('client_id', value.client_id)
              setValue('contract_id', value.contract_id)
              setValue('project_id', value.project_id || '')
              const outstanding = Number(value.remaining_balance) > 0 ? value.remaining_balance : value.amount

              setValue('total_amount', String(outstanding || ''))
              setValue('paid_amount', String(outstanding || ''))
              setValue('currency', value.currency || options.baseCurrency || 'AFN')
              setValue('exchange_rate', String(value.exchange_rate || options.exchangeRate || '65'))
            },
            item => item.id !== income?.invoice_id && (Number(item.remaining_balance) <= 0.005 || !item.project_id)
          )}
          {relationField(
            'received_by_id',
            dictionary.fields.receivedBy,
            options.staff,
            dictionary.placeholders.receivedBy,
            item => `${item.full_name} · ${item.position}`
          )}
          {relationField(
            'payment_method_id',
            dictionary.fields.paymentMethod,
            options.paymentMethods,
            dictionary.placeholders.paymentMethod,
            item => item.label
          )}
          {field('payment_date', dictionary.fields.paymentDate, {
            type: 'date',
            slotProps: { inputLabel: { shrink: true } }
          })}
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {field('total_amount', dictionary.fields.totalAmount, { type: 'number', inputProps: { min: 0, step: '0.01', readOnly: Boolean(invoiceId) } })}
          {field('paid_amount', dictionary.fields.paidAmount, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
          <Controller
            name='currency'
            control={control}
            render={({ field: controllerField }) => (
              <CustomTextField {...controllerField} select disabled={Boolean(invoiceId)} value={controllerField.value || options.baseCurrency || 'AFN'} label={dictionary.fields.currency} error={Boolean(errors.currency)} helperText={errors.currency?.message}>
                <MenuItem value='AFN'>AFN</MenuItem>
                <MenuItem value='USD'>USD</MenuItem>
              </CustomTextField>
            )}
          />
          {field('exchange_rate', dictionary.fields.exchangeRate, { type: 'number', inputProps: { min: 0, step: '0.0001', readOnly: Boolean(invoiceId) } })}
        </div>

        <Card variant='outlined'>
          <CardContent>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <Typography variant='h6'>{dictionary.form.paymentPreview}</Typography>
              <Chip size='small' variant='tonal' color={STATUS_COLORS[derivedStatus]} label={dictionary.status[derivedStatus]} />
            </div>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.fields.remainingAmount}</Typography><Typography className='font-semibold'>{formatCurrency(remaining, locale, currency)}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.form.basePreview.replace('{currency}', options.baseCurrency)}</Typography><Typography className='font-semibold text-success'>{formatCurrency(baseAmount, locale, options.baseCurrency)}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.form.usdPreview}</Typography><Typography className='font-semibold'>{formatCurrency(totalUsd, locale, 'USD')}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.form.derivedStatus}</Typography><Typography className='font-semibold'>{dictionary.status[derivedStatus]}</Typography></div>
            </div>
          </CardContent>
        </Card>

        {remaining > 0.005 && field('remind_date', dictionary.fields.reminderDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
        {field('notes', dictionary.fields.notes, {
          multiline: true,
          minRows: 2,
          placeholder: dictionary.placeholders.notes
        })}
        {field('pay_details', dictionary.fields.paymentDetails, {
          multiline: true,
          minRows: 3,
          placeholder: dictionary.placeholders.paymentDetails
        })}

        <div className='mt-auto flex justify-end gap-3 pt-4'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {income ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default FinanceIncomeFormDrawer

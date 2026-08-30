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
import { createInvoice, updateInvoice } from '@/actions/invoices'
import DateDurationHelper from '@/components/contracts/DateDurationHelper'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import { createInvoiceSchema } from '@/schemas/invoices'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const addDays = (value, days) => {
  const date = new Date(`${value}T00:00:00.000Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return toDateInputValue(date)
}

const defaultStatus = statuses =>
  statuses.find(status => status.value === 'UNPAID')?.id ||
  statuses.find(status => status.is_default)?.id ||
  statuses.find(status => status.value !== 'PAID')?.id ||
  ''

const emptyValues = options => {
  const issuedDate = toDateInputValue(new Date())

  return {
    contract_id: '',
    client_id: '',
    amount: '',
    currency: options.baseCurrency || 'AFN',
    exchange_rate: String(options.exchangeRate || '65'),
    issued_date: issuedDate,
    due_date: addDays(issuedDate, 30),
    status_id: defaultStatus(options.statuses)
  }
}

const InvoiceFormDrawer = ({ open, invoice, options, locale, dictionary, onClose, onSaved }) => {
  const hasPayments = Boolean(
    invoice?.payment_incomes?.length ||
      invoice?.payment_income ||
      ['PAID', 'PARTIALLY_PAID'].includes(invoice?.status.value)
  )

  const contractOptions = useMemo(() => {
    if (!invoice || options.contracts.some(contract => contract.id === invoice.contract_id)) return options.contracts

    return [
      ...options.contracts,
      {
        ...invoice.contract,
        client_id: invoice.client_id,
        client: invoice.client
      }
    ]
  }, [invoice, options.contracts])

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createInvoiceSchema(dictionary.validation)),
    defaultValues: emptyValues(options)
  })

  const amount = useWatch({ control, name: 'amount' })
  const currency = useWatch({ control, name: 'currency' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })
  const issuedDate = useWatch({ control, name: 'issued_date' })
  const dueDate = useWatch({ control, name: 'due_date' })
  const selectedClientId = useWatch({ control, name: 'client_id' })

  const client =
    options.clients.find(item => item.id === selectedClientId) ||
    (invoice?.client_id === selectedClientId ? invoice.client : null)

  const amountBase = useMemo(
    () => convertToBaseCurrency(toFiniteNumber(amount), currency, toFiniteNumber(exchangeRate), options.baseCurrency),
    [amount, currency, exchangeRate, options.baseCurrency]
  )

  useEffect(() => {
    if (!open) return

    const resetValues = invoice
      ? {
          contract_id: invoice.contract_id || '',
          client_id: invoice.client_id || '',
          amount: String(invoice.amount || ''),
          currency: invoice.currency || options.baseCurrency || 'AFN',
          exchange_rate: String(invoice.exchange_rate || options.exchangeRate || '65'),
          issued_date: toDateInputValue(invoice.issued_date),
          due_date: toDateInputValue(invoice.due_date),
          status_id: invoice.status_id || defaultStatus(options.statuses)
        }
      : emptyValues(options)

    reset(resetValues)
  }, [invoice, open, options, reset])

  const selectContract = contract => {
    setValue('contract_id', contract?.id || '', { shouldValidate: true })
    setValue('client_id', contract?.client_id || '', { shouldValidate: true })

    if (contract) {
      setValue('amount', String(contract.total_amount), { shouldValidate: true })
      setValue('currency', contract.currency || options.baseCurrency, { shouldValidate: true })
      setValue('exchange_rate', String(contract.exchange_rate || options.exchangeRate), { shouldValidate: true })
    }
  }

  const submit = async values => {
    const result = invoice
      ? await updateInvoice(invoice.id, { ...values, locale })
      : await createInvoice({ ...values, locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)
    toast.success(result.message)
    onClose()
    await onSaved()
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

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      PaperProps={{ className: 'is-full sm:is-[620px]' }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{invoice ? dictionary.form.editTitle : dictionary.form.createTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form onSubmit={handleSubmit(submit)} className='form-surface-scroll flex flex-1 flex-col gap-5 p-5' noValidate>
        <FormSectionCards
          labels={[
            dictionary.tabs?.general || 'Invoice information',
            dictionary.tabs?.financial || 'Amounts and status'
          ]}
        >
          <Controller
            name='contract_id'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={contractOptions}
                value={contractOptions.find(contract => contract.id === field.value) || null}
                disabled={hasPayments}
                onChange={(_, value) => selectContract(value)}
                getOptionLabel={option => `${option.contract_number} — ${option.title}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <div>
                      <Typography variant='body2'>
                        {option.contract_number} — {option.title}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {option.client.company_name}
                      </Typography>
                    </div>
                  </li>
                )}
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
          <CustomTextField
            label={dictionary.fields.client}
            value={client?.company_name || ''}
            disabled
            helperText={client ? client.email : dictionary.form.selectContractHelp}
          />
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            {field('amount', dictionary.fields.amount, {
              type: 'number',
              disabled: hasPayments,
              inputProps: { min: 0, step: '0.01' }
            })}
            <Controller
              name='currency'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  select
                  disabled={hasPayments}
                  value={field.value || options.baseCurrency || 'AFN'}
                  label={dictionary.fields.currency}
                  error={Boolean(errors.currency)}
                  helperText={errors.currency?.message}
                >
                  <MenuItem value='AFN'>AFN</MenuItem>
                  <MenuItem value='USD'>USD</MenuItem>
                </CustomTextField>
              )}
            />
            {field('exchange_rate', dictionary.fields.exchangeRate, {
              type: 'number',
              disabled: hasPayments,
              inputProps: { min: 0, step: '0.0001' }
            })}
          </div>
          <div className='rounded border border-divider bg-actionHover p-4'>
            <Typography variant='caption' color='text.secondary'>
              {dictionary.form.baseAmount.replace('{currency}', options.baseCurrency)}
            </Typography>
            <Typography variant='h6'>{formatCurrency(amountBase, locale, options.baseCurrency)}</Typography>
          </div>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {field('issued_date', dictionary.fields.issueDate, {
              type: 'date',
              slotProps: { inputLabel: { shrink: true } }
            })}
            <div className='flex flex-col gap-2'>
              {field('due_date', dictionary.fields.dueDate, {
                type: 'date',
                slotProps: { inputLabel: { shrink: true } }
              })}
              <DateDurationHelper
                startDate={issuedDate}
                endDate={dueDate}
                durationOptions={options.durationOptions || []}
                onEndDateChange={value => setValue('due_date', value, { shouldDirty: true, shouldValidate: true })}
              />
            </div>
          </div>
          <Controller
            name='status_id'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                disabled={hasPayments}
                value={field.value || defaultStatus(options.statuses)}
                label={dictionary.fields.status}
                error={Boolean(errors.status_id)}
                helperText={errors.status_id?.message}
              >
                {options.statuses
                  .filter(
                    status => !['PAID', 'PARTIALLY_PAID'].includes(status.value) || status.id === invoice?.status_id
                  )
                  .map(status => (
                    <MenuItem key={status.id} value={status.id}>
                      {status.label}
                    </MenuItem>
                  ))}
              </CustomTextField>
            )}
          />
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 pt-5'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting || !selectedClientId}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {invoice ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default InvoiceFormDrawer

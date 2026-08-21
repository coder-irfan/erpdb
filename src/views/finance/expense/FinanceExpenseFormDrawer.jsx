'use client'

import { useEffect, useMemo } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { createFinanceExpense, updateFinanceExpense } from '@/actions/financeExpense'
import FileUpload from '@/components/common/FileUpload'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createFinanceExpenseSchema } from '@/schemas/financeExpense'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const defaultExpenseType = options =>
  options.expenseTypes.find(option => option.is_default)?.id || options.expenseTypes[0]?.id || ''

const emptyValues = options => ({
  details: '',
  expense_type_id: defaultExpenseType(options),
  project_id: '',
  spent_by_id: '',
  payment_method_id: '',
  expense_date: toDateInputValue(new Date()),
  quantity: '1',
  unit_price: '',
  currency: options.baseCurrency || 'AFN',
  exchange_rate: String(options.exchangeRate || '65'),
  receipt_url: ''
})

const FinanceExpenseFormDrawer = ({ open, expense, options, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createFinanceExpenseSchema(dictionary.validation)),
    defaultValues: emptyValues(options)
  })

  const quantity = useWatch({ control, name: 'quantity' })
  const unitPrice = useWatch({ control, name: 'unit_price' })
  const currency = useWatch({ control, name: 'currency' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })
  const subTotal = Math.max(0, Number.parseInt(quantity, 10) || 0) * Math.max(0, toFiniteNumber(unitPrice))

  const amountBase = useMemo(
    () => convertToBaseCurrency(subTotal, currency, exchangeRate, options.baseCurrency),
    [currency, exchangeRate, options.baseCurrency, subTotal]
  )

  const totalUsd = currency === 'USD' ? subTotal : toFiniteNumber(exchangeRate) > 0 ? subTotal / toFiniteNumber(exchangeRate) : 0

  useEffect(() => {
    if (!open) return

    reset(
      expense
        ? {
            details: expense.details || '',
            expense_type_id: expense.expense_type_id || defaultExpenseType(options),
            project_id: expense.project_id || '',
            spent_by_id: expense.spent_by_id || '',
            payment_method_id: expense.payment_method_id || '',
            expense_date: toDateInputValue(expense.expense_date),
            quantity: String(expense.quantity || '1'),
            unit_price: String(expense.unit_price || ''),
            currency: expense.currency || options.baseCurrency || 'AFN',
            exchange_rate: String(expense.exchange_rate || options.exchangeRate || '65'),
            receipt_url: expense.receipt_url || ''
          }
        : emptyValues(options)
    )
  }, [expense, open, options, reset])

  const submit = async values => {
    const result = expense
      ? await updateFinanceExpense(expense.id, { ...values, locale })
      : await createFinanceExpense({ ...values, locale })

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

  const relationField = (name, label, items, placeholder, getLabel) => (
    <Controller
      name={name}
      control={control}
      render={({ field: controllerField }) => (
        <Autocomplete
          options={items}
          value={items.find(item => item.id === controllerField.value) || null}
          onChange={(_, value) => controllerField.onChange(value?.id || '')}
          getOptionLabel={getLabel}
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
          <Typography variant='h5'>{expense ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting} aria-label={dictionary.actions.close}><i className='tabler-x' /></IconButton>
      </div>
      <form className='flex flex-1 flex-col gap-5 overflow-y-auto p-5' onSubmit={handleSubmit(submit)} noValidate>
        {field('details', dictionary.fields.details, {
          multiline: true,
          minRows: 3,
          placeholder: dictionary.placeholders.details
        })}

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Controller
            name='expense_type_id'
            control={control}
            render={({ field: controllerField }) => (
              <CustomTextField
                {...controllerField}
                select
                value={controllerField.value || ''}
                label={dictionary.fields.expenseType}
                error={Boolean(errors.expense_type_id)}
                helperText={errors.expense_type_id?.message}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected => options.expenseTypes.find(item => item.id === selected)?.label || dictionary.placeholders.expenseType
                  }
                }}
              >
                <MenuItem value='' disabled>{dictionary.placeholders.expenseType}</MenuItem>
                {options.expenseTypes.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
              </CustomTextField>
            )}
          />
          {field('expense_date', dictionary.fields.expenseDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
          {relationField('project_id', dictionary.fields.project, options.projects, dictionary.placeholders.project, item => `${item.project_code} · ${item.title}`)}
          {relationField('spent_by_id', dictionary.fields.spentBy, options.staff, dictionary.placeholders.spentBy, item => `${item.full_name} · ${item.position}`)}
          <Controller
            name='payment_method_id'
            control={control}
            render={({ field: controllerField }) => (
              <CustomTextField
                {...controllerField}
                select
                value={controllerField.value || ''}
                label={dictionary.fields.paymentMethod}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: selected =>
                      options.paymentMethods.find(item => item.id === selected)?.label || dictionary.placeholders.paymentMethod
                  }
                }}
              >
                <MenuItem value=''>{dictionary.placeholders.paymentMethod}</MenuItem>
                {options.paymentMethods.map(item => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
              </CustomTextField>
            )}
          />
          {field('quantity', dictionary.fields.quantity, { type: 'number', inputProps: { min: 1, step: 1 } })}
          {field('unit_price', dictionary.fields.unitPrice, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
          <Controller
            name='currency'
            control={control}
            render={({ field: controllerField }) => (
              <CustomTextField {...controllerField} select value={controllerField.value || options.baseCurrency || 'AFN'} label={dictionary.fields.currency} error={Boolean(errors.currency)} helperText={errors.currency?.message}>
                <MenuItem value='AFN'>AFN</MenuItem>
                <MenuItem value='USD'>USD</MenuItem>
              </CustomTextField>
            )}
          />
          {field('exchange_rate', dictionary.fields.exchangeRate, { type: 'number', inputProps: { min: 0, step: '0.0001' } })}
        </div>

        <Card variant='outlined'>
          <CardContent>
            <Typography variant='h6' className='mb-3'>{dictionary.form.calculation}</Typography>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.form.subtotalPreview}</Typography><Typography className='font-semibold text-error'>{formatCurrency(subTotal, locale, currency)}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.form.basePreview.replace('{currency}', options.baseCurrency)}</Typography><Typography className='font-semibold'>{formatCurrency(amountBase, locale, options.baseCurrency)}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.form.usdPreview}</Typography><Typography className='font-semibold'>{formatCurrency(totalUsd, locale, 'USD')}</Typography></div>
            </div>
          </CardContent>
        </Card>

        <Controller
          name='receipt_url'
          control={control}
          render={({ field: controllerField }) => (
            <FileUpload
              compact
              value={controllerField.value || ''}
              onChange={value => controllerField.onChange(value || '')}
              label={dictionary.fields.receipt}
              maxSizeMB={4}
              uploadType='image'
              translations={dictionary.upload}
            />
          )}
        />
        {errors.receipt_url && <Typography variant='caption' color='error'>{errors.receipt_url.message}</Typography>}

        <div className='mt-auto flex justify-end gap-3 pt-4'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {expense ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default FinanceExpenseFormDrawer

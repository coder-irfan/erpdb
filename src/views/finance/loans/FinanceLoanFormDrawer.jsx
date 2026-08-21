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
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { createFinanceLoanSchema } from '@/schemas/financeLoan'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const emptyValues = options => ({ loan_type: 'STAFF', staff_id: '', entity_name: '', total_amount: '', monthly_deduction: '', currency: options.baseCurrency || 'AFN', exchange_rate: String(options.exchangeRate || '65'), issue_date: toDateInputValue(new Date()), reason: '' })

const FinanceLoanFormDrawer = ({ open, options, locale, dictionary, onClose, onSaved }) => {
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: valibotResolver(createFinanceLoanSchema(dictionary.validation)), defaultValues: emptyValues(options) })
  const loanType = useWatch({ control, name: 'loan_type' })
  const totalAmount = useWatch({ control, name: 'total_amount' })
  const currency = useWatch({ control, name: 'currency' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })
  const amountBase = useMemo(() => convertToBaseCurrency(totalAmount, currency, exchangeRate, 'USD'), [currency, exchangeRate, totalAmount])

  useEffect(() => { if (open) reset(emptyValues(options)) }, [open, options, reset])

  const submit = async values => {
    const response = await fetch('/api/finance/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, locale }) })
    const result = await response.json()

    if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

    toast.success(result.message)
    onClose()
    await onSaved()
  }

  const field = (name, label, props = {}) => <Controller name={name} control={control} render={({ field: controllerField }) => <CustomTextField {...controllerField} {...props} value={controllerField.value ?? ''} label={label} error={Boolean(errors[name])} helperText={errors[name]?.message} />} />

  return <Drawer anchor='right' open={open} onClose={isSubmitting ? undefined : onClose} slotProps={{ paper: { className: 'is-full sm:is-[680px]' } }}>
    <div className='flex items-start justify-between gap-4 border-be border-divider p-5'><div><Typography variant='h5'>{dictionary.form.title}</Typography><Typography color='text.secondary'>{dictionary.form.description}</Typography></div><IconButton onClick={onClose} disabled={isSubmitting}><i className='tabler-x' /></IconButton></div>
    <form className='flex flex-1 flex-col gap-5 overflow-y-auto p-5' onSubmit={handleSubmit(submit)} noValidate>
      <Controller name='loan_type' control={control} render={({ field }) => <ToggleButtonGroup exclusive fullWidth value={field.value} onChange={(_, value) => { if (value) field.onChange(value) }}><ToggleButton value='STAFF'><i className='tabler-user mie-2' />{dictionary.types.STAFF}</ToggleButton><ToggleButton value='EXTERNAL'><i className='tabler-building mie-2' />{dictionary.types.EXTERNAL}</ToggleButton><ToggleButton value='BANK'><i className='tabler-building-bank mie-2' />{dictionary.types.BANK}</ToggleButton></ToggleButtonGroup>} />
      {loanType === 'STAFF' ? <Controller name='staff_id' control={control} render={({ field }) => <Autocomplete options={options.staff} value={options.staff.find(item => item.id === field.value) || null} onChange={(_, value) => field.onChange(value?.id || '')} getOptionLabel={item => `${item.full_name} · ${item.position}`} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={params => <CustomTextField {...params} label={dictionary.fields.staff} error={Boolean(errors.staff_id)} helperText={errors.staff_id?.message} />} />} /> : field('entity_name', dictionary.fields.entity)}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {field('total_amount', dictionary.fields.total, { type: 'number', inputProps: { min: 0.01, step: '0.01' } })}
        {field('monthly_deduction', dictionary.fields.monthly, { type: 'number', inputProps: { min: 0.01, step: '0.01' } })}
        <Controller name='currency' control={control} render={({ field }) => <CustomTextField {...field} select label={dictionary.fields.currency}><MenuItem value='AFN'>AFN</MenuItem><MenuItem value='USD'>USD</MenuItem></CustomTextField>} />
        {field('exchange_rate', dictionary.fields.exchangeRate, { type: 'number', inputProps: { min: 0.0001, step: '0.0001' } })}
        {field('issue_date', dictionary.fields.issueDate, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
      </div>
      {field('reason', dictionary.fields.reason, { multiline: true, minRows: 3 })}
      <Card variant='outlined'><CardContent><Typography variant='h6' className='mb-3'>{dictionary.form.calculation}</Typography><div className='grid grid-cols-2 gap-4'><div><Typography variant='caption' color='text.secondary'>{dictionary.fields.total}</Typography><Typography className='font-semibold'>{formatCurrency(toFiniteNumber(totalAmount), locale, currency)}</Typography></div><div><Typography variant='caption' color='text.secondary'>{dictionary.fields.amountBase}</Typography><Typography className='font-semibold text-primary'>{formatCurrency(amountBase, locale, 'USD')}</Typography></div></div></CardContent></Card>
      <div className='mt-auto flex justify-end gap-3'><Button variant='tonal' color='secondary' disabled={isSubmitting} onClick={onClose}>{dictionary.actions.cancel}</Button><Button type='submit' variant='contained' disabled={isSubmitting}><LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>{dictionary.actions.create}</LoadingButtonContent></Button></div>
    </form>
  </Drawer>
}

export default FinanceLoanFormDrawer

'use client'

import { useEffect, useMemo } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
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
import { updateFinanceSalary } from '@/actions/financeSalary'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import { financeSalaryAdjustmentSchema } from '@/schemas/financeSalary'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const valuesFor = salary => ({
  worked_days: String(salary?.worked_days ?? 0),
  off_days: String(salary?.off_days ?? 0),
  bonus_amount: String(salary?.bonus_amount ?? 0),
  loan_deduction: String(salary?.loan_deduction ?? 0),
  timesheet_summary: salary?.timesheet_summary || '',
  currency: salary?.currency || 'AFN',
  exchange_rate: String(salary?.exchange_rate || '65')
})

const FinanceSalaryAdjustmentDrawer = ({ open, salary, baseCurrency, locale, dictionary, onClose, onSaved }) => {
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: valibotResolver(financeSalaryAdjustmentSchema(dictionary.validation)), defaultValues: valuesFor(salary) })
  const workedDays = useWatch({ control, name: 'worked_days' })
  const bonus = useWatch({ control, name: 'bonus_amount' })
  const deduction = useWatch({ control, name: 'loan_deduction' })
  const currency = useWatch({ control, name: 'currency' })
  const rate = useWatch({ control, name: 'exchange_rate' })

  useEffect(() => { if (open) reset(valuesFor(salary)) }, [open, reset, salary])

  const calculation = useMemo(() => {
    const totalDays = salary?.total_month_days || 1
    const baseSalary = toFiniteNumber(salary?.base_salary)
    const dailyRate = baseSalary / totalDays
    const earned = dailyRate * Math.max(0, toFiniteNumber(workedDays))
    const payable = Math.max(0, earned + toFiniteNumber(bonus) - toFiniteNumber(deduction))

    return { dailyRate, earned, payable, base: convertToBaseCurrency(payable, currency, rate, baseCurrency) }
  }, [baseCurrency, bonus, currency, deduction, rate, salary, workedDays])

  const submit = async values => {
    const result = await updateFinanceSalary(salary.id, { ...values, locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.operationFailed)

    toast.success(result.message)
    onClose()
    await onSaved()
  }

  const field = (name, label, props = {}) => <Controller name={name} control={control} render={({ field: controllerField }) => <CustomTextField {...controllerField} {...props} value={controllerField.value ?? ''} label={label} error={Boolean(errors[name])} helperText={errors[name]?.message} />} />

  return (
    <Drawer anchor='right' open={open} onClose={isSubmitting ? undefined : onClose} slotProps={{ paper: { className: 'is-full sm:is-[620px]' } }}>
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div><Typography variant='h5'>{dictionary.form.title}</Typography><Typography color='text.secondary'>{salary?.staff?.full_name}</Typography></div>
        <IconButton onClick={onClose} disabled={isSubmitting} aria-label={dictionary.actions.close}><i className='tabler-x' /></IconButton>
      </div>
      <form className='form-surface-scroll flex flex-1 flex-col gap-5 p-5' onSubmit={handleSubmit(submit)} noValidate>
        <FormSectionCards labels={[dictionary.tabs?.general || 'Salary adjustment']}>
        <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {field('worked_days', dictionary.fields.workedDays, { type: 'number', inputProps: { min: 0, max: salary?.total_month_days, step: 0.5 } })}
          {field('off_days', dictionary.fields.offDays, { type: 'number', inputProps: { min: 0, max: salary?.total_month_days, step: 0.5 } })}
          {field('bonus_amount', dictionary.fields.bonus, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
          {field('loan_deduction', dictionary.fields.loanDeduction, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
          <Controller name='currency' control={control} render={({ field: controllerField }) => <CustomTextField {...controllerField} select label={dictionary.fields.currency} error={Boolean(errors.currency)} helperText={errors.currency?.message}><MenuItem value='AFN'>AFN</MenuItem><MenuItem value='USD'>USD</MenuItem></CustomTextField>} />
          {field('exchange_rate', dictionary.fields.exchangeRate, { type: 'number', inputProps: { min: 0.0001, step: '0.0001' } })}
        </div>
        {field('timesheet_summary', dictionary.fields.notes, { multiline: true, minRows: 3 })}
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='h6' className='mb-4'>{dictionary.form.liveCalculation}</Typography>
            <div className='grid grid-cols-2 gap-4'>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.fields.dailyRate}</Typography><Typography className='font-semibold'>{formatCurrency(calculation.dailyRate, locale, currency)}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.fields.earnedSalary}</Typography><Typography className='font-semibold'>{formatCurrency(calculation.earned, locale, currency)}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.fields.payableAmount}</Typography><Typography className='font-semibold text-primary'>{formatCurrency(calculation.payable, locale, currency)}</Typography></div>
              <div><Typography variant='caption' color='text.secondary'>{dictionary.fields.baseAmount}</Typography><Typography className='font-semibold'>{formatCurrency(calculation.base, locale, baseCurrency)}</Typography></div>
            </div>
          </CardContent>
        </Card>
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 py-3'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}><LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>{dictionary.actions.save}</LoadingButtonContent></Button>
        </div>
      </form>
    </Drawer>
  )
}

export default FinanceSalaryAdjustmentDrawer

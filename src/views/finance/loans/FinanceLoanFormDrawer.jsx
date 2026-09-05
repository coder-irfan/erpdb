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
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import { createFinanceLoanSchema } from '@/schemas/financeLoan'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'
import { addUtcMonths, calculateAmortizationSchedule } from '@/utils/loanCalculations'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'

const emptyValues = (options, loanType = 'STAFF') => {
  const issueDate = new Date()

  return {
    loan_type: loanType,
    staff_id: '',
    entity_name: '',
    lender_type: 'BANK',
    total_amount: '',

    // Corporate loans calculate their own payment, but the shared schema still
    // needs a valid value for this staff-only field.
    monthly_deduction: '1',
    currency: options.baseCurrency || 'AFN',
    exchange_rate: String(options.exchangeRate || '65'),
    issue_date: toDateInputValue(issueDate),
    repayment_start_date: toDateInputValue(addUtcMonths(issueDate, 1)),
    auto_deduct: true,
    annual_interest_rate: '0',
    tenure_months: '12',
    disbursement_bank_account: '',
    reason: ''
  }
}

const FinanceLoanFormDrawer = ({ open, initialLoanType = 'STAFF', options, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createFinanceLoanSchema(dictionary.validation)),
    defaultValues: emptyValues(options, initialLoanType)
  })

  const loanType = useWatch({ control, name: 'loan_type' })
  const totalAmount = useWatch({ control, name: 'total_amount' })
  const currency = useWatch({ control, name: 'currency' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })
  const interestRate = useWatch({ control, name: 'annual_interest_rate' })
  const tenureMonths = useWatch({ control, name: 'tenure_months' })
  const issueDate = useWatch({ control, name: 'issue_date' })
  const repaymentStartDate = useWatch({ control, name: 'repayment_start_date' })

  const amountBase = useMemo(
    () => convertToBaseCurrency(totalAmount, currency, exchangeRate, 'AFN'),
    [currency, exchangeRate, totalAmount]
  )

  const amortization = useMemo(
    () =>
      calculateAmortizationSchedule({
        principal: totalAmount,
        annualInterestRate: interestRate,
        tenureMonths,
        issueDate,
        repaymentStartDate
      }),
    [interestRate, issueDate, repaymentStartDate, tenureMonths, totalAmount]
  )

  useEffect(() => {
    if (open) reset(emptyValues(options, initialLoanType))
  }, [initialLoanType, open, options, reset])

  useEffect(() => {
    if (!issueDate) return

    const nextStartDate = addUtcMonths(issueDate, 1)

    if (!Number.isNaN(nextStartDate.getTime())) {
      setValue('repayment_start_date', toDateInputValue(nextStartDate))
    }
  }, [issueDate, setValue])

  const submit = async values => {
    try {
      const response = await fetch('/api/finance/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      onClose()
      await onSaved()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    }
  }

  const submitInvalid = formErrors => {
    const firstError = Object.values(formErrors).find(error => error?.message)

    toast.error(firstError?.message || dictionary.messages.operationFailed)
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

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      slotProps={{ paper: { className: 'is-full sm:is-[680px]' } }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{dictionary.form.title}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form
        className='form-surface-scroll flex flex-1 flex-col gap-5 px-5 pt-5'
        onSubmit={handleSubmit(submit, submitInvalid)}
        noValidate
      >
        <FormSectionCards
          labels={[
            dictionary.tabs?.general || 'Loan information',
            dictionary.tabs?.terms || 'Repayment terms',
            dictionary.tabs?.schedule || 'Repayment schedule'
          ]}
        >
          <div className='rounded border border-primary/30 bg-primaryLighter p-4'>
            <Typography variant='h6'>
              {loanType === 'STAFF' ? 'Staff Loan & Salary Advance' : 'Corporate Debt & Liability'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {loanType === 'STAFF' ? 'Company \u2192 employee receivable' : 'Lender \u2192 company payable'}
            </Typography>
          </div>
          {loanType === 'STAFF' ? (
            <Controller
              name='staff_id'
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={options.staff}
                  value={options.staff.find(item => item.id === field.value) || null}
                  onChange={(_, value) => field.onChange(value?.id || '')}
                  getOptionLabel={item => `${item.full_name} · ${item.position}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      label={dictionary.fields.staff}
                      error={Boolean(errors.staff_id)}
                      helperText={errors.staff_id?.message}
                    />
                  )}
                />
              )}
            />
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {field('entity_name', 'Lender Name / Entity')}
              <Controller
                name='lender_type'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select label='Lender Type'>
                    <MenuItem value='BANK'>Bank</MenuItem>
                    <MenuItem value='EXTERNAL_BUSINESS'>External Business</MenuItem>
                    <MenuItem value='OWNER'>Director / Owner Loan</MenuItem>
                  </CustomTextField>
                )}
              />
            </div>
          )}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {field('total_amount', dictionary.fields.total, {
              type: 'number',
              inputProps: { min: 0.01, step: '0.01' }
            })}
            {loanType === 'STAFF' &&
              field('monthly_deduction', dictionary.fields.monthly, {
                type: 'number',
                inputProps: { min: 0.01, step: '0.01' }
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
              inputProps: { min: 0.0001, step: '0.0001' }
            })}
            {field('issue_date', dictionary.fields.issueDate, {
              type: 'date',
              slotProps: { inputLabel: { shrink: true } }
            })}
            {field('repayment_start_date', 'Repayment Start Date', {
              type: 'date',
              slotProps: { inputLabel: { shrink: true } }
            })}
            {loanType === 'CORPORATE' && (
              <>
                {field('annual_interest_rate', 'Annual Interest Rate (%)', {
                  type: 'number',
                  inputProps: { min: 0, step: '0.0001' }
                })}
                {field('tenure_months', 'Tenure (Months)', { type: 'number', inputProps: { min: 1, step: 1 } })}
                {field('disbursement_bank_account', 'Disbursement Bank Account')}
              </>
            )}
          </div>
          {loanType === 'STAFF' && (
            <Controller
              name='auto_deduct'
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={event => field.onChange(event.target.checked)} />}
                  label='Auto-Deduct from Payslip'
                />
              )}
            />
          )}
          {field('reason', dictionary.fields.reason, { multiline: true, minRows: 3 })}
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6' className='mb-3'>
                {dictionary.form.calculation}
              </Typography>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.fields.total}
                  </Typography>
                  <Typography className='font-semibold'>
                    {formatCurrency(toFiniteNumber(totalAmount), locale, currency)}
                  </Typography>
                </div>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    AFN Base Amount / USD Equivalent
                  </Typography>
                  <Typography className='font-semibold text-primary'>
                    <DualCurrencyAmount
                      amount={totalAmount}
                      amountBase={amountBase}
                      currency={currency}
                      exchangeRate={exchangeRate}
                      locale={locale}
                    />
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
          {loanType === 'CORPORATE' && amortization.length > 0 && (
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-3'>
                  Calculated Amortization Schedule
                </Typography>
                <Typography variant='body2' color='text.secondary' className='mb-3'>
                  Amounts shown in {currency}
                </Typography>
                <div className='max-h-72 overflow-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr>
                        <th className='p-2 text-start'>#</th>
                        <th className='p-2 text-start'>Due</th>
                        <th className='p-2 text-end'>Principal</th>
                        <th className='p-2 text-end'>Interest</th>
                        <th className='p-2 text-end'>Payment</th>
                        <th className='p-2 text-end'>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amortization.map(row => (
                        <tr key={row.installment_number} className='border-bs border-divider'>
                          <td className='p-2'>{row.installment_number}</td>
                          <td className='p-2'>{toDateInputValue(row.due_date)}</td>
                          <td className='whitespace-nowrap p-2 text-end'>
                            {formatCurrency(row.principal_amount, locale, currency)}
                          </td>
                          <td className='whitespace-nowrap p-2 text-end'>
                            {formatCurrency(row.interest_amount, locale, currency)}
                          </td>
                          <td className='whitespace-nowrap p-2 text-end font-semibold'>
                            {formatCurrency(row.payment_amount, locale, currency)}
                          </td>
                          <td className='whitespace-nowrap p-2 text-end'>
                            {formatCurrency(row.remaining_principal, locale, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 pt-5'>
          <Button variant='tonal' color='secondary' disabled={isSubmitting} onClick={onClose}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default FinanceLoanFormDrawer

'use client'

import { useEffect } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { recordInvoicePayment } from '@/actions/invoices'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { recordInvoicePaymentSchema } from '@/schemas/invoices'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const InvoicePaymentDialog = ({ open, invoice, paymentMethods, locale, dictionary, onClose, onSaved }) => {
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: valibotResolver(recordInvoicePaymentSchema(dictionary.validation)), defaultValues: { payment_date: toDateInputValue(new Date()), amount: '', payment_method_id: '', notes: '' } })

  useEffect(() => {
    if (!open || !invoice) return
    reset({ payment_date: toDateInputValue(new Date()), amount: String(invoice.amount), payment_method_id: paymentMethods.find(method => method.is_default)?.id || paymentMethods[0]?.id || '', notes: '' })
  }, [invoice, open, paymentMethods, reset])

  const submit = async values => {
    const result = await recordInvoicePayment(invoice.id, { ...values, locale })

    if (!result.success) return toast.error(result.error || dictionary.messages.paymentFailed)
    toast.success(result.message)
    onClose()
    await onSaved()
  }

  const field = (name, label, props = {}) => <Controller name={name} control={control} render={({ field: controllerField }) => <CustomTextField {...controllerField} {...props} value={controllerField.value ?? ''} label={label} error={Boolean(errors[name])} helperText={errors[name]?.message} />} />

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{dictionary.payment.title}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent dividers className='flex flex-col gap-4'>
          <div className='rounded border border-divider bg-actionHover p-4'>
            <Typography className='font-semibold'>{invoice?.invoice_number}</Typography>
            <Typography color='text.secondary'>{invoice?.client.company_name}</Typography>
            <Typography variant='h6' className='mt-2 text-success'>{invoice ? formatCurrency(invoice.amount, locale, invoice.currency) : '—'}</Typography>
          </div>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {field('payment_date', dictionary.payment.date, { type: 'date', slotProps: { inputLabel: { shrink: true } } })}
            {field('amount', dictionary.payment.amount, { type: 'number', inputProps: { min: 0, step: '0.01' } })}
          </div>
          <Controller name='payment_method_id' control={control} render={({ field }) => (
            <CustomTextField {...field} select value={field.value || ''} label={dictionary.payment.method} error={Boolean(errors.payment_method_id)} helperText={errors.payment_method_id?.message}>
              {paymentMethods.map(method => <MenuItem key={method.id} value={method.id}>{method.label}</MenuItem>)}
            </CustomTextField>
          )} />
          {field('notes', dictionary.payment.notes, { multiline: true, minRows: 2 })}
          <Typography variant='body2' color='text.secondary'>{dictionary.payment.ledgerNotice}</Typography>
        </DialogContent>
        <DialogActions className='p-5'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSubmitting}>{dictionary.actions.cancel}</Button>
          <Button type='submit' variant='contained' color='success' disabled={isSubmitting}><LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.payment.recording}>{dictionary.actions.confirmPayment}</LoadingButtonContent></Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default InvoicePaymentDialog

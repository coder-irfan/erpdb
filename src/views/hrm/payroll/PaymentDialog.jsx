'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'

const PaymentDialog = ({ open, payroll, paymentMethods, locale, dictionary, onClose, onPaid }) => {
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setPaymentMethodId(paymentMethods[0]?.id || '')
  }, [open, paymentMethods])

  const submit = async () => {
    if (!payroll || !paymentMethodId) return

    setLoading(true)

    try {
      const response = await fetch(`/api/hrm/payroll/${payroll.id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: paymentMethodId, locale })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      await onPaid()
      onClose()
    } catch {
      toast.error(dictionary.messages.operationFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='xs'>
      <DialogTitle>{dictionary.payment.title}</DialogTitle>
      <DialogContent dividers>
        <CustomTextField
          select
          fullWidth
          label={dictionary.payment.method}
          value={paymentMethodId}
          onChange={event => setPaymentMethodId(event.target.value)}
        >
          <MenuItem value='' disabled>
            {dictionary.payment.selectMethod}
          </MenuItem>
          {paymentMethods.map(method => (
            <MenuItem key={method.id} value={method.id}>
              {method.label}
            </MenuItem>
          ))}
        </CustomTextField>
      </DialogContent>
      <DialogActions className='p-5'>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={loading}>
          {dictionary.actions.cancel}
        </Button>
        <Button variant='contained' onClick={submit} disabled={loading || !paymentMethodId}>
          <LoadingButtonContent loading={loading} loadingLabel={dictionary.actions.processing}>
            {dictionary.actions.confirmPayment}
          </LoadingButtonContent>
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaymentDialog

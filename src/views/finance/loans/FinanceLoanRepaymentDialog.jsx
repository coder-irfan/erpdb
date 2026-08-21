'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const FinanceLoanRepaymentDialog = ({ open, loan, locale, dictionary, onClose, onSaved }) => {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setAmount(String(Math.min(toFiniteNumber(loan?.monthly_deduction), toFiniteNumber(loan?.remaining_balance)) || '')) }, [loan, open])

  const submit = async () => {
    if (toFiniteNumber(amount) <= 0) return toast.error(dictionary.validation.amountInvalid)
    setSaving(true)
    const response = await fetch(`/api/finance/loans/${loan.id}/repay`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repayment_amount: amount, source: 'MANUAL', locale }) })
    const result = await response.json()

    if (!response.ok || !result.success) toast.error(result.error || dictionary.messages.operationFailed)
    else { toast.success(result.message); onClose(); await onSaved() }

    setSaving(false)
  }

  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='xs'><DialogTitle>{dictionary.repayment.title}</DialogTitle><DialogContent dividers className='flex flex-col gap-4'><Typography color='text.secondary'>{dictionary.repayment.description.replace('{loan}', loan?.loan_number || '')}</Typography><div className='rounded bg-errorLighter p-3'><Typography variant='caption' color='text.secondary'>{dictionary.fields.remaining}</Typography><Typography className='font-semibold text-error'>{formatCurrency(loan?.remaining_balance, locale, loan?.currency)}</Typography></div><CustomTextField autoFocus type='number' label={dictionary.fields.repayment} value={amount} onChange={event => setAmount(event.target.value)} inputProps={{ min: 0.01, max: loan?.remaining_balance, step: '0.01' }} /></DialogContent><DialogActions className='gap-2 p-5'><Button variant='tonal' color='secondary' disabled={saving} onClick={onClose}>{dictionary.actions.cancel}</Button><Button variant='contained' color='success' disabled={saving} onClick={submit}><LoadingButtonContent loading={saving} loadingLabel={dictionary.actions.saving}>{dictionary.repayment.confirm}</LoadingButtonContent></Button></DialogActions></Dialog>
}

export default FinanceLoanRepaymentDialog

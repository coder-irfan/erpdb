'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { getInvoiceDetail } from '@/actions/invoices'
import DetailSkeleton from '@/components/dialogs/DetailSkeleton'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const Detail = ({ label, value }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' className='font-semibold'>
      {value || '—'}
    </Typography>
  </div>
)

const InvoiceDetailModal = ({ open, invoiceId, refreshKey, locale, dictionary, canWrite, onClose, onPrint, onPay }) => {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !invoiceId) return
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')
      const result = await getInvoiceDetail(invoiceId, { locale })

      if (!active) return
      if (result.success) setInvoice(result.data)
      else setError(result.error || dictionary.messages.loadFailed)
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [dictionary.messages.loadFailed, invoiceId, locale, open, refreshKey])

  const payments = invoice?.payment_incomes || []

  const canRecordPayment =
    canWrite && Number(invoice?.remaining_balance) > 0.005 && !['PAID', 'CANCELLED'].includes(invoice?.status.value)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle component='div' className='flex items-start justify-between gap-3'>
        <div>
          <Typography variant='h5'>{dictionary.details?.title || 'Invoice Details'}</Typography>
          {invoice && (
            <Typography color='text.secondary'>
              #{invoice.invoice_number} · {invoice.client.company_name}
            </Typography>
          )}
        </div>
        <IconButton onClick={onClose}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className='flex min-bs-[360px] flex-col gap-5'>
        {loading && (
          <DetailSkeleton />
        )}
        {!loading && error && <Alert severity='error'>{error}</Alert>}
        {!loading && invoice && (
          <>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              {[
                [dictionary.fields.totalInvoiceAmount || 'Total Invoice Amount', invoice.amount, 'text-primary'],
                [dictionary.fields.totalAmountPaid || 'Total Amount Paid', invoice.paid_amount, 'text-success'],
                [
                  dictionary.fields.remainingBalance || 'Remaining Amount Due',
                  invoice.status.value === 'PAID' ? 0 : invoice.remaining_balance,
                  'text-warning'
                ]
              ].map(([label, amount, color]) => (
                <div key={label} className='rounded-lg border border-divider bg-actionHover p-4'>
                  <Typography variant='caption' color='text.secondary'>
                    {label}
                  </Typography>
                  <DualCurrencyAmount
                    amount={amount}
                    currency={invoice.currency}
                    exchangeRate={invoice.exchange_rate}
                    locale={locale}
                    primaryClassName={color}
                  />
                </div>
              ))}
            </div>
            <section className='rounded-lg border border-divider p-4'>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <Typography variant='h6'>{dictionary.details?.overview || 'Invoice Overview'}</Typography>
                <Chip
                  variant='tonal'
                  color={
                    invoice.status.value === 'PAID'
                      ? 'success'
                      : invoice.status.value === 'PARTIALLY_PAID'
                        ? 'info'
                        : invoice.status.value === 'CANCELLED'
                          ? 'secondary'
                          : 'warning'
                  }
                  label={invoice.is_overdue ? dictionary.status.OVERDUE : invoice.status.label}
                />
              </div>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                <Detail label={dictionary.fields.issueDate} value={toDateInputValue(invoice.issued_date)} />
                <Detail label={dictionary.fields.dueDate} value={toDateInputValue(invoice.due_date)} />
                <Detail
                  label={dictionary.fields.contract}
                  value={`${invoice.contract.contract_number} — ${invoice.contract.title}`}
                />
                <Detail label={dictionary.fields.client} value={invoice.client.company_name} />
                <Detail label='Contact' value={invoice.client.primary_contact_name} />
                <Detail
                  label='Email / Phone'
                  value={[invoice.client.email, invoice.client.phone].filter(Boolean).join(' · ')}
                />
              </div>
            </section>
            <section className='overflow-hidden rounded-lg border border-divider'>
              <div className='border-be border-divider p-4'>
                <Typography variant='h6'>{dictionary.payment.history || 'Recorded Payments'}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {payments.length} {dictionary.payment.entries || 'payment entries'}
                </Typography>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[620px] text-sm'>
                  <thead className='bg-actionHover text-start'>
                    <tr>
                      <th className='p-3 text-start'>{dictionary.payment.date}</th>
                      <th className='p-3 text-start'>{dictionary.payment.method}</th>
                      <th className='p-3 text-end'>{dictionary.payment.amount}</th>
                      <th className='p-3 text-start'>{dictionary.payment.notes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className='p-6 text-center text-textSecondary'>
                          {dictionary.payment.noPayments || 'No payments have been recorded.'}
                        </td>
                      </tr>
                    ) : (
                      payments.map(payment => (
                        <tr key={payment.id} className='border-bs border-divider'>
                          <td className='p-3'>{toDateInputValue(payment.payment_date)}</td>
                          <td className='p-3'>{payment.payment_method?.label || '—'}</td>
                          <td className='p-3 text-end'>
                            <DualCurrencyAmount
                              amount={payment.paid_amount}
                              amountBase={payment.amount_base}
                              currency={payment.currency}
                              exchangeRate={payment.exchange_rate}
                              locale={locale}
                              className='items-end'
                            />
                          </td>
                          <td className='p-3'>{payment.notes || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </DialogContent>
      <DialogActions className='p-4'>
        {invoice && (
          <>
            <Button variant='tonal' startIcon={<i className='tabler-printer' />} onClick={() => onPrint(invoice)}>
              {dictionary.actions.printDownload}
            </Button>
            {canRecordPayment && (
              <Button
                variant='contained'
                color='success'
                startIcon={<i className='tabler-cash' />}
                onClick={() => onPay(invoice)}
              >
                {dictionary.actions.recordPayment}
              </Button>
            )}
          </>
        )}
        <Button color='secondary' onClick={onClose}>
          {dictionary.actions.close}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InvoiceDetailModal

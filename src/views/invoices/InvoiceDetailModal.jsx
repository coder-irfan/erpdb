'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { getInvoiceDetail } from '@/actions/invoices'
import DetailSkeleton from '@/components/dialogs/DetailSkeleton'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import { toDateInputValue } from '@/utils/contractDuration'

const STATUS_COLORS = {
  PAID: 'success',
  PARTIALLY_PAID: 'info',
  UNPAID: 'warning',
  OVERDUE: 'error',
  CANCELLED: 'secondary'
}

const formatPaymentMethod = payment => {
  const method = payment?.payment_method?.label || payment?.payment_method?.value

  if (!method) return '—'

  return method
    .toLowerCase()
    .split(/[_\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const Detail = ({ label, value, valueClassName = '' }) => (
  <div className='min-is-0'>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' className={`mt-0.5 break-words font-medium ${valueClassName}`}>
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

  const displayStatus = invoice?.is_overdue ? 'OVERDUE' : invoice?.status.value
  const remainingBalance = invoice?.status.value === 'PAID' ? 0 : invoice?.remaining_balance

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle component='div' className='flex items-center justify-between gap-3 p-4'>
        <div className='flex min-is-0 items-center gap-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
            <i className='tabler-file-invoice text-xl' />
          </span>
          <div className='min-is-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='h6' className='break-words'>
                {invoice ? `#${invoice.invoice_number}` : dictionary.details?.title || 'Invoice Details'}
              </Typography>
              {invoice && (
                <Chip
                  size='small'
                  variant='tonal'
                  color={STATUS_COLORS[displayStatus] || 'default'}
                  label={invoice.is_overdue ? dictionary.status.OVERDUE : invoice.status.label}
                />
              )}
            </div>
            <Typography variant='body2' color='text.secondary' className='break-words'>
              {invoice
                ? `${invoice.contract.contract_number} · ${invoice.client.company_name}`
                : dictionary.common?.loading || 'Loading...'}
            </Typography>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          {invoice && (
            <>
              <Button
                size='small'
                variant='tonal'
                startIcon={<i className='tabler-printer' />}
                onClick={() => onPrint(invoice)}
              >
                <span className='hidden sm:inline'>{dictionary.actions.printDownload}</span>
              </Button>
              {canRecordPayment && (
                <Button
                  size='small'
                  variant='contained'
                  color='success'
                  startIcon={<i className='tabler-cash' />}
                  onClick={() => onPay(invoice)}
                >
                  <span className='hidden sm:inline'>{dictionary.actions.recordPayment}</span>
                </Button>
              )}
            </>
          )}
          <IconButton onClick={onClose} aria-label={dictionary.actions.close}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent
        dividers
        className='min-h-0 max-h-[85vh] overflow-y-auto scroll-smooth overscroll-contain p-4 sm:p-5'
      >
        {loading && <DetailSkeleton />}
        {!loading && error && <Alert severity='error'>{error}</Alert>}
        {!loading && invoice && (
          <div className='flex flex-col gap-3'>
            <Card variant='outlined'>
              <CardContent className='p-3 sm:p-4'>
                <div className='mb-3 flex items-center gap-2'>
                  <i className='tabler-calendar-stats text-lg text-primary' />
                  <Typography variant='subtitle1'>{dictionary.details?.overview || 'Overview & Dates'}</Typography>
                </div>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <div className='flex min-is-0 items-center gap-2'>
                    <span className='flex size-8 shrink-0 items-center justify-center rounded bg-infoLighter text-info'>
                      <i className='tabler-building' />
                    </span>
                    <div className='min-is-0'>
                      <Typography variant='caption' color='text.secondary'>
                        {dictionary.fields.client}
                      </Typography>
                      <Typography variant='body2' className='truncate font-semibold'>
                        {invoice.client.company_name}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' className='block break-words'>
                        {[invoice.client.primary_contact_name, invoice.client.email, invoice.client.phone]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Typography>
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <Detail label={dictionary.fields.issueDate} value={toDateInputValue(invoice.issued_date)} />
                    <Detail label={dictionary.fields.dueDate} value={toDateInputValue(invoice.due_date)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardContent className='p-0'>
                <div className='flex items-center gap-2 p-3 sm:p-4'>
                  <i className='tabler-list-details text-lg text-primary' />
                  <Typography variant='subtitle1'>{dictionary.details?.lineItems || 'Line Items'}</Typography>
                </div>
                <div className='overflow-x-auto border-bs border-divider'>
                  <table className='w-full min-w-[500px] text-sm'>
                    <thead className='bg-actionHover'>
                      <tr>
                        <th className='p-2 text-start'>#</th>
                        <th className='p-2 text-start'>{dictionary.details?.description || 'Description'}</th>
                        <th className='p-2 text-start'>{dictionary.fields.dueDate}</th>
                        <th className='p-2 text-end'>{dictionary.fields.amount || 'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className='p-2'>1</td>
                        <td className='p-2 font-medium'>
                          {invoice.contract.title} ({dictionary.details?.installment || 'Invoice Installment'})
                        </td>
                        <td className='p-2'>{toDateInputValue(invoice.due_date)}</td>
                        <td className='p-2 text-end'>
                          <DualCurrencyAmount
                            amount={invoice.amount}
                            currency={invoice.currency}
                            exchangeRate={invoice.exchange_rate}
                            locale={locale}
                            className='items-end'
                            primaryClassName='text-primary'
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardContent className='p-0'>
                <div className='flex items-center gap-2 p-3 sm:p-4'>
                  <i className='tabler-calculator text-lg text-primary' />
                  <Typography variant='subtitle1'>
                    {dictionary.details?.paymentBreakdown || 'Payment & Balance Summary'}
                  </Typography>
                </div>
                <div className='grid grid-cols-1 gap-3 border-bs border-divider p-3 sm:grid-cols-3 sm:p-4'>
                  <Detail
                    label={dictionary.fields.totalInvoiceAmount || 'Total Amount'}
                    value={
                      <DualCurrencyAmount
                        amount={invoice.amount}
                        currency={invoice.currency}
                        exchangeRate={invoice.exchange_rate}
                        locale={locale}
                        primaryClassName='text-primary'
                      />
                    }
                  />
                  <Detail
                    label={dictionary.fields.totalAmountPaid || 'Paid'}
                    value={
                      <DualCurrencyAmount
                        amount={invoice.paid_amount}
                        currency={invoice.currency}
                        exchangeRate={invoice.exchange_rate}
                        locale={locale}
                        primaryClassName='text-success'
                      />
                    }
                  />
                  <Detail
                    label={dictionary.fields.remainingBalance || 'Balance Due'}
                    value={
                      <DualCurrencyAmount
                        amount={remainingBalance}
                        currency={invoice.currency}
                        exchangeRate={invoice.exchange_rate}
                        locale={locale}
                        primaryClassName='text-warning'
                      />
                    }
                  />
                </div>
                <div className='border-bs border-divider'>
                  <div className='px-3 py-2 sm:px-4'>
                    <Typography variant='caption' color='text.secondary'>
                      {dictionary.payment.history || 'Recorded Payments'}
                    </Typography>
                  </div>
                  <div className='overflow-x-auto border-bs border-divider'>
                    <table className='w-full min-w-[440px] text-sm'>
                      <thead className='bg-actionHover'>
                        <tr>
                          <th className='p-2 text-start'>{dictionary.payment.date}</th>
                          <th className='p-2 text-start'>{dictionary.payment.method}</th>
                          <th className='p-2 text-end'>{dictionary.payment.amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={3} className='p-3 text-center text-textSecondary'>
                              {dictionary.payment.noPayments || 'No payments have been recorded.'}
                            </td>
                          </tr>
                        ) : (
                          payments.map(payment => (
                            <tr key={payment.id} className='border-bs border-divider'>
                              <td className='p-2'>{toDateInputValue(payment.payment_date)}</td>
                              <td className='p-2'>{formatPaymentMethod(payment)}</td>
                              <td className='p-2 text-end'>
                                <DualCurrencyAmount
                                  amount={payment.paid_amount}
                                  amountBase={payment.amount_base}
                                  currency={payment.currency}
                                  exchangeRate={payment.exchange_rate}
                                  locale={locale}
                                  className='items-end'
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default InvoiceDetailModal

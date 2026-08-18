'use client'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const STATUS_COLORS = { PAID: 'success', UNPAID: 'warning', PARTIALLY_PAID: 'info', CANCELLED: 'secondary', OVERDUE: 'error' }

const InvoicePrintModal = ({ open, invoice, setup, locale, dictionary, onClose }) => {
  if (!invoice) return null
  const statusValue = invoice.is_overdue ? 'OVERDUE' : invoice.status.value
  const statusLabel = invoice.is_overdue ? dictionary.status.OVERDUE : invoice.status.label
  const paymentDays = Math.max(0, Math.round((new Date(invoice.due_date).getTime() - new Date(invoice.issued_date).getTime()) / 86400000))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle component='div' className='no-print flex flex-wrap items-center justify-between gap-3'>
        <Typography variant='h5' component='span'>{dictionary.print.title}</Typography>
        <div className='flex gap-2'>
          <Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>{dictionary.actions.printDownload}</Button>
          <Button variant='tonal' color='secondary' onClick={onClose}>{dictionary.actions.close}</Button>
        </div>
      </DialogTitle>
      <DialogContent dividers className='p-0'>
        <article className='invoice-print-container mx-auto w-full bg-white p-8 text-black sm:p-12'>
          <header className='flex items-start justify-between gap-6 border-b-2 border-black pb-6'>
            <div>{setup.company_logo ? <img src={setup.company_logo} alt={setup.company_name} className='max-h-16 max-w-44 object-contain' /> : <Typography className='text-2xl font-bold text-black'>{setup.company_name}</Typography>}</div>
            <div className='text-right'>
              <Typography component='h1' className='text-3xl font-bold tracking-wider text-black'>{dictionary.print.invoice}</Typography>
              <Typography className='mt-2 font-semibold text-black'>#{invoice.invoice_number}</Typography>
              <div className='mt-2'><Chip size='small' variant='tonal' color={STATUS_COLORS[statusValue] || 'default'} label={statusLabel} /></div>
            </div>
          </header>
          <section className='mt-7 grid gap-6 sm:grid-cols-2'>
            <div>
              <Typography className='text-xs font-bold uppercase tracking-wider text-gray-500'>{dictionary.print.from}</Typography>
              <Typography className='mt-2 text-lg font-bold text-black'>{setup.company_name}</Typography>
              <Typography className='whitespace-pre-line text-sm text-black'>{setup.company_address || '—'}</Typography>
              <Typography className='text-sm text-black'>{[setup.company_email, setup.company_phone].filter(Boolean).join(' · ')}</Typography>
              {setup.company_tax_id && <Typography className='text-sm text-black'>{dictionary.print.taxId}: {setup.company_tax_id}</Typography>}
            </div>
            <div className='sm:text-right'>
              <Typography className='text-xs font-bold uppercase tracking-wider text-gray-500'>{dictionary.print.billTo}</Typography>
              <Typography className='mt-2 text-lg font-bold text-black'>{invoice.client.company_name}</Typography>
              <Typography className='text-sm text-black'>{invoice.client.primary_contact_name}</Typography>
              <Typography className='text-sm text-black'>{invoice.client.email}</Typography>
              <Typography className='whitespace-pre-line text-sm text-black'>{invoice.client.address || '—'}</Typography>
            </div>
          </section>
          <section className='mt-7 grid grid-cols-2 gap-4 rounded border border-gray-300 p-4 text-sm sm:grid-cols-4'>
            {[[dictionary.fields.invoiceNumber, invoice.invoice_number], [dictionary.fields.issueDate, toDateInputValue(invoice.issued_date)], [dictionary.fields.dueDate, toDateInputValue(invoice.due_date)], [dictionary.print.paymentTerms, dictionary.print.netDays.replace('{days}', paymentDays)]].map(([label, value]) => <div key={label}><Typography className='text-xs font-semibold uppercase text-gray-500'>{label}</Typography><Typography className='mt-1 font-medium text-black'>{value}</Typography></div>)}
          </section>
          <div className='mt-8 overflow-hidden rounded border border-gray-300'>
            <table className='w-full border-collapse text-sm'>
              <thead><tr className='bg-gray-100'><th className='border-b p-3 text-left'>{dictionary.print.item}</th><th className='border-b p-3 text-left'>{dictionary.print.service}</th><th className='border-b p-3 text-right'>{dictionary.print.rate}</th><th className='border-b p-3 text-right'>{dictionary.print.total}</th></tr></thead>
              <tbody><tr><td className='p-3'><strong>{invoice.contract.title}</strong><div className='text-xs text-gray-500'>#{invoice.contract.contract_number}</div></td><td className='p-3'>{invoice.contract.contract_type.label}</td><td className='p-3 text-right'>{formatCurrency(invoice.amount, locale, invoice.currency)}</td><td className='p-3 text-right font-bold'>{formatCurrency(invoice.amount, locale, invoice.currency)}</td></tr></tbody>
            </table>
          </div>
          <section className='ms-auto mt-7 max-w-sm space-y-3'>
            <div className='flex justify-between gap-4'><span>{dictionary.fields.exchangeRate}</span><strong>{invoice.exchange_rate}</strong></div>
            <div className='flex justify-between gap-4'><span>{dictionary.table.baseAmount}</span><strong>{formatCurrency(invoice.amount_base, locale, setup.currency_code || 'AFN')}</strong></div>
            <div className='flex justify-between gap-4 border-t-2 border-black pt-3 text-lg'><strong>{dictionary.print.amountDue}</strong><strong>{formatCurrency(invoice.amount, locale, invoice.currency)}</strong></div>
          </section>
          <footer className='mt-12 flex min-h-24 items-end justify-between gap-6 border-t border-gray-300 pt-6'>
            <div><Typography className='font-semibold text-black'>{dictionary.print.thankYou}</Typography><Typography className='text-sm text-gray-600'>{dictionary.print.footer}</Typography></div>
            {setup.signatory_stamp && <img src={setup.signatory_stamp} alt={dictionary.print.stamp} className='max-h-20 max-w-32 object-contain' />}
          </footer>
        </article>
      </DialogContent>
    </Dialog>
  )
}

export default InvoicePrintModal

'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const PayslipModal = ({ open, payroll, setup, locale, dictionary, onClose }) => {
  if (!payroll) return null

  let metadata = {}

  try { metadata = JSON.parse(payroll.notes || '{}') } catch { metadata = {} }

  const currency = setup.currency_code || 'AFN'
  const period = new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(payroll.year, payroll.month - 1, 1)))
  const money = value => formatCurrency(value, locale, currency)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md' className='payslip-dialog'>
      <DialogTitle component='div' className='no-print flex flex-wrap items-center justify-between gap-3'>
        <Typography variant='h5' component='span'>{dictionary.payslip.title}</Typography>
        <div className='flex gap-2'><Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>{dictionary.actions.print}</Button><Button variant='tonal' color='secondary' onClick={onClose}>{dictionary.actions.close}</Button></div>
      </DialogTitle>
      <DialogContent dividers className='p-0'>
        <article className='payslip-print-container mx-auto w-full bg-white p-8 text-black sm:p-12'>
          <header className='flex items-start justify-between gap-6 border-b-2 border-black pb-5'>
            <div>{setup.company_logo ? <img src={setup.company_logo} alt={setup.company_name} className='max-h-16 max-w-44 object-contain' /> : <Typography className='text-xl font-bold text-black'>{setup.company_name}</Typography>}</div>
            <div className='text-right'><Typography className='text-xl font-bold text-black'>{setup.company_name}</Typography><Typography className='whitespace-pre-line text-sm text-black'>{setup.company_address}</Typography><Typography className='text-sm text-black'>{[setup.company_phone, setup.company_email].filter(Boolean).join(' · ')}</Typography></div>
          </header>
          <section className='py-7 text-center'><Typography component='h1' className='text-2xl font-bold tracking-wide text-black'>{dictionary.payslip.title}</Typography><Typography className='text-black'>{period}</Typography></section>
          <dl className='grid grid-cols-2 gap-4 rounded border border-gray-300 p-5 text-sm sm:grid-cols-3'>
            {[[dictionary.fields.staff, payroll.staff.full_name], [dictionary.fields.position, payroll.staff.position], [dictionary.payslip.tazkira, payroll.staff.tazkira_no || '—'], [dictionary.payslip.contractNumber, payroll.contract_number || metadata.contractNumber || '—'], [dictionary.payslip.payPeriod, period], [dictionary.payslip.paymentDate, payroll.payment_date ? payroll.payment_date.slice(0, 10) : '—']].map(([label, value]) => <div key={label}><dt className='font-semibold text-gray-500'>{label}</dt><dd className='mt-1 text-black'>{value}</dd></div>)}
          </dl>
          <div className='mt-7 grid gap-6 sm:grid-cols-2'>
            <table className='w-full border-collapse text-sm'><thead><tr className='bg-gray-100'><th className='border p-3 text-left'>{dictionary.payslip.earnings}</th><th className='border p-3 text-right'>{dictionary.payslip.amount}</th></tr></thead><tbody><tr><td className='border p-3'>{dictionary.fields.baseSalary}</td><td className='border p-3 text-right'>{money(payroll.base_salary)}</td></tr><tr><td className='border p-3'>{dictionary.fields.allowances}</td><td className='border p-3 text-right'>{money(payroll.total_allowance)}</td></tr></tbody></table>
            <table className='w-full border-collapse text-sm'><thead><tr className='bg-gray-100'><th className='border p-3 text-left'>{dictionary.payslip.deductions}</th><th className='border p-3 text-right'>{dictionary.payslip.amount}</th></tr></thead><tbody><tr><td className='border p-3'>{dictionary.payslip.unpaidDays.replace('{count}', String(metadata.unpaidDays || 0))}</td><td className='border p-3 text-right'>{money(payroll.unpaid_leave_deduction)}</td></tr><tr><td className='border p-3'>{dictionary.fields.tax}</td><td className='border p-3 text-right'>{money(payroll.tax_deduction)}</td></tr></tbody></table>
          </div>
          <section className='mt-8 flex flex-wrap items-center justify-between gap-5 rounded border-2 border-green-700 bg-green-50 p-5'><div><Typography className='font-semibold text-green-800'>{dictionary.payslip.netPay}</Typography><Typography className='text-3xl font-bold text-green-900'>{money(payroll.net_salary)}</Typography></div><div className='text-right'><Typography className='font-semibold text-black'>{dictionary.status[payroll.status.value] || payroll.status.label}</Typography><Typography className='text-sm text-black'>{payroll.payment_method?.label || '—'}</Typography></div></section>
        </article>
      </DialogContent>
    </Dialog>
  )
}

export default PayslipModal

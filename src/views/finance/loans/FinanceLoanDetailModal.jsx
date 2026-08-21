'use client'

import { useEffect } from 'react'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const initials = name => name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?'
const Item = ({ label, value, className = '' }) => <div><Typography variant='caption' color='text.secondary'>{label}</Typography><Typography className={`break-words font-medium ${className}`}>{value || '—'}</Typography></div>

const FinanceLoanDetailModal = ({ open, loan, locale, dictionary, autoPrint, onClose }) => {
  useEffect(() => {
    if (!open || !autoPrint) return undefined

    const timeout = window.setTimeout(() => window.print(), 250)

    return () => window.clearTimeout(timeout)
  }, [autoPrint, open])

  if (!loan) return null
  const borrower = loan.staff?.full_name || loan.entity_name

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'><DialogTitle className='loan-print-toolbar flex items-center justify-between gap-4'><div><Typography variant='h5'>{loan.loan_number}</Typography><Typography color='text.secondary'>{borrower}</Typography></div><div className='flex gap-2'><Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>{dictionary.actions.print}</Button><IconButton onClick={onClose}><i className='tabler-x' /></IconButton></div></DialogTitle><DialogContent dividers><div className='finance-loan-print flex flex-col gap-5'>
    <div className='flex items-start justify-between gap-4 border-be-2 border-primary pb-4'><div><Typography variant='h4'>{dictionary.detail.statement}</Typography><Typography color='text.secondary'>{loan.loan_number} · {toDateInputValue(loan.issue_date)}</Typography></div><Chip variant='tonal' color='primary' label={loan.status.label} /></div>
    <Card variant='outlined'><CardContent><Typography variant='h6' className='mb-4'>{dictionary.detail.financial}</Typography><div className='grid grid-cols-2 gap-4 md:grid-cols-4'><Item label={dictionary.fields.total} value={formatCurrency(loan.total_amount, locale, loan.currency)} /><Item label={dictionary.fields.monthly} value={formatCurrency(loan.monthly_deduction, locale, loan.currency)} /><Item label={dictionary.fields.repaid} value={formatCurrency(loan.repaid_amount, locale, loan.currency)} className='text-success' /><Item label={dictionary.fields.remaining} value={formatCurrency(loan.remaining_balance, locale, loan.currency)} className='text-error' /><Item label={dictionary.fields.amountBase} value={formatCurrency(loan.amount_base, locale, 'USD')} /><Item label={dictionary.fields.exchangeRate} value={loan.exchange_rate} /><Item label={dictionary.fields.currency} value={loan.currency} /><Item label={dictionary.fields.status} value={loan.status.label} /></div></CardContent></Card>
    <Card variant='outlined'><CardContent><Typography variant='h6' className='mb-4'>{dictionary.detail.borrower}</Typography><div className='grid grid-cols-1 gap-4 sm:grid-cols-2'><div className='flex items-center gap-3'><Avatar>{initials(borrower)}</Avatar><div><Typography className='font-semibold'>{borrower}</Typography><Typography variant='body2' color='text.secondary'>{loan.staff?.position || dictionary.types[loan.loan_type]}</Typography><Typography variant='caption' color='text.secondary'>{loan.staff?.email}</Typography></div></div><div className='grid grid-cols-2 gap-3'><Item label={dictionary.fields.approver} value={loan.approved_by?.full_name || dictionary.common.notAvailable} /><Item label={dictionary.fields.issueDate} value={toDateInputValue(loan.issue_date)} /></div></div></CardContent></Card>
    {loan.reason && <Card variant='outlined'><CardContent><Typography variant='caption' color='text.secondary'>{dictionary.fields.reason}</Typography><Typography className='whitespace-pre-wrap'>{loan.reason}</Typography></CardContent></Card>}
  </div></DialogContent><style jsx global>{`@media print { body * { visibility: hidden !important; } .finance-loan-print, .finance-loan-print * { visibility: visible !important; } .finance-loan-print { position: fixed; inset: 0; width: 100%; padding: 28px; background: white !important; color: black !important; } .loan-print-toolbar { display: none !important; } }`}</style></Dialog>
}

export default FinanceLoanDetailModal

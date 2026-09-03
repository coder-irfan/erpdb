'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatLedgerText, formatPaymentMethod } from '@/utils/ledgerDisplay'

const Item = ({ label, value, className = '' }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography className={`break-words font-medium ${className}`}>{value || '—'}</Typography>
  </div>
)

const FinanceLoanDetailModal = ({ open, loan, locale, dictionary, onClose }) => {
  if (!loan) return null
  const borrower = loan.staff?.full_name || loan.entity_name

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-center justify-between gap-4'>
        <div>
          <Typography variant='h5'>{loan.loan_number}</Typography>
          <Typography color='text.secondary'>{borrower}</Typography>
        </div>
        <IconButton onClick={onClose} aria-label={dictionary.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div className='flex flex-col gap-5'>
          <div className='flex items-start justify-between gap-4 border-be-2 border-primary pb-4'>
            <div>
              <Typography variant='h4'>{dictionary.detail.statement}</Typography>
              <Typography color='text.secondary'>
                {loan.loan_number} · {toDateInputValue(loan.issue_date)}
              </Typography>
            </div>
            <Chip variant='tonal' color='primary' label={loan.status.label} />
          </div>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6' className='mb-4'>
                {dictionary.detail.financial}
              </Typography>
              <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                <Item
                  label={dictionary.fields.total}
                  value={<DualCurrencyAmount amount={loan.total_amount} amountBase={loan.amount_base} currency={loan.currency} exchangeRate={loan.exchange_rate} locale={locale} />}
                />
                <Item
                  label={dictionary.fields.monthly}
                  value={<DualCurrencyAmount amount={loan.monthly_deduction} currency={loan.currency} exchangeRate={loan.exchange_rate} locale={locale} />}
                />
                <Item
                  label={dictionary.fields.repaid}
                  value={<DualCurrencyAmount amount={loan.repaid_amount} currency={loan.currency} exchangeRate={loan.exchange_rate} locale={locale} primaryClassName='text-success' />}
                  className='text-success'
                />
                <Item
                  label={dictionary.fields.remaining}
                  value={<DualCurrencyAmount amount={loan.remaining_balance} currency={loan.currency} exchangeRate={loan.exchange_rate} locale={locale} primaryClassName='text-error' />}
                  className='text-error'
                />
                <Item label='AFN Base Amount' value={formatCurrency(loan.amount_base, locale, 'AFN')} />
                <Item label={dictionary.fields.exchangeRate} value={loan.exchange_rate} />
                <Item label={dictionary.fields.currency} value={loan.currency} />
                <Item label={dictionary.fields.status} value={loan.status.label} />
              </div>
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6' className='mb-4'>
                {dictionary.detail.borrower}
              </Typography>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex items-center gap-3'>
                  <UserAvatar user={loan.staff || { name: borrower }} size={48} />
                  <div>
                    <Typography className='font-semibold'>{borrower}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {loan.staff?.position || dictionary.types[loan.loan_type]}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {loan.staff?.email}
                    </Typography>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <Item
                    label={dictionary.fields.approver}
                    value={loan.approved_by?.full_name || dictionary.common.notAvailable}
                  />
                  <Item label={dictionary.fields.issueDate} value={toDateInputValue(loan.issue_date)} />
                </div>
              </div>
            </CardContent>
          </Card>
          {loan.reason && (
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='caption' color='text.secondary'>
                  {dictionary.fields.reason}
                </Typography>
                <Typography className='whitespace-pre-wrap'>{loan.reason}</Typography>
              </CardContent>
            </Card>
          )}
          {loan.repayments?.length > 0 && (
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-4'>Repayment Ledger</Typography>
                <div className='flex flex-col gap-3'>
                  {loan.repayments.map(repayment => (
                    <div key={repayment.id} className='grid grid-cols-1 gap-2 border-be border-divider pb-3 last:border-0 last:pb-0 sm:grid-cols-4'>
                      <Item label='Date' value={toDateInputValue(repayment.repayment_date)} />
                      <Item label='Amount' value={<DualCurrencyAmount amount={repayment.amount} amountBase={repayment.amount_base} currency={repayment.currency} exchangeRate={repayment.exchange_rate} locale={locale} />} />
                      <Item label='Payment Method' value={formatPaymentMethod(repayment.payment_method || repayment.source) || formatLedgerText(repayment.source)} />
                      <Item label='Notes' value={formatLedgerText(repayment.notes) || dictionary.common.notAvailable} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FinanceLoanDetailModal

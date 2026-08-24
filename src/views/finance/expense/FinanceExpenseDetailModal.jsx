'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { getFinanceExpenseDetail } from '@/actions/financeExpense'
import UserAvatar from '@/components/common/UserAvatar'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const isImageReceipt = url => /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(url || '')

const InfoItem = ({ label, value, accent = '' }) => (
  <div className='min-is-0'>
    <Typography variant='caption' color='text.secondary'>{label}</Typography>
    <Typography className={`break-words ${accent}`}>{value || '—'}</Typography>
  </div>
)

const FinanceExpenseDetailModal = ({ open, expenseId, locale, baseCurrency, dictionary, canWrite, refreshKey, onClose, onEdit }) => {
  const [expense, setExpense] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !expenseId) return

    let active = true

    setLoading(true)
    setError('')

    getFinanceExpenseDetail(expenseId, { locale }).then(result => {
      if (!active) return
      if (result.success) setExpense(result.data)
      else setError(result.error || dictionary.messages.detailLoadFailed)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [dictionary.messages.detailLoadFailed, expenseId, locale, open, refreshKey])

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div className='min-is-0'>
          <Typography variant='h5'>{dictionary.detail.title}</Typography>
          <Typography color='text.secondary' className='max-is-[560px] truncate'>{expense?.details || dictionary.common.loading}</Typography>
        </div>
        <div className='flex items-center gap-1'>
          {canWrite && expense && (
            <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={() => onEdit(expense)}>{dictionary.actions.edit}</Button>
          )}
          <IconButton onClick={onClose} disabled={loading} aria-label={dictionary.actions.close}><i className='tabler-x' /></IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[500px]'>
        {loading ? (
          <div className='flex min-bs-[420px] items-center justify-center'><CircularProgress /></div>
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : expense ? (
          <div className='flex flex-col gap-5'>
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-4'>{dictionary.detail.financial}</Typography>
                <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                  <InfoItem label={dictionary.fields.quantity} value={String(expense.quantity)} />
                  <InfoItem label={dictionary.fields.unitPrice} value={formatCurrency(expense.unit_price, locale, expense.currency)} />
                  <InfoItem label={dictionary.fields.subtotal} value={formatCurrency(expense.sub_total, locale, expense.currency)} accent='font-semibold text-error' />
                  <InfoItem label={dictionary.fields.baseAmount} value={formatCurrency(expense.amount_base, locale, baseCurrency)} accent='font-semibold' />
                  <InfoItem label={dictionary.fields.currency} value={expense.currency} />
                  <InfoItem label={dictionary.detail.exchangeRate} value={expense.exchange_rate} />
                  <InfoItem label={dictionary.fields.totalUsd} value={formatCurrency(expense.total_usd, locale, 'USD')} />
                  <InfoItem label={dictionary.fields.expenseDate} value={toDateInputValue(expense.expense_date)} />
                  <InfoItem label={dictionary.fields.paymentMethod} value={expense.payment_method?.label || dictionary.common.notAvailable} />
                </div>
              </CardContent>
            </Card>

            <div>
              <Typography variant='h6' className='mb-3'>{dictionary.detail.context}</Typography>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <Card variant='outlined'>
                  <CardContent className='flex items-center gap-3'>
                    <span className='flex size-11 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'><i className='tabler-briefcase text-xl' /></span>
                    <div className='min-is-0'>
                      <Typography variant='caption' color='text.secondary'>{dictionary.detail.project}</Typography>
                      <Typography className='truncate font-medium'>{expense.project?.title || dictionary.common.generalOverhead}</Typography>
                      <Typography variant='caption' color='text.secondary'>{expense.project?.project_code || dictionary.common.notAvailable}</Typography>
                    </div>
                  </CardContent>
                </Card>
                <Card variant='outlined'>
                  <CardContent className='flex items-center gap-3'>
                    <UserAvatar user={expense.spent_by || { name: dictionary.common.unassigned }} size={48} />
                    <div className='min-is-0'>
                      <Typography variant='caption' color='text.secondary'>{dictionary.detail.staff}</Typography>
                      <Typography className='truncate font-medium'>{expense.spent_by?.full_name || dictionary.common.unassigned}</Typography>
                      <Typography variant='caption' color='text.secondary'>{expense.spent_by?.position || dictionary.common.notAvailable}</Typography>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-3'>{dictionary.fields.details}</Typography>
                <Typography className='whitespace-pre-wrap'>{expense.details}</Typography>
              </CardContent>
            </Card>

            {expense.receipt_url && (
              <Card variant='outlined'>
                <CardContent>
                  <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                    <Typography variant='h6'>{dictionary.detail.receipt}</Typography>
                    <Button component='a' href={expense.receipt_url} target='_blank' rel='noopener noreferrer' variant='tonal' startIcon={<i className='tabler-download' />}>
                      {dictionary.actions.download}
                    </Button>
                  </div>
                  {isImageReceipt(expense.receipt_url) ? (
                    <a href={expense.receipt_url} target='_blank' rel='noopener noreferrer' className='block'>
                      <img src={expense.receipt_url} alt={dictionary.upload.previewAlt} className='max-bs-[320px] max-is-full rounded border border-divider object-contain' />
                    </a>
                  ) : (
                    <div className='flex items-center gap-3 rounded border border-divider p-4'>
                      <i className='tabler-file-download text-3xl text-primary' />
                      <Typography>{expense.receipt_url.split('/').pop()}</Typography>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className='grid grid-cols-2 gap-4'>
              <InfoItem label={dictionary.detail.createdAt} value={toDateInputValue(expense.created_at)} />
              <InfoItem label={dictionary.detail.updatedAt} value={toDateInputValue(expense.updated_at)} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default FinanceExpenseDetailModal

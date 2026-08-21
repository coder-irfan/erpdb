'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { getFinanceIncomeDetail } from '@/actions/financeIncome'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const STATUS_COLORS = { PAID: 'success', PARTIAL: 'warning', PENDING: 'error' }
const initials = name => name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?'

const InfoItem = ({ label, value, accent = '' }) => (
  <div className='min-is-0'>
    <Typography variant='caption' color='text.secondary'>{label}</Typography>
    <Typography className={`break-words ${accent}`}>{value || '—'}</Typography>
  </div>
)

const RelationCard = ({ icon, title, primary, secondary, children }) => (
  <Card variant='outlined'>
    <CardContent className='flex h-full flex-col gap-3'>
      <div className='flex items-center gap-3'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
          <i className={`${icon} text-xl`} />
        </span>
        <div className='min-is-0'>
          <Typography variant='caption' color='text.secondary'>{title}</Typography>
          <Typography className='truncate font-medium'>{primary || '—'}</Typography>
          {secondary && <Typography variant='caption' color='text.secondary' className='block truncate'>{secondary}</Typography>}
        </div>
      </div>
      {children}
    </CardContent>
  </Card>
)

const FinanceIncomeDetailModal = ({ open, incomeId, locale, baseCurrency, dictionary, canWrite, refreshKey, onClose, onEdit }) => {
  const [income, setIncome] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !incomeId) return

    let active = true

    setLoading(true)
    setError('')

    getFinanceIncomeDetail(incomeId, { locale }).then(result => {
      if (!active) return
      if (result.success) setIncome(result.data)
      else setError(result.error || dictionary.messages.detailLoadFailed)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [dictionary.messages.detailLoadFailed, incomeId, locale, open, refreshKey])

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div className='min-is-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <Typography variant='h5'>{income?.name || dictionary.detail.title}</Typography>
            {income && (
              <Chip size='small' variant='tonal' color={STATUS_COLORS[income.status] || 'secondary'} label={dictionary.status[income.status] || income.status} />
            )}
          </div>
          <Typography color='text.secondary'>{income?.income_type?.label || dictionary.common.loading}</Typography>
        </div>
        <div className='flex items-center gap-1'>
          {canWrite && income && (
            <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={() => onEdit(income)}>
              {dictionary.actions.edit}
            </Button>
          )}
          <IconButton onClick={onClose} disabled={loading} aria-label={dictionary.actions.close}><i className='tabler-x' /></IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[520px]'>
        {loading ? (
          <div className='flex min-bs-[430px] items-center justify-center'><CircularProgress /></div>
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : income ? (
          <div className='flex flex-col gap-5'>
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-4'>{dictionary.detail.financial}</Typography>
                <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                  <InfoItem label={dictionary.fields.totalAmount} value={formatCurrency(income.total_amount, locale, income.currency)} accent='font-semibold text-primary' />
                  <InfoItem label={dictionary.fields.paidAmount} value={formatCurrency(income.paid_amount, locale, income.currency)} accent='font-semibold text-success' />
                  <InfoItem label={dictionary.fields.remainingAmount} value={formatCurrency(income.remind_amount, locale, income.currency)} accent='font-semibold text-error' />
                  <InfoItem label={dictionary.fields.baseAmount} value={formatCurrency(income.amount_base, locale, baseCurrency)} accent='font-semibold' />
                  <InfoItem label={dictionary.fields.currency} value={income.currency} />
                  <InfoItem label={dictionary.detail.exchangeRate} value={income.exchange_rate} />
                  <InfoItem label={dictionary.fields.totalUsd} value={formatCurrency(income.total_usd, locale, 'USD')} />
                  <InfoItem label={dictionary.fields.reminderDate} value={toDateInputValue(income.remind_date)} />
                </div>
              </CardContent>
            </Card>

            <div>
              <Typography variant='h6' className='mb-3'>{dictionary.detail.linkedRecords}</Typography>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <RelationCard
                  icon='tabler-building'
                  title={dictionary.detail.client}
                  primary={income.client?.company_name}
                  secondary={income.client ? `${income.client.primary_contact_name} · ${income.client.email}` : dictionary.common.notAvailable}
                />
                <RelationCard
                  icon='tabler-briefcase'
                  title={dictionary.detail.project}
                  primary={income.project?.title}
                  secondary={income.project?.project_code || dictionary.common.notAvailable}
                />
                <RelationCard
                  icon='tabler-file-certificate'
                  title={dictionary.detail.contract}
                  primary={income.contract?.title}
                  secondary={income.contract?.contract_number || dictionary.common.notAvailable}
                />
                <RelationCard
                  icon='tabler-file-invoice'
                  title={dictionary.detail.invoice}
                  primary={income.invoice?.invoice_number}
                  secondary={income.invoice ? `${formatCurrency(income.invoice.amount, locale, income.invoice.currency)} · ${toDateInputValue(income.invoice.due_date)}` : dictionary.common.notAvailable}
                />
              </div>
            </div>

            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-4'>{dictionary.detail.processing}</Typography>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]'>
                  <div className='flex items-center gap-3'>
                    <Avatar>{initials(income.received_by?.full_name)}</Avatar>
                    <div className='min-is-0'>
                      <Typography variant='caption' color='text.secondary'>{dictionary.detail.receiver}</Typography>
                      <Typography className='truncate font-medium'>{income.received_by?.full_name || dictionary.common.unassigned}</Typography>
                      <Typography variant='caption' color='text.secondary'>{income.received_by?.position}</Typography>
                    </div>
                  </div>
                  <div>
                    <Typography variant='caption' color='text.secondary'>{dictionary.detail.paymentDetails}</Typography>
                    <Typography className='whitespace-pre-wrap'>{income.pay_details || dictionary.common.notAvailable}</Typography>
                  </div>
                </div>
                <div className='mt-4 grid grid-cols-2 gap-4'>
                  <InfoItem label={dictionary.detail.createdAt} value={toDateInputValue(income.created_at)} />
                  <InfoItem label={dictionary.detail.updatedAt} value={toDateInputValue(income.updated_at)} />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default FinanceIncomeDetailModal

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
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import { getFinanceExpenseDetail } from '@/actions/financeExpense'
import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import DetailSkeleton from '@/components/dialogs/DetailSkeleton'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'
import { isImageUpload, resolveUploadUrl } from '@/utils/uploadUrl'

const InfoItem = ({ label, value, accent = '' }) => (
  <div className='min-is-0'>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography className={`break-words ${accent}`}>{value || '—'}</Typography>
  </div>
)

const STATUS_COLORS = {
  DRAFT: 'secondary',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  REJECTED: 'error'
}

const FinanceExpenseDetailModal = ({
  open,
  expenseId,
  locale,
  baseCurrency,
  dictionary,
  canWrite,
  canApprove,
  canPay,
  refreshKey,
  onClose,
  onEdit,
  onApprove,
  onReject,
  onPay
}) => {
  const [expense, setExpense] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const receiptUrl = resolveUploadUrl(expense?.receipt_url)

  useEffect(() => {
    if (!open || !expenseId) return

    setActiveTab('overview')

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div className='min-is-0'>
          <Typography variant='h5'>{dictionary.detail.title}</Typography>
          <Typography color='text.secondary' className='max-is-[560px] truncate'>
            {expense?.details || dictionary.common.loading}
          </Typography>
        </div>
        <div className='flex items-center gap-1'>
          {expense && (
            <Chip
              size='small'
              variant='tonal'
              color={STATUS_COLORS[expense.approval_status]}
              label={dictionary.status[expense.approval_status]}
            />
          )}
          {canWrite && expense && !['APPROVED', 'PAID'].includes(expense.approval_status) && (
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-edit' />}
              onClick={() => onEdit(expense)}
            >
              {dictionary.actions.edit}
            </Button>
          )}
          {canApprove && expense?.approval_status === 'PENDING_APPROVAL' && (
            <Button size='small' color='success' variant='tonal' onClick={() => onApprove(expense)}>
              {dictionary.actions.approve}
            </Button>
          )}
          {canApprove && expense?.approval_status === 'PENDING_APPROVAL' && (
            <Button size='small' color='error' variant='tonal' onClick={() => onReject(expense)}>
              {dictionary.actions.reject}
            </Button>
          )}
          {canPay && expense?.approval_status === 'APPROVED' && (
            <Button size='small' color='success' variant='contained' onClick={() => onPay(expense)}>
              {dictionary.actions.markPaid}
            </Button>
          )}
          <IconButton onClick={onClose} aria-label={dictionary.actions.close}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[500px] p-0'>
        {loading ? (
          <div className='p-5'>
            <DetailSkeleton />
          </div>
        ) : error ? (
          <Alert severity='error' className='m-5'>
            {error}
          </Alert>
        ) : expense ? (
          <>
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant='fullWidth'
              className='border-be border-divider px-3'
              aria-label='Expense detail sections'
            >
              <Tab value='overview' label={dictionary.detail.overviewTab} />
              <Tab value='audit' label={dictionary.detail.auditTab} />
            </Tabs>
            <div className='p-5'>
              {activeTab === 'overview' ? (
                <div className='flex flex-col gap-5'>
                  <Card className='border border-primary/20 bg-primaryLighter shadow-none'>
                    <CardContent className='flex flex-wrap items-center justify-between gap-4'>
                      <div>
                        <Typography variant='caption' color='text.secondary'>
                          {dictionary.fields.voucherNumber}
                        </Typography>
                        <div className='mt-1 inline-flex rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary'>
                          {expense.voucher_number}
                        </div>
                      </div>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={STATUS_COLORS[expense.approval_status]}
                        label={dictionary.status[expense.approval_status]}
                      />
                    </CardContent>
                  </Card>

                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' className='mb-4'>
                        {dictionary.detail.context}
                      </Typography>
                      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                          <Typography variant='caption' color='text.secondary'>
                            {dictionary.fields.details}
                          </Typography>
                          <Typography className='mt-1 whitespace-pre-wrap'>{expense.details}</Typography>
                        </div>
                        <div className='flex items-center gap-3'>
                          <span className='flex size-11 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
                            <i className='tabler-briefcase text-xl' />
                          </span>
                          <div className='min-is-0'>
                            <Typography variant='caption' color='text.secondary'>
                              {dictionary.detail.project}
                            </Typography>
                            <Typography className='truncate font-medium'>
                              {expense.project?.title || dictionary.common.generalOverhead}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {expense.project?.project_code || dictionary.common.notAvailable}
                            </Typography>
                          </div>
                        </div>
                        <div className='flex items-center gap-3'>
                          <UserAvatar user={expense.spent_by || { name: dictionary.common.unassigned }} size={48} />
                          <div className='min-is-0'>
                            <Typography variant='caption' color='text.secondary'>
                              {dictionary.detail.staff}
                            </Typography>
                            <Typography className='truncate font-medium'>
                              {expense.spent_by?.full_name || dictionary.common.unassigned}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {expense.spent_by?.position || dictionary.common.notAvailable}
                            </Typography>
                          </div>
                        </div>
                        <InfoItem label={dictionary.fields.vendorPayee} value={expense.vendor_payee} />
                        <InfoItem
                          label={dictionary.fields.expenseDate}
                          value={toDateInputValue(expense.expense_date)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' className='mb-4'>
                        {dictionary.detail.financial}
                      </Typography>
                      <div className='mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        <div className='rounded bg-errorLighter p-4'>
                          <Typography variant='caption' color='text.secondary'>
                            {dictionary.fields.subtotal}
                          </Typography>
                          <Typography variant='h5' className='mt-1 font-semibold text-error'>
                            <DualCurrencyAmount
                              amount={expense.sub_total}
                              currency={expense.currency}
                              exchangeRate={expense.exchange_rate}
                              locale={locale}
                            />
                          </Typography>
                        </div>
                        <div className='rounded bg-primaryLighter p-4'>
                          <Typography variant='caption' color='text.secondary'>
                            {dictionary.fields.baseAmount}
                          </Typography>
                          <Typography variant='h5' className='mt-1 font-semibold text-primary'>
                            {formatCurrency(expense.amount_base, locale, baseCurrency)}
                          </Typography>
                        </div>
                      </div>
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <InfoItem label={dictionary.fields.quantity} value={String(expense.quantity)} />
                        <InfoItem
                          label={dictionary.fields.unitPrice}
                          value={
                            <DualCurrencyAmount
                              amount={expense.unit_price}
                              currency={expense.currency}
                              exchangeRate={expense.exchange_rate}
                              locale={locale}
                            />
                          }
                        />
                        <InfoItem label={dictionary.fields.currency} value={expense.currency} />
                        <InfoItem label={dictionary.detail.exchangeRate} value={expense.exchange_rate} />
                        <InfoItem
                          label={dictionary.fields.totalUsd}
                          value={formatCurrency(expense.total_usd, locale, 'USD')}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {expense.receipt_url && (
                    <Card variant='outlined'>
                      <CardContent>
                        <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                          <Typography variant='h6'>{dictionary.detail.receipt}</Typography>
                          <Button
                            component='a'
                            href={receiptUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            variant='tonal'
                            startIcon={<i className='tabler-download' />}
                          >
                            {dictionary.actions.download}
                          </Button>
                        </div>
                        {isImageUpload(receiptUrl) ? (
                          <button
                            type='button'
                            className='group relative block w-full cursor-zoom-in'
                            onClick={() => setReceiptPreviewOpen(true)}
                          >
                            <img
                              src={receiptUrl}
                              alt={dictionary.upload.previewAlt}
                              className='mx-auto max-bs-[320px] max-is-full rounded border border-divider object-contain'
                            />
                            <span className='absolute bottom-3 end-3 flex size-9 items-center justify-center rounded-full bg-backgroundPaper/90 text-textPrimary shadow'>
                              <i className='tabler-zoom-in text-xl' />
                            </span>
                          </button>
                        ) : (
                          <div className='flex items-center gap-3 rounded border border-divider p-4'>
                            <i className='tabler-file-download text-3xl text-primary' />
                            <Typography>{expense.receipt_url.split('/').pop()}</Typography>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className='flex flex-col gap-5'>
                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' className='mb-4'>
                        {dictionary.detail.approval}
                      </Typography>
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <InfoItem label={dictionary.fields.approvedBy} value={expense.approved_by?.full_name} />
                        <InfoItem label={dictionary.fields.processedBy} value={expense.processed_by?.full_name} />
                        <InfoItem label={dictionary.fields.paidAt} value={toDateInputValue(expense.paid_at)} />
                        <InfoItem
                          label={dictionary.fields.paymentMethod}
                          value={expense.payment_method?.label || dictionary.common.notAvailable}
                        />
                      </div>
                      {expense.rejection_reason && (
                        <Typography color='error' className='mt-4 whitespace-pre-wrap'>
                          {expense.rejection_reason}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                  <Card variant='outlined'>
                    <CardContent>
                      <Typography variant='h6' className='mb-4'>
                        {dictionary.detail.systemTimestamps}
                      </Typography>
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <InfoItem label={dictionary.detail.createdAt} value={toDateInputValue(expense.created_at)} />
                        <InfoItem label={dictionary.detail.updatedAt} value={toDateInputValue(expense.updated_at)} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
      <Dialog open={receiptPreviewOpen} onClose={() => setReceiptPreviewOpen(false)} fullWidth maxWidth='lg'>
        <DialogTitle className='flex items-center justify-between gap-3'>
          <Typography variant='h5'>{dictionary.detail.receipt}</Typography>
          <IconButton onClick={() => setReceiptPreviewOpen(false)} aria-label={dictionary.actions.close}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers className='flex min-bs-[70vh] items-center justify-center bg-actionHover p-3'>
          <img src={receiptUrl} alt={dictionary.upload.previewAlt} className='max-h-[78vh] max-w-full object-contain' />
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

export default FinanceExpenseDetailModal

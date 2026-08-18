'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import { getContractDetail } from '@/actions/contracts'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const STATUS_COLORS = { ACTIVE: 'success', DRAFT: 'secondary', PENDING: 'warning', PENDING_APPROVAL: 'warning', PENDING_SIGNATURE: 'info', EXPIRED: 'error', TERMINATED: 'error' }

const DetailItem = ({ label, value, valueClassName = '' }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>{label}</Typography>
    <Typography color='text.primary' className={`mt-1 break-words ${valueClassName}`}>{value || '—'}</Typography>
  </div>
)

const ContractDetailModal = ({ open, contractId, locale, baseCurrency, dictionary, canWrite, onClose, onEdit, refreshKey }) => {
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contract, setContract] = useState(null)

  useEffect(() => {
    if (!open || !contractId) return undefined
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')
      const result = await getContractDetail(contractId, { locale })

      if (!active) return
      if (result.success) setContract(result.data)
      else setError(result.error || dictionary.messages.loadFailed)
      setLoading(false)
    }

    setActiveTab(0)
    load()

    return () => { active = false }
  }, [contractId, dictionary.messages.loadFailed, locale, open, refreshKey])

  const remainingText = contract?.remaining_days < 0
    ? dictionary.remaining.expired.replace('{days}', Math.abs(contract?.remaining_days || 0))
    : dictionary.remaining.days.replace('{days}', contract?.remaining_days || 0)

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div className='min-is-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <Typography variant='h5' className='truncate'>{contract?.title || dictionary.detail.title}</Typography>
            {contract && <Chip size='small' variant='tonal' color={STATUS_COLORS[contract.status.value] || 'default'} label={contract.status.label} />}
          </div>
          <Typography color='text.secondary'>{contract ? `${contract.contract_number} · ${contract.client.company_name}` : dictionary.common.loading}</Typography>
        </div>
        <div className='flex items-center gap-1'>
          {canWrite && contract && <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={() => onEdit(contract)}>{dictionary.actions.edit}</Button>}
          <IconButton onClick={onClose} disabled={loading}><i className='tabler-x' /></IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[520px]'>
        {loading ? (
          <div className='flex min-bs-[440px] items-center justify-center'><CircularProgress /></div>
        ) : error ? <Alert severity='error'>{error}</Alert> : contract ? (
          <div className='flex flex-col gap-5'>
            <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant='scrollable'>
              <Tab icon={<i className='tabler-file-description' />} iconPosition='start' label={dictionary.detail.overview} />
              <Tab icon={<i className='tabler-bell' />} iconPosition='start' label={`${dictionary.detail.notifications} (${contract.notifications.length})`} />
            </Tabs>
            {activeTab === 0 ? (
              <div className='flex flex-col gap-5'>
                <Card variant='outlined'>
                  <CardContent>
                    <div className='mb-4 flex items-center gap-3'><span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'><i className='tabler-cash text-xl' /></span><Typography variant='h6'>{dictionary.detail.financial}</Typography></div>
                    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                      <DetailItem label={dictionary.detail.transactionAmount} value={formatCurrency(contract.total_amount, locale, contract.currency)} valueClassName='font-semibold text-primary' />
                      <DetailItem label={dictionary.detail.baseAmount.replace('{currency}', baseCurrency)} value={formatCurrency(contract.amount_base, locale, baseCurrency)} valueClassName='font-semibold text-success' />
                      <DetailItem label={dictionary.fields.currency} value={contract.currency} />
                      <DetailItem label={dictionary.fields.exchangeRate} value={contract.exchange_rate} />
                      <DetailItem label={dictionary.fields.startDate} value={toDateInputValue(contract.start_date)} />
                      <DetailItem label={dictionary.fields.endDate} value={toDateInputValue(contract.end_date)} />
                      <DetailItem label={dictionary.table.remaining} value={remainingText} />
                      <DetailItem label={dictionary.fields.duration} value={contract.duration_option?.label} />
                      <DetailItem label={dictionary.fields.manager} value={contract.account_manager?.full_name} />
                    </div>
                  </CardContent>
                </Card>
                <Card variant='outlined'>
                  <CardContent>
                    <div className='mb-4 flex items-center gap-3'><span className='flex size-10 items-center justify-center rounded bg-infoLighter text-info'><i className='tabler-users text-xl' /></span><Typography variant='h6'>{dictionary.detail.contacts}</Typography></div>
                    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                      <DetailItem label={dictionary.fields.client} value={contract.client.company_name} />
                      <DetailItem label={dictionary.detail.clientContact} value={contract.client.primary_contact_name} />
                      <DetailItem label={dictionary.fields.email} value={contract.client.email} />
                      <DetailItem label={dictionary.fields.serviceType} value={contract.contract_type.label} />
                      <DetailItem label={dictionary.fields.country} value={contract.country?.label} />
                      <DetailItem label={dictionary.fields.level} value={contract.level?.label} />
                      <DetailItem label={dictionary.fields.autoRenew} value={contract.auto_renew ? dictionary.common.yes : dictionary.common.no} />
                      <DetailItem label={dictionary.detail.managerContact} value={contract.account_manager?.email || contract.account_manager?.phone} />
                      <DetailItem label={dictionary.detail.createdAt} value={toDateInputValue(contract.created_at)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : contract.notifications.length === 0 ? (
              <div className='flex min-bs-[300px] flex-col items-center justify-center text-center'><i className='tabler-mail-off mb-3 text-4xl text-textDisabled' /><Typography variant='h6'>{dictionary.detail.noNotifications}</Typography><Typography color='text.secondary'>{dictionary.detail.noNotificationsDescription}</Typography></div>
            ) : (
              <div className='flex flex-col'>
                {contract.notifications.map((notification, index) => (
                  <div key={notification.id} className='flex gap-4'>
                    <div className='flex flex-col items-center'><span className='flex size-10 items-center justify-center rounded-full bg-successLighter text-success'><i className='tabler-mail-check' /></span>{index < contract.notifications.length - 1 && <Divider orientation='vertical' flexItem className='my-2' />}</div>
                    <div className='pb-6'>
                      <div className='flex flex-wrap items-center gap-2'><Typography className='font-semibold'>{dictionary.reminders[notification.reminder_type] || notification.reminder_type}</Typography><Chip size='small' variant='tonal' color={notification.status === 'SENT' ? 'success' : 'error'} label={notification.status} /></div>
                      <Typography variant='body2' color='text.secondary'>{notification.recipient_email}</Typography>
                      <Typography variant='caption' color='text.secondary'>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.sent_at))}</Typography>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default ContractDetailModal

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

import { getContractDetail } from '@/actions/contracts'
import QuickContact from '@/components/common/QuickContact'
import UserAvatar from '@/components/common/UserAvatar'
import DetailSkeleton from '@/components/dialogs/DetailSkeleton'
import { formatAfghanDateTime } from '@/utils/afghanDate'
import { formatContractDuration, toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const STATUS_COLORS = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  PENDING_SIGNATURE: 'info',
  EXPIRED: 'error',
  TERMINATED: 'error'
}

const DetailItem = ({ label, value, valueClassName = '' }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography color='text.primary' className={`mt-1 break-words ${valueClassName}`}>
      {value || '—'}
    </Typography>
  </div>
)

const ContractDetailModal = ({
  open,
  contractId,
  locale,
  baseCurrency,
  dictionary,
  canWrite,
  onClose,
  onEdit,
  refreshKey,
  contractContext = 'CUSTOMER'
}) => {
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

    return () => {
      active = false
    }
  }, [contractId, dictionary.messages.loadFailed, locale, open, refreshKey])

  const remainingText =
    contract?.remaining_days < 0
      ? dictionary.remaining.expired.replace('{days}', Math.abs(contract?.remaining_days || 0))
      : dictionary.remaining.days.replace('{days}', contract?.remaining_days || 0)

  const isOther = contractContext === 'OTHERS' || contract?.contract_type?.category === 'CONTRACT_TYPE_OTHER'
  const partyName = isOther ? contract?.vendor?.company_name : contract?.client?.company_name

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div className='flex min-is-0 items-center gap-3'>
          {contract && <UserAvatar user={{ name: partyName || contract.title }} size={48} />}
          <div className='min-is-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <Typography variant='h5' className='truncate'>
                {contract?.title || dictionary.detail.title}
              </Typography>
              {contract && (
                <Chip
                  size='small'
                  variant='tonal'
                  color={STATUS_COLORS[contract.status.value] || 'default'}
                  label={contract.status.label}
                />
              )}
            </div>
            <Typography color='text.secondary'>
              {contract ? `${contract.contract_number} · ${partyName || contract.title}` : dictionary.common.loading}
            </Typography>
          </div>
        </div>
        <div className='flex items-center gap-1'>
          {canWrite && contract && (
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-edit' />}
              onClick={() => onEdit(contract)}
            >
              {dictionary.actions.edit}
            </Button>
          )}
          <IconButton onClick={onClose}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[520px]'>
        {loading ? (
          <DetailSkeleton />
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : contract ? (
          <div className='flex flex-col gap-5'>
            <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant='scrollable'>
              <Tab
                icon={<i className='tabler-file-description' />}
                iconPosition='start'
                label={dictionary.detail.overview}
              />
              <Tab
                icon={<i className='tabler-file-certificate' />}
                iconPosition='start'
                label='Agreement'
              />
              <Tab
                icon={<i className='tabler-bell' />}
                iconPosition='start'
                label={`${dictionary.detail.notifications} (${contract.notifications.length})`}
              />
            </Tabs>
            {activeTab === 0 ? (
              <div className='flex flex-col gap-5'>
                <Card variant='outlined'>
                  <CardContent>
                    <div className='mb-4 flex items-center gap-3'>
                      <span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'>
                        <i className='tabler-cash text-xl' />
                      </span>
                      <Typography variant='h6'>{dictionary.detail.financial}</Typography>
                    </div>
                    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                      <DetailItem
                        label={dictionary.detail.transactionAmount}
                        value={formatCurrency(contract.total_amount, locale, contract.currency)}
                        valueClassName='font-semibold text-primary'
                      />
                      <DetailItem
                        label={dictionary.detail.baseAmount.replace('{currency}', baseCurrency)}
                        value={formatCurrency(contract.amount_base, locale, baseCurrency)}
                        valueClassName='font-semibold text-success'
                      />
                      <DetailItem label={dictionary.fields.currency} value={contract.currency} />
                      <DetailItem label={dictionary.fields.exchangeRate} value={contract.exchange_rate} />
                      <DetailItem label={dictionary.fields.startDate} value={toDateInputValue(contract.start_date)} />
                      <DetailItem label={dictionary.fields.endDate} value={toDateInputValue(contract.end_date)} />
                      <DetailItem label={dictionary.table.remaining} value={remainingText} />
                      {!isOther && <DetailItem label={dictionary.fields.duration} value={formatContractDuration(contract.duration_option, contract.contract_duration)} />}
                      <DetailItem label={isOther ? 'Internal Owner / Responsible Lead' : dictionary.fields.manager} value={contract.account_manager?.full_name} />
                      {isOther && <DetailItem label='Internal Owner Position' value={contract.account_manager?.position} />}
                    </div>
                  </CardContent>
                </Card>
                <Card variant='outlined'>
                  <CardContent>
                    <div className='mb-4 flex items-center gap-3'>
                      <span className='flex size-10 items-center justify-center rounded bg-infoLighter text-info'>
                        <i className='tabler-users text-xl' />
                      </span>
                      <Typography variant='h6'>{dictionary.detail.contacts}</Typography>
                    </div>
                    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                      <DetailItem label={isOther ? 'Third-Party Company / Vendor Name' : dictionary.fields.client} value={isOther ? contract.vendor?.company_name : contract.client?.company_name} />
                      <DetailItem
                        label={isOther ? 'Vendor Representative / Contact Person' : dictionary.detail.clientContact}
                        value={isOther ? contract.vendor?.contact_name : contract.client?.primary_contact_name}
                      />
                      <DetailItem
                        label={isOther ? 'Vendor Contact Email' : dictionary.fields.email}
                        value={<QuickContact email={isOther ? contract.vendor?.email : contract.client?.email}>{isOther ? contract.vendor?.email : contract.client?.email}</QuickContact>}
                      />
                      {isOther && <DetailItem label='Vendor Contact Phone' value={<QuickContact phone={contract.vendor?.phone}>{contract.vendor?.phone}</QuickContact>} />}
                      {isOther && <DetailItem label='Vendor Address' value={contract.vendor?.address} />}
                      <DetailItem label={dictionary.fields.serviceType} value={contract.contract_type.label} />
                      <DetailItem label={dictionary.fields.template || 'Contract Template'} value={contract.template?.label} />
                      <DetailItem label={dictionary.fields.country} value={contract.country?.label} />
                      {!isOther && <DetailItem label={dictionary.fields.level} value={contract.level?.label} />}
                      <DetailItem
                        label={dictionary.fields.autoRenew}
                        value={contract.auto_renew ? dictionary.common.yes : dictionary.common.no}
                      />
                      <DetailItem
                        label={isOther ? 'Internal Owner Contact' : dictionary.detail.managerContact}
                        value={
                          contract.account_manager?.email ? (
                            <QuickContact email={contract.account_manager.email}>
                              {contract.account_manager.email}
                            </QuickContact>
                          ) : (
                            <QuickContact phone={contract.account_manager?.phone}>
                              {contract.account_manager?.phone}
                            </QuickContact>
                          )
                        }
                      />
                      <DetailItem label={dictionary.detail.createdAt} value={toDateInputValue(contract.created_at)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : activeTab === 1 ? (
              <Card variant='outlined'>
                <CardContent>
                  <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'>
                        <i className='tabler-file-certificate text-xl' />
                      </span>
                      <div>
                        <Typography variant='h6'>Agreement Terms & Clauses</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {contract.template?.label || 'Saved contract snapshot'}
                        </Typography>
                      </div>
                    </div>
                    {contract.template && <Chip size='small' variant='tonal' color='primary' label={contract.template.label} />}
                  </div>
                  <div
                    className='policy-document-preview rounded border border-divider bg-backgroundPaper p-6'
                    dangerouslySetInnerHTML={{
                      __html: contract.content_html || '<p>No agreement template was saved with this contract.</p>'
                    }}
                  />
                </CardContent>
              </Card>
            ) : contract.notifications.length === 0 ? (
              <div className='flex min-bs-[300px] flex-col items-center justify-center text-center'>
                <i className='tabler-mail-off mb-3 text-4xl text-textDisabled' />
                <Typography variant='h6'>{dictionary.detail.noNotifications}</Typography>
                <Typography color='text.secondary'>{dictionary.detail.noNotificationsDescription}</Typography>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {contract.notifications.map(notification => (
                  <div
                    key={notification.id}
                    className='flex min-w-0 flex-col gap-3 rounded-xl border border-divider/80 bg-backgroundPaper/60 p-4 transition-colors hover:border-primary/50'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-successLighter text-success'>
                        <i className='tabler-mail-check' />
                      </span>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={notification.status === 'SENT' ? 'success' : 'error'}
                        label={notification.status}
                      />
                    </div>
                    <div className='min-w-0'>
                      <Typography className='break-words font-semibold'>
                        {dictionary.reminders[notification.reminder_type] || notification.reminder_type}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' className='mt-1 break-words'>
                        {notification.recipient_email}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' className='mt-2 block'>
                        {formatAfghanDateTime(notification.sent_at, locale, { dateStyle: 'medium' })}
                      </Typography>
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

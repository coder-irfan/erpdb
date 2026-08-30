'use client'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import DialogActions from '@mui/material/DialogActions'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import QuickContact from '@/components/common/QuickContact'
import DetailDialog from '@/components/dialogs/DetailDialog'
import { formatCurrency } from '@/utils/formatCurrency'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const STATUS_COLORS = { ACTIVE: 'success', EXPIRED: 'warning', TERMINATED: 'error', DRAFT: 'secondary' }

const formatDate = (value, locale) =>
  value ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : '—'

const DETAIL_TONES = {
  primary: 'border-primary/20 bg-primaryLighter text-primary',
  success: 'border-success/20 bg-successLighter text-success',
  warning: 'border-warning/20 bg-secondaryLighter text-warning',
  info: 'border-info/20 bg-infoLighter text-info'
}

const DetailItem = ({ label, value, icon, tone }) => (
  <div className={tone ? `rounded border p-4 ${DETAIL_TONES[tone]}` : 'rounded border border-divider p-4'}>
    <div className='flex items-center gap-1'>
      {icon && <i className={`${icon} text-xl`} />}
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
    </div>
    <Typography className='mt-1' color='text.primary'>
      {value || '—'}
    </Typography>
  </div>
)

const StaffContractDetailDialog = ({ contract, open, locale, dictionary, onClose, onEdit }) => {
  if (!contract) return null

  return (
    <DetailDialog open={open} onClose={onClose} title={contract.staff.full_name} subtitle={contract.contract_number}>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <UserAvatar user={contract.staff} size={48} />
          <div>
            <Typography variant='h5'>{contract.staff.full_name}</Typography>
            <div className='mt-1 flex items-center gap-2 text-primary'>
              <i className='tabler-file-certificate' />
              <Typography color='primary.main' className='font-semibold'>
                {contract.contract_number}
              </Typography>
            </div>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {contract.remaining_days != null && (
            <Chip
              variant='tonal'
              color={contract.remaining_days < 0 ? 'error' : contract.remaining_days <= 30 ? 'warning' : 'info'}
              icon={<i className='tabler-calendar-time' />}
              label={contract.remaining_days < 0 ? `Expired ${Math.abs(contract.remaining_days)} days ago` : `${contract.remaining_days} days remaining`}
            />
          )}
          <Chip
            variant='tonal'
            color={STATUS_COLORS[contract.status.value] || 'default'}
            label={dictionary.status[contract.status.value] || contract.status.label}
          />
        </div>
      </div>
      <div className='mt-5 flex flex-col gap-5 sm:mt-6 sm:gap-6'>
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          <DetailItem
            label={dictionary.fields.staffMember}
            value={contract.staff.full_name}
            icon='tabler-user'
            tone='primary'
          />
          <DetailItem
            label={dictionary.fields.position}
            value={contract.position_title}
            icon='tabler-briefcase'
            tone='warning'
          />
          <DetailItem
            label={dictionary.fields.contractType}
            value={contract.contract_type.label}
            icon='tabler-file-text'
            tone='info'
          />
          <DetailItem
            label={dictionary.fields.baseSalary}
            value={formatCurrency(contract.base_salary, locale, contract.currency || dictionary.currencyCode || 'AFN')}
            icon='tabler-cash'
            tone='success'
          />
          <DetailItem label={dictionary.fields.startDate} value={formatDate(contract.start_date, locale)} />
          <DetailItem label={dictionary.fields.endDate} value={formatDate(contract.end_date, locale)} />
          <DetailItem label={dictionary.fields.duration || 'Duration'} value={contract.duration_label} />
          <DetailItem label='Exchange Rate' value={contract.currency === 'USD' ? contract.exchange_rate : '1.0000'} />
          <DetailItem
            label={dictionary.fields.email}
            value={<QuickContact email={contract.staff.email}>{contract.staff.email}</QuickContact>}
          />
          <DetailItem
            label={dictionary.fields.phone}
            value={<QuickContact phone={contract.staff.phone}>{contract.staff.phone}</QuickContact>}
          />
        </div>
        <Divider />
        <div>
          <Typography variant='h6' className='mb-4'>
            {dictionary.details.documentSnapshot}
          </Typography>
          <div
            className='policy-document-preview rounded border border-divider bg-backgroundPaper p-6'
            dangerouslySetInnerHTML={{ __html: contract.content_html || `<p>${dictionary.details.noContent}</p>` }}
          />
        </div>
      </div>
      <DialogActions className='px-0 pb-0 pt-4'>
        <Button color='secondary' variant='tonal' onClick={onClose}>
          {dictionary.actions.close}
        </Button>
        <Button variant='contained' startIcon={<i className='tabler-edit' />} onClick={() => onEdit(contract)}>
          {dictionary.actions.edit}
        </Button>
      </DialogActions>
    </DetailDialog>
  )
}

export default StaffContractDetailDialog

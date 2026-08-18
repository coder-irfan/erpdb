'use client'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const STATUS_COLORS = { ACTIVE: 'success', EXPIRED: 'warning', TERMINATED: 'error', DRAFT: 'secondary' }

const formatDate = (value, locale) =>
  value ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : '—'

const DETAIL_TONES = {
  primary: 'border-primary/20 bg-primaryLighter text-primary',
  success: 'border-success/20 bg-successLighter text-success',
  warning: 'border-warning/20 bg-secondaryLighter text-warning'
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg'>
      <DialogTitle component='div' className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <Typography variant='h5'>{dictionary.details.title}</Typography>
          <div className='mt-1 flex items-center gap-2 text-primary'>
            <span className='flex size-8 items-center justify-center rounded-full bg-primaryLighter'>
              <i className='tabler-file-certificate' />
            </span>
            <Typography color='primary.main' className='font-semibold'>
              {contract.contract_number}
            </Typography>
          </div>
        </div>
        <Chip
          variant='tonal'
          color={STATUS_COLORS[contract.status.value] || 'default'}
          label={dictionary.status[contract.status.value] || contract.status.label}
        />
      </DialogTitle>
      <DialogContent dividers className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          <DetailItem
            label={dictionary.fields.staffMember}
            value={contract.staff.full_name}
            icon='tabler-user'
            tone='primary'
          />
          <DetailItem label={dictionary.fields.position} value={contract.position_title} icon='tabler-briefcase' />
          <DetailItem
            label={dictionary.fields.contractType}
            value={contract.contract_type.label}
            icon='tabler-file-text'
            tone='warning'
          />
          <DetailItem
            label={dictionary.fields.baseSalary}
            value={formatCurrency(contract.base_salary, locale, contract.currency || dictionary.currencyCode || 'AFN')}
            icon='tabler-cash'
            tone='success'
          />
          <DetailItem label={dictionary.fields.startDate} value={formatDate(contract.start_date, locale)} />
          <DetailItem label={dictionary.fields.endDate} value={formatDate(contract.end_date, locale)} />
          <DetailItem label={dictionary.fields.email} value={contract.staff.email} />
          <DetailItem label={dictionary.fields.phone} value={contract.staff.phone} />
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
      </DialogContent>
      <DialogActions className='pt-4'>
        <Button color='secondary' variant='tonal' onClick={onClose}>
          {dictionary.actions.close}
        </Button>
        <Button variant='contained' startIcon={<i className='tabler-edit' />} onClick={() => onEdit(contract)}>
          {dictionary.actions.edit}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default StaffContractDetailDialog

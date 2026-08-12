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

const formatDate = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))
    : '—'

const DetailItem = ({ label, value }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography className='mt-1' color='text.primary'>
      {value || '—'}
    </Typography>
  </div>
)

const StaffContractDetailDialog = ({ contract, open, locale, dictionary, onClose, onEdit }) => {
  if (!contract) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg'>
      <DialogTitle className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <Typography variant='h5'>{dictionary.details.title}</Typography>
          <Typography color='text.secondary'>{contract.contract_number}</Typography>
        </div>
        <Chip
          variant='tonal'
          label={dictionary.status[contract.status.value] || contract.status.label}
        />
      </DialogTitle>
      <DialogContent dividers className='flex flex-col gap-6'>
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          <DetailItem label={dictionary.fields.staffMember} value={contract.staff.full_name} />
          <DetailItem label={dictionary.fields.position} value={contract.position_title} />
          <DetailItem label={dictionary.fields.contractType} value={contract.contract_type.label} />
          <DetailItem
            label={dictionary.fields.baseSalary}
            value={formatCurrency(contract.base_salary, locale, dictionary.currencyCode || 'AFN')}
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
      <DialogActions>
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

'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DetailDialog from '@/components/dialogs/DetailDialog'
import { formatMetadata } from '@/utils/formatMetadata'
import { formatStatusLabel } from '@/utils/formatStatusLabel'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const date = (value, locale) => value ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`)) : '—'
const Item = ({ label, value }) => <div className='rounded-lg border border-divider/70 bg-backgroundDefault/40 p-3'><Typography variant='caption' color='text.secondary' className='text-xs'>{label}</Typography><Typography className='mt-1 break-words text-sm font-medium sm:text-base'>{value || '—'}</Typography></div>

const LeaveDetailDialog = ({ leave, open, locale, dictionary, onClose }) => {
  if (!leave) return null

  return <DetailDialog open={open} onClose={onClose} title={leave.staff.full_name} subtitle={leave.leave_type.label}>
    <div className='flex flex-col gap-5 sm:gap-6'>
      <Chip className='w-fit' size='small' variant='tonal' color={{ APPROVED: 'success', REJECTED: 'error', PENDING: 'warning' }[leave.status.value] || 'default'} label={formatStatusLabel(leave.status.value, dictionary.status[leave.status.value] || leave.status.label)} />
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        <Item label='Leave type' value={leave.leave_type.label} />
        <Item label='Start date' value={date(leave.start_date, locale)} />
        <Item label='End date' value={date(leave.end_date, locale)} />
        <Item label='Duration' value={`${leave.total_days} day${Number(leave.total_days) === 1 ? '' : 's'}`} />
        <Item label='Paid leave' value={leave.is_paid ? 'Yes' : 'No'} />
        <Item label='Approved by' value={leave.approved_by?.full_name} />
      </div>
      <section className='rounded-lg border border-divider/70 p-4'><Typography variant='subtitle2'>Reason</Typography><Typography color='text.secondary' className='mt-2 whitespace-pre-wrap text-sm'>{formatMetadata(leave.reason) || '—'}</Typography></section>
    </div>
  </DetailDialog>
}

export default LeaveDetailDialog

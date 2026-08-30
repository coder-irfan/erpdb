'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DetailDialog from '@/components/dialogs/DetailDialog'
import PhoneNumber from '@/components/common/PhoneNumber'
import QuickContact from '@/components/common/QuickContact'
import { formatMetadata } from '@/utils/formatMetadata'
import { formatStatusLabel } from '@/utils/formatStatusLabel'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const dateTime = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value)
      )
    : '—'

const Item = ({ label, value }) => (
  <div className='rounded-lg border border-divider/70 bg-backgroundDefault/40 p-3'>
    <Typography variant='caption' color='text.secondary' className='text-xs'>
      {label}
    </Typography>
    <Typography className='mt-1 break-words text-sm font-medium sm:text-base'>{value || '—'}</Typography>
  </div>
)

const VisitorDetailDialog = ({ visitor, open, locale, dictionary, purposeLabel, onClose }) => {
  if (!visitor) return null

  return (
    <DetailDialog
      open={open}
      onClose={onClose}
      title={visitor.full_name}
      subtitle={visitor.company_name || visitor.phone || visitor.email}
    >
      <div className='flex flex-col gap-5 sm:gap-6'>
        <div className='flex flex-wrap gap-2'>
          <Chip
            size='small'
            variant='tonal'
            color={visitor.status === 'CHECKED_IN' ? 'warning' : 'success'}
            label={formatStatusLabel(visitor.status, dictionary.status[visitor.status])}
          />
          {visitor.converted_lead && (
            <Chip
              size='small'
              variant='tonal'
              color='primary'
              icon={<i className='tabler-user-share' />}
              label={`Converted: ${visitor.converted_lead.title}`}
            />
          )}
        </div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Item label='Phone' value={<PhoneNumber value={visitor.phone} />} />
          <Item label='Email' value={<QuickContact email={visitor.email}>{visitor.email}</QuickContact>} />
          <Item label='Purpose' value={purposeLabel(visitor)} />
          <Item label='Host' value={visitor.host_staff?.full_name} />
          <Item label='Host position' value={visitor.host_staff?.position} />
          <Item label='Checked in' value={dateTime(visitor.visited_at, locale)} />
          <Item label='Checked out' value={dateTime(visitor.check_out_time, locale)} />
        </div>
        <section className='rounded-lg border border-divider/70 p-4'>
          <Typography variant='subtitle2'>Notes</Typography>
          <Typography color='text.secondary' className='mt-2 whitespace-pre-wrap text-sm'>
            {formatMetadata(visitor.notes) || '—'}
          </Typography>
        </section>
      </div>
    </DetailDialog>
  )
}

export default VisitorDetailDialog

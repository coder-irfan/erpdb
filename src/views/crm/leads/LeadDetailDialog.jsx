'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DetailDialog from '@/components/dialogs/DetailDialog'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatMetadata } from '@/utils/formatMetadata'

const COLOR_MAP = { primary: 'primary', success: 'success', warning: 'warning', error: 'error', info: 'info', secondary: 'secondary' }
const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }
const date = (value, locale) => value ? new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : '—'
const Item = ({ label, value }) => <div className='rounded-lg border border-divider/70 bg-backgroundDefault/40 p-3'><Typography variant='caption' color='text.secondary' className='text-xs'>{label}</Typography><Typography className='mt-1 break-words text-sm font-medium sm:text-base'>{value || '—'}</Typography></div>

const LeadDetailDialog = ({ lead, open, locale, currencyCode, dictionary, onClose }) => {
  if (!lead) return null

  return (
    <DetailDialog open={open} onClose={onClose} title={lead.title} subtitle={lead.company_name || lead.contact_name}>
      <div className='flex flex-col gap-5 sm:gap-6'>
        <div className='flex flex-wrap gap-2'>
          <Chip size='small' variant='tonal' color={COLOR_MAP[lead.status?.color_code] || 'secondary'} label={lead.status?.label} />
          <Chip size='small' variant='tonal' color={COLOR_MAP[lead.source?.color_code] || 'primary'} label={lead.source?.label} />
          {lead.converted_client && <Chip size='small' variant='tonal' color='success' icon={<i className='tabler-user-check' />} label='Converted to client' />}
        </div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Item label='Contact' value={lead.contact_name} />
          <Item label='Email' value={lead.email} />
          <Item label='Phone' value={lead.phone} />
          <Item label='Estimated value' value={formatCurrency(lead.estimated_value, locale, lead.currency || currencyCode)} />
          <Item label='Assigned to' value={lead.assigned_to?.full_name} />
          <Item label='Next follow-up' value={date(lead.next_follow_up_date, locale)} />
        </div>
        <section className='rounded-lg border border-divider/70 p-4'>
          <Typography variant='subtitle2'>Notes</Typography>
          <Typography color='text.secondary' className='mt-2 whitespace-pre-wrap text-sm'>{formatMetadata(lead.notes) || '—'}</Typography>
        </section>
        <section>
          <Typography variant='subtitle2' className='mb-3'>Activity timeline</Typography>
          {lead.activities?.length ? <div className='flex flex-col gap-2'>{lead.activities.map(activity => <div key={activity.id} className='rounded-lg border border-divider/70 p-3'><div className='flex flex-wrap items-center justify-between gap-2'><Typography className='text-sm font-medium'>{activity.title}</Typography><Chip size='small' variant='tonal' label={activity.activity_type} /></div><Typography color='text.secondary' className='mt-1 whitespace-pre-wrap text-sm'>{formatMetadata(activity.description) || '—'}</Typography><Typography variant='caption' color='text.secondary' className='mt-2 block'>{date(activity.activity_date, locale)}{activity.staff?.full_name ? ` • ${activity.staff.full_name}` : ''}</Typography></div>)}</div> : <Typography color='text.secondary' className='text-sm'>No activity has been recorded.</Typography>}
        </section>
      </div>
    </DetailDialog>
  )
}

export default LeadDetailDialog

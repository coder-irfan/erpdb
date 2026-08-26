'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DetailDialog from '@/components/dialogs/DetailDialog'
import QuickContact from '@/components/common/QuickContact'
import { formatMetadata } from '@/utils/formatMetadata'

const Item = ({ label, value }) => (
  <div className='rounded-lg border border-divider/70 bg-backgroundDefault/40 p-3'>
    <Typography variant='caption' color='text.secondary' className='text-xs'>
      {label}
    </Typography>
    <Typography className='mt-1 break-words text-sm font-medium sm:text-base'>{value || '—'}</Typography>
  </div>
)

const TimesheetDetailDialog = ({ record, open, dictionary, onClose }) => {
  if (!record) return null

  return (
    <DetailDialog
      open={open}
      onClose={onClose}
      title={record.staff.full_name}
      subtitle={record.staff.position || record.staff.email}
    >
      <div className='flex flex-col gap-5 sm:gap-6'>
        <Chip
          className='w-fit'
          size='small'
          variant='tonal'
          color={{ PRESENT: 'success', ABSENT: 'error', LEAVE: 'info' }[record.status]}
          label={dictionary.status[record.status] || record.status}
        />
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <Item label='Date' value={record.date} />
          <Item label='Check in' value={record.check_in_time} />
          <Item label='Check out' value={record.check_out_time} />
          <Item
            label='Hours worked'
            value={record.hours_worked ? `${Number(record.hours_worked).toFixed(2)} ${dictionary.hoursShort}` : '—'}
          />
          <Item label='Email' value={<QuickContact email={record.staff.email}>{record.staff.email}</QuickContact>} />
          <Item label='Project' value={record.project?.title} />
        </div>
        <section className='rounded-lg border border-divider/70 p-4'>
          <Typography variant='subtitle2'>Notes</Typography>
          <Typography color='text.secondary' className='mt-2 whitespace-pre-wrap text-sm'>
            {formatMetadata(record.notes) || '—'}
          </Typography>
        </section>
      </div>
    </DetailDialog>
  )
}

export default TimesheetDetailDialog

'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import {
  calculateContractEndDate,
  getDateRangeDuration,
  parseDurationOption,
  toDateInputValue
} from '@/utils/contractDuration'

const DateDurationHelper = ({ startDate, endDate, durationOptions = [], onEndDateChange }) => {
  const duration = getDateRangeDuration(startDate, endDate)
  const quickOptions = durationOptions.filter(option => parseDurationOption(option))

  const applyDuration = option => {
    const calculatedEndDate = calculateContractEndDate(startDate, option)

    if (calculatedEndDate) onEndDateChange(toDateInputValue(calculatedEndDate))
  }

  return (
    <div className='flex flex-col gap-2'>
      {duration && (
        <div
          className={`flex items-center gap-2 rounded border px-3 py-2 ${
            duration.isValid ? 'border-info/20 bg-infoLighter text-info' : 'border-error/20 bg-errorLighter text-error'
          }`}
        >
          <i className={duration.isValid ? 'tabler-clock-hour-4' : 'tabler-alert-triangle'} />
          <Typography variant='caption' color='inherit' className='font-medium'>
            {duration.isValid
              ? `Duration: ${duration.months} Months, ${duration.days} Days (Total: ${duration.totalDays} Days)`
              : 'End Date must be after Start Date'}
          </Typography>
        </div>
      )}

      {quickOptions.length > 0 && (
        <div className='flex flex-wrap items-center gap-1.5'>
          <Typography variant='caption' color='text.secondary' className='me-1'>
            Quick add:
          </Typography>
          {quickOptions.map(option => (
            <Chip
              key={option.id || option.value}
              size='small'
              variant='tonal'
              color='primary'
              clickable
              label={option.label}
              disabled={!startDate}
              className='cursor-pointer rounded-full transition-all duration-200 hover:-translate-y-px hover:shadow-sm disabled:cursor-not-allowed'
              onClick={() => applyDuration(option)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DateDurationHelper

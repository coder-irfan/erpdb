'use client'

import { useCallback, useEffect, useMemo } from 'react'

import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'
import { calculateContractEndDate, parseDurationOption, toDateInputValue } from '@/utils/contractDuration'

const DateDurationHelper = ({
  startDate,
  endDate,
  durationId = '',
  durationOptions = [],
  onDurationChange,
  onEndDateChange
}) => {
  const parsedOptions = useMemo(
    () => durationOptions.map(option => ({ option, duration: parseDurationOption(option) })),
    [durationOptions]
  )

  const selectedOption = useMemo(
    () => parsedOptions.find(item => item.option.id === durationId && item.duration)?.option,
    [durationId, parsedOptions]
  )

  const applyDuration = useCallback(
    option => {
      const calculatedEndDate = calculateContractEndDate(startDate, option)
      const nextEndDate = calculatedEndDate ? toDateInputValue(calculatedEndDate) : ''

      if (nextEndDate && nextEndDate !== endDate) onEndDateChange(nextEndDate)
    },
    [endDate, onEndDateChange, startDate]
  )

  useEffect(() => {
    if (selectedOption) applyDuration(selectedOption)
  }, [applyDuration, selectedOption])

  const selectDuration = event => {
    const nextId = event.target.value
    const selected = parsedOptions.find(item => item.option.id === nextId)

    if (!nextId || selected?.duration) {
      onDurationChange?.(nextId)
      if (selected) applyDuration(selected.option)
    }
  }

  return (
    <CustomTextField
      select
      fullWidth
      label='Renewal Term'
      value={durationId || ''}
      disabled={!startDate}
      helperText='Choose a term or enter the end date manually.'
      onChange={selectDuration}
    >
      <MenuItem value=''>Manual end date</MenuItem>
      {parsedOptions.map(({ option, duration }) => (
        <MenuItem key={option.id || option.value} value={option.id} disabled={!duration}>
          {option.label}
          {!duration ? ' (invalid - use manual end date)' : ''}
        </MenuItem>
      ))}
    </CustomTextField>
  )
}

export default DateDurationHelper

'use client'

import { forwardRef } from 'react'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'
import CustomTextField from '@core/components/mui/TextField'

const parseValue = (value, mode) => {
  if (!value) return null

  if (mode === 'time') {
    const [hours, minutes] = String(value).split(':').map(Number)
    const date = new Date()

    date.setHours(hours || 0, minutes || 0, 0, 0)

    return date
  }

  const date = new Date(mode === 'datetime' ? value : `${value}T00:00:00`)

  return Number.isNaN(date.getTime()) ? null : date
}

const serializeValue = (date, mode) => {
  if (!date) return ''
  if (mode === 'time') return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  if (mode === 'datetime') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const LocalizedDateTimePicker = forwardRef(function LocalizedDateTimePicker(
  { value = '', onChange, onBlur, name, locale = 'en', mode = 'date', disabled, ...textFieldProps },
  ref
) {
  const rtlLocale = locale === 'fa' || locale === 'ps'

  return (
    <AppReactDatepicker
      selected={parseValue(value, mode)}
      onChange={date => onChange?.({ target: { name, value: serializeValue(date, mode) } })}
      onBlur={onBlur}
      disabled={disabled}
      showTimeSelect={mode === 'time' || mode === 'datetime'}
      showTimeSelectOnly={mode === 'time'}
      timeIntervals={15}
      timeCaption={rtlLocale ? 'زمان' : 'Time'}
      dateFormat={mode === 'time' ? 'HH:mm' : mode === 'datetime' ? (rtlLocale ? 'yyyy/MM/dd HH:mm' : 'MMM d, yyyy HH:mm') : rtlLocale ? 'yyyy/MM/dd' : 'MMM d, yyyy'}
      isClearable={!textFieldProps.required && !disabled}
      customInput={
        <CustomTextField
          {...textFieldProps}
          inputRef={ref}
          name={name}
          disabled={disabled}
          slotProps={{
            ...textFieldProps.slotProps,
            input: {
              endAdornment: <i className={mode === 'date' ? 'tabler-calendar' : 'tabler-calendar-time'} />,
              ...textFieldProps.slotProps?.input
            }
          }}
        />
      }
    />
  )
})

export default LocalizedDateTimePicker

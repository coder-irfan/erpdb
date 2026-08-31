'use client'

import { forwardRef } from 'react'

import DatePickerInput from './DatePickerInput'
import TimePickerInput from './TimePickerInput'

const pad = value => String(value).padStart(2, '0')

const normalizeValue = (value, type) => {
  if (!value) return ''

  const stringValue = String(value)

  if (type === 'date') return stringValue.slice(0, 10)
  if (type === 'time' && /^\d{2}:\d{2}/.test(stringValue)) return stringValue.slice(0, 5)
  if (type === 'datetime-local' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stringValue)) return stringValue.slice(0, 16)

  const date = new Date(stringValue)

  if (Number.isNaN(date.getTime())) return ''
  if (type === 'time') return `${pad(date.getHours())}:${pad(date.getMinutes())}`

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const NativeDateTimeInput = forwardRef(function NativeDateTimeInput(
  {
    label,
    mode = 'date',
    type,
    id,
    name,
    value,
    onChange,
    onBlur,
    disabled,
    required,
    error,
    helperText,
    className = '',
    locale: _locale,
    size: _size,
    sx: _sx,
    fullWidth: _fullWidth,
    slotProps,
    inputProps,
    ...props
  },
  ref
) {
  const inputType = type || (mode === 'datetime' ? 'datetime-local' : mode === 'time' ? 'time' : 'date')
  const inputId = id || name

  const sharedProps = {
    ...props,
    id: inputId,
    name,
    label,
    onChange,
    onBlur,
    disabled,
    required,
    error,
    helperText,
    className,
    inputProps,
    slotProps
  }

  if (value !== undefined) sharedProps.value = normalizeValue(value, inputType)

  if (inputType === 'time') return <TimePickerInput {...sharedProps} ref={ref} />
  if (inputType === 'date') return <DatePickerInput {...sharedProps} ref={ref} />

  return (
    <label className={`block min-w-0 ${className}`} htmlFor={inputId}>
      {label && <span className='mb-1 block text-xs font-medium text-textSecondary'>{label}</span>}
      <input
        {...props}
        {...slotProps?.htmlInput}
        {...inputProps}
        ref={ref}
        id={inputId}
        name={name}
        type={inputType}
        {...(value !== undefined ? { value: normalizeValue(value, inputType) } : {})}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        aria-invalid={error || undefined}
        className={`h-9 w-full rounded-lg border bg-backgroundPaper px-2.5 text-sm font-medium text-textPrimary outline-none transition-all [color-scheme:light] focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:pointer-events-none disabled:bg-backgroundDefault disabled:opacity-30 dark:[color-scheme:dark] ${
          error ? 'border-error' : 'border-divider'
        }`}
      />
      {helperText && (
        <span className={`mt-1 block text-xs ${error ? 'text-error' : 'text-textSecondary'}`}>{helperText}</span>
      )}
    </label>
  )
})

export default NativeDateTimeInput

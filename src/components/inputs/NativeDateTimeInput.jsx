'use client'

import { forwardRef } from 'react'

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50'

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
    value = '',
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
    slotProps: _slotProps,
    inputProps,
    ...props
  },
  ref
) {
  const inputType = type || (mode === 'datetime' ? 'datetime-local' : mode === 'time' ? 'time' : 'date')
  const inputId = id || name

  return (
    <label className={`block min-w-0 ${className}`} htmlFor={inputId}>
      {label && <span className='mb-1 block text-sm font-medium text-foreground'>{label}</span>}
      <input
        {...props}
        {...inputProps}
        ref={ref}
        id={inputId}
        name={name}
        type={inputType}
        value={normalizeValue(value, inputType)}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        aria-invalid={error || undefined}
        className={inputClassName}
      />
      {helperText && <span className={`mt-1 block text-xs ${error ? 'text-error' : 'text-textSecondary'}`}>{helperText}</span>}
    </label>
  )
})

export default NativeDateTimeInput

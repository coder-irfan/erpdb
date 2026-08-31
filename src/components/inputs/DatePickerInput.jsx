'use client'

import { forwardRef, useId, useRef } from 'react'

import { Calendar } from 'lucide-react'

const normalizeDate = value => {
  if (!value) return ''

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)

  const stringValue = String(value)

  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) return stringValue.slice(0, 10)

  const date = new Date(stringValue)

  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const DatePickerInput = forwardRef(function DatePickerInput(
  {
    label,
    id,
    name,
    value,
    onChange,
    onBlur,
    disabled = false,
    required,
    error,
    helperText,
    className = '',
    inputProps,
    slotProps,
    locale: _locale,
    size: _size,
    sx: _sx,
    fullWidth: _fullWidth,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const inputId = id || name || `date-${generatedId}`
  const localRef = useRef(null)

  const setInputRef = node => {
    localRef.current = node

    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const openPicker = () => {
    if (disabled) return

    if (typeof localRef.current?.showPicker === 'function') localRef.current.showPicker()
    else localRef.current?.focus()
  }

  const nativeProps = { ...slotProps?.htmlInput, ...inputProps }

  return (
    <div className={`block min-w-0 ${className}`}>
      {label && (
        <label htmlFor={inputId} className='mb-1 block text-xs font-medium text-textSecondary'>
          {label}
          {required && <span className='ms-0.5 text-error'>*</span>}
        </label>
      )}
      <div
        className={`relative flex h-9 items-center rounded-lg border bg-backgroundPaper transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 ${
          error ? 'border-error' : 'border-divider'
        } ${disabled ? 'pointer-events-none border-divider bg-backgroundDefault opacity-30' : 'hover:border-primary/60'}`}
      >
        <input
          {...props}
          {...nativeProps}
          ref={setInputRef}
          id={inputId}
          name={name}
          type='date'
          value={normalizeDate(value)}
          disabled={disabled}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          onChange={onChange}
          onBlur={onBlur}
          className='h-full min-w-0 flex-1 appearance-none bg-transparent px-2.5 text-sm font-medium tabular-nums text-textPrimary outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 dark:[color-scheme:dark]'
        />
        <button
          type='button'
          disabled={disabled}
          onClick={openPicker}
          className='me-2 flex size-6 shrink-0 items-center justify-center rounded-md text-textSecondary transition-colors hover:bg-actionHover hover:text-primary'
          aria-label={`Open ${label || 'date'} picker`}
        >
          <Calendar size={15} strokeWidth={1.8} />
        </button>
      </div>
      {helperText && (
        <span id={`${inputId}-helper`} className={`mt-1 block text-xs ${error ? 'text-error' : 'text-textSecondary'}`}>
          {helperText}
        </span>
      )}
    </div>
  )
})

export default DatePickerInput

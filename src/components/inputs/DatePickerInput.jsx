'use client'

import { forwardRef, useId } from 'react'

const normalizeDate = value => {
  if (!value) return ''

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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

  const setInputRef = node => {
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
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
          {...(value !== undefined ? { value: normalizeDate(value) } : {})}
          disabled={disabled}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          onChange={onChange}
          onBlur={onBlur}
          onClick={e => e.target.showPicker?.()}
          className='h-full w-full bg-transparent px-3 text-sm font-medium text-textPrimary outline-none cursor-pointer [color-scheme:dark]'
        />
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

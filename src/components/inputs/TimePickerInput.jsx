'use client'

import { forwardRef, useEffect, useId, useRef, useState } from 'react'

import { Clock } from 'lucide-react'

const normalizeTime = value => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/)

  if (!match) return ''

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours > 23 || minutes > 59) return ''

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const toDisplayTime = value => {
  const normalized = normalizeTime(value)

  if (!normalized) return { time: '', period: 'AM' }

  const [hours, minutes] = normalized.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return { time: `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, period }
}

const toValueTime = (time, period) => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/)

  if (!match) return ''

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours < 1 || hours > 12 || minutes > 59) return ''

  const valueHours = (hours % 12) + (period === 'PM' ? 12 : 0)

  return `${String(valueHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const maskTime = value => {
  const cleaned = String(value || '').replace(/[^\d:]/g, '')

  if (cleaned.includes(':')) {
    const [hours = '', minutes = ''] = cleaned.split(':')

    return `${hours.slice(0, 2)}:${minutes.replace(/:/g, '').slice(0, 2)}`
  }

  const digits = cleaned.slice(0, 4)

  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

const TimePickerInput = forwardRef(function TimePickerInput(
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
    placeholder = 'HH:MM',
    locale: _locale,
    size: _size,
    sx: _sx,
    fullWidth: _fullWidth,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const inputId = id || name || `time-${generatedId}`
  const pickerRef = useRef(null)
  const initial = toDisplayTime(value)
  const [displayTime, setDisplayTime] = useState(initial.time)
  const [period, setPeriod] = useState(initial.period)

  useEffect(() => {
    const next = toDisplayTime(value)

    setDisplayTime(next.time)
    setPeriod(next.period)
  }, [value])

  const emitChange = nextValue => {
    onChange?.({ target: { name, value: nextValue }, currentTarget: { name, value: nextValue } })
  }

  const updateDisplayTime = event => {
    if (!event?.target) return

    const nextDisplay = maskTime(event.target.value)

    setDisplayTime(nextDisplay)

    if (!nextDisplay) {
      emitChange('')

      return
    }

    const nextValue = toValueTime(nextDisplay, period)

    if (nextValue) emitChange(nextValue)
  }

  const commitDisplayTime = event => {
    const nextValue = toValueTime(displayTime, period)

    if (nextValue) {
      const next = toDisplayTime(nextValue)

      setDisplayTime(next.time)
      emitChange(nextValue)
    } else {
      const current = toDisplayTime(value)

      setDisplayTime(current.time)
      setPeriod(current.period)
    }

    if (event) onBlur?.(event)
  }

  const togglePeriod = () => {
    const nextPeriod = period === 'AM' ? 'PM' : 'AM'

    setPeriod(nextPeriod)

    const nextValue = toValueTime(displayTime, nextPeriod)

    if (nextValue) emitChange(nextValue)
  }

  const openPicker = () => {
    if (disabled) return

    if (typeof pickerRef.current?.showPicker === 'function') pickerRef.current.showPicker()
    else pickerRef.current?.click()
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
        className={`relative flex h-9 items-center gap-1.5 rounded-lg border bg-backgroundPaper px-2.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 ${
          error ? 'border-error' : 'border-divider'
        } ${disabled ? 'pointer-events-none border-divider bg-backgroundDefault opacity-30' : 'hover:border-primary/60'}`}
      >
        <input
          {...props}
          ref={ref}
          id={inputId}
          name={name}
          type='text'
          inputMode='numeric'
          autoComplete='off'
          placeholder={placeholder}
          value={displayTime}
          disabled={disabled}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          maxLength={5}
          onChange={updateDisplayTime}
          onBlur={commitDisplayTime}
          className='min-w-0 flex-1 bg-transparent text-sm font-medium tabular-nums text-textPrimary outline-none placeholder:text-textDisabled'
        />
        <button
          type='button'
          disabled={disabled}
          onClick={togglePeriod}
          className='rounded-md bg-actionSelected px-1.5 py-0.5 text-[10px] font-bold text-textSecondary transition-colors hover:bg-actionHover hover:text-textPrimary'
          aria-label={`Switch to ${period === 'AM' ? 'PM' : 'AM'}`}
        >
          {period}
        </button>
        <button
          type='button'
          disabled={disabled}
          onClick={openPicker}
          className='flex size-6 shrink-0 items-center justify-center rounded-md text-textSecondary transition-colors hover:bg-actionHover hover:text-primary'
          aria-label={`Open ${label || 'time'} picker`}
        >
          <Clock size={15} strokeWidth={1.8} />
        </button>
        <input
          {...nativeProps}
          ref={pickerRef}
          type='time'
          tabIndex={-1}
          value={normalizeTime(value)}
          disabled={disabled}
          step={nativeProps.step || 60}
          onChange={event => {
            if (!event?.target) return

            const next = toDisplayTime(event.target.value)

            setDisplayTime(next.time)
            setPeriod(next.period)
            emitChange(event.target.value)
          }}
          className='pointer-events-none absolute end-2 bottom-0 size-px opacity-0'
          aria-hidden='true'
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

export default TimePickerInput

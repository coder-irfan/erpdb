'use client'

import { forwardRef } from 'react'

import NativeDateTimeInput from './NativeDateTimeInput'

const toDateValue = value => {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const NativeDateInput = forwardRef(function NativeDateInput(
  { selected, onChange, customInput: _customInput, placeholderText: _placeholderText, dateFormat: _dateFormat, boxProps: _boxProps, popperProps: _popperProps, ...props },
  ref
) {
  return (
    <NativeDateTimeInput
      {...props}
      ref={ref}
      type='date'
      value={toDateValue(selected)}
      onChange={event => {
        if (!event?.target) return
        onChange?.(event.target.value ? new Date(`${event.target.value}T00:00:00`) : null)
      }}
    />
  )
})

export default NativeDateInput

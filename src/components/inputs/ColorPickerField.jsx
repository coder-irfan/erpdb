'use client'

import { useState } from 'react'

import ButtonBase from '@mui/material/ButtonBase'
import Popover from '@mui/material/Popover'
import Typography from '@mui/material/Typography'
import { HexColorPicker } from 'react-colorful'

import CustomTextField from '@core/components/mui/TextField'

const ColorPickerField = ({ value, onChange, name, label, disabled = false, compact = false, ...props }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const emit = nextValue => onChange?.({ target: { name, value: nextValue.toUpperCase() } })

  return (
    <div className={compact ? 'inline-flex' : 'flex items-start gap-3'}>
      <ButtonBase
        disabled={disabled}
        aria-label={label}
        onClick={event => setAnchorEl(event.currentTarget)}
        className={`${compact ? 'size-8' : 'size-10'} shrink-0 rounded border border-divider shadow-sm`}
        sx={{ backgroundColor: value }}
      />
      {!compact && <CustomTextField {...props} fullWidth name={name} label={label} value={value} disabled={disabled} onChange={event => emit(event.target.value)} />}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { className: 'mt-2 p-4' } }}
      >
        <Typography variant='body2' className='mb-3 font-medium'>{label}</Typography>
        <HexColorPicker color={value} onChange={emit} />
      </Popover>
    </div>
  )
}

export default ColorPickerField

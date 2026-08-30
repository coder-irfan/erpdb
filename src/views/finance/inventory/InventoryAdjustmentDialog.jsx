'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'

const STOCK_OUT_REASONS = [
  ['ASSIGNED_TO_STAFF', 'Assigned to Staff'],
  ['CLIENT_PROJECT', 'Used for Client Project'],
  ['INTERNAL_OFFICE_USE', 'Internal Office Use'],
  ['DAMAGED_LOST_WRITTEN_OFF', 'Damaged / Lost / Written Off']
]

const InventoryAdjustmentDialog = ({ open, item, options, locale, dictionary, onClose, onSaved }) => {
  const [direction, setDirection] = useState('IN')
  const [quantity, setQuantity] = useState('1')
  const [sourceVendor, setSourceVendor] = useState('')
  const [reason, setReason] = useState('ASSIGNED_TO_STAFF')
  const [assignedStaffId, setAssignedStaffId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setDirection('IN')
    setQuantity('1')
    setSourceVendor('')
    setReason('ASSIGNED_TO_STAFF')
    setAssignedStaffId('')
    setNotes('')
    setError('')
  }, [open])

  const submit = async () => {
    const numericQuantity = Number.parseInt(quantity, 10)
    const currentStock = Number(item?.quantity_in_stock || 0)

    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) return setError(dictionary.validation.adjustmentInvalid)
    if (direction === 'OUT' && numericQuantity > currentStock) return setError(dictionary.messages.insufficientStock)
    if (direction === 'OUT' && reason === 'ASSIGNED_TO_STAFF' && !assignedStaffId) return setError('Select the staff member receiving this asset.')

    setSaving(true)

    try {
      const response = await fetch(`/api/finance/inventory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          quantity_delta: numericQuantity,
          source_vendor: direction === 'IN' ? sourceVendor : '',
          reason: direction === 'OUT' ? reason : '',
          assigned_staff_id: direction === 'OUT' && reason === 'ASSIGNED_TO_STAFF' ? assignedStaffId : '',
          notes,
          locale
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      onClose()
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Stock Movement</DialogTitle>
      <DialogContent dividers className='flex flex-col gap-4'>
        <Typography color='text.secondary'>Record an auditable stock movement for {item?.name || ''}.</Typography>
        <div className='grid grid-cols-2 gap-3 rounded bg-actionHover p-3'>
          <div><Typography variant='caption' color='text.secondary'>Current Stock</Typography><Typography variant='h6'>{item?.quantity_in_stock || 0}</Typography></div>
          <div><Typography variant='caption' color='text.secondary'>Resulting Stock</Typography><Typography variant='h6'>{Math.max(0, Number(item?.quantity_in_stock || 0) + (direction === 'OUT' ? -1 : 1) * (Number(quantity) || 0))}</Typography></div>
        </div>
        <ToggleButtonGroup exclusive fullWidth value={direction} onChange={(_, value) => { if (value) { setDirection(value); setError('') } }}>
          <ToggleButton value='IN'><i className='tabler-package-import mie-2' />Stock In</ToggleButton>
          <ToggleButton value='OUT'><i className='tabler-package-export mie-2' />Stock Out</ToggleButton>
        </ToggleButtonGroup>
        <CustomTextField autoFocus type='number' label='Movement Quantity' value={quantity} onChange={event => { setQuantity(event.target.value); setError('') }} error={Boolean(error)} helperText={error} inputProps={{ min: 1, max: direction === 'OUT' ? item?.quantity_in_stock : undefined, step: 1 }} />
        {direction === 'IN' ? (
          <CustomTextField label='Source / Vendor (Optional)' value={sourceVendor} onChange={event => setSourceVendor(event.target.value)} />
        ) : (
          <>
            <CustomTextField select label='Reason' value={reason} onChange={event => { setReason(event.target.value); setAssignedStaffId(''); setError('') }}>
              {STOCK_OUT_REASONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </CustomTextField>
            {reason === 'ASSIGNED_TO_STAFF' && (
              <CustomTextField select label='Assigned Staff Member' value={assignedStaffId} onChange={event => { setAssignedStaffId(event.target.value); setError('') }}>
                {(options.staff || []).map(staff => <MenuItem key={staff.id} value={staff.id}>{staff.full_name} · {staff.position || 'Staff'}</MenuItem>)}
              </CustomTextField>
            )}
          </>
        )}
        <CustomTextField multiline minRows={3} label={direction === 'IN' ? 'Notes / Reference' : 'Notes'} value={notes} onChange={event => setNotes(event.target.value)} />
      </DialogContent>
      <DialogActions className='gap-2 p-5'>
        <Button variant='tonal' color='secondary' disabled={saving} onClick={onClose}>{dictionary.actions.cancel}</Button>
        <Button variant='contained' disabled={saving} onClick={submit}><LoadingButtonContent loading={saving} loadingLabel={dictionary.actions.saving}>Record Movement</LoadingButtonContent></Button>
      </DialogActions>
    </Dialog>
  )
}

export default InventoryAdjustmentDialog

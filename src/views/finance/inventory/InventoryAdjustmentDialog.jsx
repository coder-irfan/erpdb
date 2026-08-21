'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'

const InventoryAdjustmentDialog = ({ open, item, locale, dictionary, onClose, onSaved }) => {
  const [direction, setDirection] = useState('IN')
  const [quantity, setQuantity] = useState('1')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setDirection('IN')
    setQuantity('1')
    setError('')
  }, [open])

  const submit = async () => {
    const numericQuantity = Number.parseInt(quantity, 10)

    if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) return setError(dictionary.validation.adjustmentInvalid)

    setSaving(true)

    try {
      const response = await fetch(`/api/finance/inventory/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction, quantity_delta: numericQuantity, locale }) })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

      toast.success(result.message)
      onClose()
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='xs'><DialogTitle>{dictionary.adjust.title}</DialogTitle><DialogContent dividers className='flex flex-col gap-4'><Typography color='text.secondary'>{dictionary.adjust.description.replace('{item}', item?.name || '')}</Typography><div className='rounded bg-actionHover p-3'><Typography variant='caption' color='text.secondary'>{dictionary.fields.currentStock}</Typography><Typography variant='h6'>{item?.quantity_in_stock || 0}</Typography></div><ToggleButtonGroup exclusive fullWidth value={direction} onChange={(_, value) => { if (value) setDirection(value) }}><ToggleButton value='IN'><i className='tabler-package-import mie-2' />{dictionary.adjust.stockIn}</ToggleButton><ToggleButton value='OUT'><i className='tabler-package-export mie-2' />{dictionary.adjust.stockOut}</ToggleButton></ToggleButtonGroup><CustomTextField autoFocus type='number' label={dictionary.adjust.quantity} value={quantity} onChange={event => { setQuantity(event.target.value); setError('') }} error={Boolean(error)} helperText={error} inputProps={{ min: 1, step: 1 }} /></DialogContent><DialogActions className='gap-2 p-5'><Button variant='tonal' color='secondary' disabled={saving} onClick={onClose}>{dictionary.actions.cancel}</Button><Button variant='contained' disabled={saving} onClick={submit}><LoadingButtonContent loading={saving} loadingLabel={dictionary.actions.saving}>{dictionary.actions.adjust}</LoadingButtonContent></Button></DialogActions></Dialog>
}

export default InventoryAdjustmentDialog

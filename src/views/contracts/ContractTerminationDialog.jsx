'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'

const ContractTerminationDialog = ({ open, contract, loading, onClose, onConfirm }) => {
  const [reason, setReason] = useState('')
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    if (!open) return

    setReason('')
    setAttempted(false)
  }, [open])

  const submit = event => {
    event.preventDefault()
    setAttempted(true)

    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='sm'>
      <form onSubmit={submit}>
        <DialogTitle>Terminate Contract</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-4'>
          <Typography color='text.secondary'>
            Terminating {contract?.contract_number || 'this contract'} prevents new invoices and stops renewal processing.
          </Typography>
          <CustomTextField
            autoFocus
            multiline
            minRows={4}
            label='Termination Reason'
            placeholder='Record the business reason for terminating this agreement.'
            value={reason}
            error={attempted && !reason.trim()}
            helperText={attempted && !reason.trim() ? 'A termination reason is required.' : 'This reason is stored in the audit log.'}
            onChange={event => setReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' variant='tonal' disabled={loading} onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' color='error' variant='contained' disabled={loading}>
            <LoadingButtonContent loading={loading} loadingLabel='Terminating…'>
              Terminate Contract
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ContractTerminationDialog

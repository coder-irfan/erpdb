'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VisitorEmailDialog = ({ open, visitor, dictionary, onClose, onConfirm }) => {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (!open) return

    setEmail(visitor?.email || '')
    setEmailError('')
  }, [open, visitor?.email])

  const submit = () => {
    const value = email.trim()

    if (!EMAIL_PATTERN.test(value)) {
      setEmailError(dictionary.validation.emailInvalid)

      return
    }

    onConfirm(value)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='xs'>
      <DialogTitle>{dictionary.convert.title}</DialogTitle>
      <DialogContent dividers>
        <Typography color='text.secondary'>
          To convert this visitor into a CRM lead, enter their email address first so proposals and follow-ups can be tracked.
        </Typography>
        <CustomTextField
          autoFocus
          required
          type='email'
          label={dictionary.fields.email}
          value={email}
          error={Boolean(emailError)}
          helperText={emailError}
          onChange={event => {
            setEmail(event.target.value)
            if (emailError) setEmailError('')
          }}
          className='mt-4 is-full'
        />
      </DialogContent>
      <DialogActions className='p-5'>
        <Button variant='tonal' color='secondary' onClick={onClose}>{dictionary.actions.cancel}</Button>
        <Button variant='contained' onClick={submit}>Add Email</Button>
      </DialogActions>
    </Dialog>
  )
}

export default VisitorEmailDialog

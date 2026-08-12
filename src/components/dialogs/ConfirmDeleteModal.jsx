'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import LoadingButtonContent from '@/components/LoadingButtonContent'

const ConfirmDeleteModal = ({
  open,
  title = 'Confirm Deletion',
  description,
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onClose
}) => {
  const resolvedDescription =
    description ||
    'Are you sure you want to delete this item? This action cannot be undone.'

  const hasItemToken = Boolean(itemName && resolvedDescription.includes('{name}'))
  const descriptionParts = hasItemToken ? resolvedDescription.split('{name}') : null

  const handleClose = () => {
    if (!loading) onClose?.()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='xs' aria-labelledby='confirm-delete-title'>
      <DialogTitle id='confirm-delete-title' className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='flex size-11 shrink-0 items-center justify-center rounded-full bg-errorLighter text-error'>
            <i className='tabler-alert-triangle text-2xl' />
          </div>
          <Typography component='span' variant='h5'>{title}</Typography>
        </div>
        <IconButton size='small' onClick={handleClose} disabled={loading} aria-label={cancelText}>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className='flex flex-col gap-4'>
        <Typography color='text.secondary'>
          {hasItemToken ? (
            <>
              {descriptionParts[0]}
              <Typography component='span' className='font-semibold' color='text.primary'>{itemName}</Typography>
              {descriptionParts.slice(1).join('{name}')}
            </>
          ) : resolvedDescription}
        </Typography>
        {itemName && !hasItemToken && (
          <div className='rounded border border-error/20 bg-errorLighter px-4 py-3'>
            <Typography className='break-words font-semibold' color='text.primary'>{itemName}</Typography>
          </div>
        )}
      </DialogContent>
      <DialogActions className='gap-2 p-5'>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant='contained' color='error' onClick={onConfirm} disabled={loading} autoFocus>
          <LoadingButtonContent loading={loading} loadingLabel={confirmText}>{confirmText}</LoadingButtonContent>
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDeleteModal

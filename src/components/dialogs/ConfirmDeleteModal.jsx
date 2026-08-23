'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
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
      <DialogContent className='flex flex-col items-center px-5 pb-6 pt-7 text-center sm:px-8 sm:pb-8'>
        <div className='mb-4 flex size-14 items-center justify-center rounded-full bg-errorLighter text-error'>
          <i className='tabler-alert-triangle text-3xl' />
        </div>
        <Typography id='confirm-delete-title' variant='h5' className='font-semibold'>
          {title}
        </Typography>
        <Typography color='text.secondary' className='mt-2 max-is-[360px] leading-relaxed'>
          {hasItemToken ? (
            <>
              {descriptionParts[0]}
              <Typography component='span' className='font-semibold' color='text.primary'>{itemName}</Typography>
              {descriptionParts.slice(1).join('{name}')}
            </>
          ) : resolvedDescription}
        </Typography>
        {itemName && !hasItemToken && (
          <div className='mt-4 w-full rounded border border-error/20 bg-errorLighter px-4 py-3'>
            <Typography className='break-words font-semibold' color='text.primary'>{itemName}</Typography>
          </div>
        )}
        <div className='mt-6 grid w-full grid-cols-2 gap-3'>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant='contained' color='error' onClick={onConfirm} disabled={loading} autoFocus>
            <LoadingButtonContent loading={loading} loadingLabel={confirmText}>{confirmText}</LoadingButtonContent>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDeleteModal

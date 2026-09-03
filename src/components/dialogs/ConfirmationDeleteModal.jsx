'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'

import LoadingButtonContent from '@/components/LoadingButtonContent'
import { getSharedDictionary } from '@/data/dictionaries/shared'

const toneClasses = {
  error: 'bg-errorLighter text-error',
  warning: 'bg-secondaryLighter text-warning',
  primary: 'bg-primaryLighter text-primary',
  success: 'bg-successLighter text-success',
  info: 'bg-infoLighter text-info',
  secondary: 'bg-secondaryLighter text-secondary'
}

const ConfirmationDeleteModal = ({
  open,
  title,
  description,
  message,
  itemName,
  confirmText,
  cancelText,
  locale = 'en',
  loading = false,
  color = 'error',
  children,
  onConfirm,
  onClose
}) => {
  const shared = getSharedDictionary(locale)
  const resolvedDescription = description || message || shared.delete.description
  const hasItemToken = Boolean(itemName && resolvedDescription.includes('{name}'))
  const descriptionParts = hasItemToken ? resolvedDescription.split('{name}') : null

  const handleClose = () => {
    if (!loading) onClose?.()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth='xs'
      aria-labelledby='confirmation-delete-title'
      PaperProps={{ className: 'confirmation-dialog' }}
    >
      <DialogContent className='flex flex-col items-center px-5 pb-6 pt-7 text-center sm:px-8 sm:pb-8'>
        <div
          className={`mb-4 flex size-14 items-center justify-center rounded-full ${toneClasses[color] || toneClasses.error}`}
        >
          <i className='tabler-alert-triangle text-3xl' />
        </div>
        <Typography id='confirmation-delete-title' variant='h5' className='font-semibold'>
          {title || shared.delete.title}
        </Typography>
        <Typography color='text.secondary' className='mt-2 max-is-[360px] leading-relaxed'>
          {hasItemToken ? (
            <>
              {descriptionParts[0]}
              <Typography component='span' className='font-semibold' color='text.primary'>
                {itemName}
              </Typography>
              {descriptionParts.slice(1).join('{name}')}
            </>
          ) : (
            resolvedDescription
          )}
        </Typography>
        {itemName && !hasItemToken && (
          <div className='mt-4 w-full rounded border border-error/20 bg-errorLighter px-4 py-3'>
            <Typography className='break-words font-semibold' color='text.primary'>
              {itemName}
            </Typography>
          </div>
        )}
        {children && <div className='mt-4 w-full text-start'>{children}</div>}
        <div className='mt-6 grid w-full grid-cols-2 gap-3'>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={loading}>
            {cancelText || shared.actions.cancel}
          </Button>
          <Button variant='contained' color={color} onClick={onConfirm} disabled={loading} autoFocus>
            <LoadingButtonContent loading={loading} loadingLabel={confirmText || shared.actions.delete}>
              {confirmText || shared.actions.delete}
            </LoadingButtonContent>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmationDeleteModal

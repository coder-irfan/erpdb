'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'

import LoadingButtonContent from '@/components/LoadingButtonContent'

const ConfirmationComponent = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  color = 'primary',
  onConfirm,
  onClose
}) => (
  <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='xs'>
    <DialogContent className='flex flex-col items-center px-5 pb-6 pt-7 text-center sm:px-8 sm:pb-8'>
      <div className='mb-4 flex size-14 items-center justify-center rounded-full bg-warningLighter text-warning'>
        <i className='tabler-alert-triangle text-3xl' />
      </div>
      <Typography variant='h5' className='font-semibold'>{title}</Typography>
      <Typography color='text.secondary' className='mt-2 max-is-[380px] leading-relaxed'>{message}</Typography>
      <div className='mt-6 grid w-full grid-cols-2 gap-3'>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={loading}>{cancelText}</Button>
        <Button variant='contained' color={color} onClick={onConfirm} disabled={loading} autoFocus>
          <LoadingButtonContent loading={loading} loadingLabel={confirmText}>{confirmText}</LoadingButtonContent>
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)

export default ConfirmationComponent

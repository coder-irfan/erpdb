'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

const PrintPreviewModal = ({
  open,
  title,
  description,
  printLabel = 'Print',
  closeLabel = 'Close',
  landscape = false,
  children,
  onClose
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth='lg'
    scroll='paper'
    transitionDuration={300}
    aria-labelledby='print-preview-title'
    slotProps={{ paper: { className: 'min-bs-[70vh] max-bs-[94vh]' } }}
  >
    <div className='no-print flex flex-wrap items-center justify-between gap-4 border-be border-divider bg-backgroundPaper/90 p-4 backdrop-blur sm:p-5'>
      <div className='flex min-w-0 items-center gap-3'>
        <span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primaryLighter text-primary'>
          <i className='tabler-file-type-pdf text-2xl' />
        </span>
        <div className='min-w-0'>
          <Typography id='print-preview-title' variant='h5' className='truncate'>
            {title}
          </Typography>
          {description && (
            <Typography variant='body2' color='text.secondary' className='truncate'>
              {description}
            </Typography>
          )}
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>
          {printLabel}
        </Button>
        <Button className='hidden sm:inline-flex' color='secondary' variant='tonal' onClick={onClose}>
          {closeLabel}
        </Button>
        <IconButton className='sm:hidden' aria-label={closeLabel} onClick={onClose}>
          <i className='tabler-x' />
        </IconButton>
      </div>
    </div>
    <DialogContent dividers className='standard-print-preview bg-backgroundDefault/60 p-2 sm:p-5'>
      <div
        className={`mx-auto overflow-hidden rounded-sm bg-white shadow-xl ${
          landscape ? 'min-h-[210mm] max-w-[297mm]' : 'min-h-[297mm] max-w-[210mm]'
        }`}
      >
        {children}
      </div>
    </DialogContent>
  </Dialog>
)

export default PrintPreviewModal

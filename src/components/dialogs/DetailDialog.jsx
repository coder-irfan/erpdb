'use client'

import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

/** A consistent, accessible shell for read-only record details. */
const DetailDialog = ({ open, onClose, title, subtitle, children, headerAction, ariaLabel = 'Close details' }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth={false} PaperProps={{ className: 'm-0 h-full max-h-none w-full max-w-none rounded-none sm:m-8 sm:h-auto sm:max-h-[calc(100%-64px)] sm:max-w-6xl sm:rounded-[var(--mui-shape-customBorderRadius-lg)]' }}>
    <div className='sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-divider bg-backgroundPaper px-4 py-4 sm:px-6 sm:py-5'>
      <div className='min-is-0'>
        <Typography variant='h5' className='text-lg sm:text-xl'>{title}</Typography>
        {subtitle && <Typography color='text.secondary' className='mt-1 text-sm sm:text-base'>{subtitle}</Typography>}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        {headerAction}
        <IconButton color='error' aria-label={ariaLabel} onClick={onClose} className='bg-errorLighter'>
          <i className='tabler-x text-xl' />
        </IconButton>
      </div>
    </div>
    <DialogContent className='p-4 text-sm sm:p-6 sm:text-base'>{children}</DialogContent>
  </Dialog>
)

export default DetailDialog

'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'

const FinancePrintDialog = ({ open, title, printLabel, closeLabel, children, onClose }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
    <DialogTitle className='no-print flex items-center justify-between gap-3'>
      <span>{title}</span>
      <div className='flex gap-2'>
        <Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>
          {printLabel}
        </Button>
        <IconButton onClick={onClose} aria-label={closeLabel}>
          <i className='tabler-x' />
        </IconButton>
      </div>
    </DialogTitle>
    <DialogContent dividers className='bg-gray-50 p-2 sm:p-6'>
      {children}
    </DialogContent>
  </Dialog>
)

export default FinancePrintDialog

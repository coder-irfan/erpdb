'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import LoadingButtonContent from '@/components/LoadingButtonContent'

const VisitorConvertDialog = ({ open, visitor, loading, dictionary, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='xs'>
      <DialogTitle component='div' className='flex items-center gap-3'>
        <span className='flex size-11 items-center justify-center rounded-full bg-primaryLighter text-primary'>
          <i className='tabler-user-share text-2xl' />
        </span>
        <Typography component='span' variant='h5'>
          {dictionary.convert.title}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Typography color='text.secondary'>
          {dictionary.convert.description}
        </Typography>
        {visitor && (
          <div className='mt-4 rounded border border-primary/20 bg-primaryLighter p-4'>
            <Typography className='font-semibold'>{visitor.full_name}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {visitor.company_name || visitor.email || visitor.phone}
            </Typography>
          </div>
        )}
      </DialogContent>
      <DialogActions className='p-5'>
        <Button variant='tonal' color='secondary' disabled={loading} onClick={onClose}>
          {dictionary.actions.cancel}
        </Button>
        <Button variant='contained' disabled={loading} onClick={onConfirm}>
          <LoadingButtonContent loading={loading} loadingLabel={dictionary.actions.converting}>
            {dictionary.actions.convert}
          </LoadingButtonContent>
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default VisitorConvertDialog

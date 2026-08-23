'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import ContractInvoicePrint from './ContractInvoicePrint'

const InvoicePrintModal = ({ open, invoice, setup, locale, dictionary, onClose }) => {
  if (!invoice) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle component='div' className='no-print flex flex-wrap items-center justify-between gap-3'>
        <Typography variant='h5' component='span'>COMMERCIAL INVOICE</Typography>
        <div className='flex gap-2'><Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>{dictionary.actions.printDownload}</Button><Button variant='tonal' color='secondary' onClick={onClose}>{dictionary.actions.close}</Button></div>
      </DialogTitle>
      <DialogContent dividers className='bg-gray-50 p-2 sm:p-6'><ContractInvoicePrint invoice={invoice} setup={setup} locale={locale} dictionary={dictionary} /></DialogContent>
    </Dialog>
  )
}

export default InvoicePrintModal

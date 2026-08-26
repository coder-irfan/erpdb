'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'

import PrintLayout from '@/components/print/PrintLayout'

import StaffContractPrintDocument, { formatDate } from './StaffContractPrintDocument'

const StaffContractPrintPreviewModal = ({ contract, setup, locale, dictionary, onClose }) => {
  if (!contract) return null

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth={false} PaperProps={{ className: 'm-0 h-full max-h-none w-full max-w-none rounded-none sm:m-8 sm:h-auto sm:max-h-[calc(100%-64px)] sm:max-w-6xl sm:rounded-[var(--mui-shape-customBorderRadius-lg)]' }}>
      <div className='no-print flex items-center justify-between gap-3 border-b border-divider p-4 sm:px-6'>
        <div className='font-semibold'>Print preview</div>
        <div className='flex items-center gap-2'>
          <Button size='small' variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>Print</Button>
          <IconButton color='error' aria-label={dictionary.actions.close} onClick={onClose} className='bg-errorLighter'><i className='tabler-x text-xl' /></IconButton>
        </div>
      </div>
      <DialogContent className='bg-gray-100 p-0 sm:p-6'>
        <PrintLayout
          title='EMPLOYMENT CONTRACT'
          documentNumber={contract.contract_number}
          date={formatDate(contract.start_date, locale)}
          setup={setup}
          recipientName={contract.staff.full_name}
          authorizedName={setup.signatory_name}
          authorizedTitle={setup.signatory_title}
        >
          <StaffContractPrintDocument contract={contract} setup={setup} locale={locale} dictionary={dictionary} />
        </PrintLayout>
      </DialogContent>
    </Dialog>
  )
}

export default StaffContractPrintPreviewModal

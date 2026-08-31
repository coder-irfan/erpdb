'use client'

import { createPortal } from 'react-dom'

import PrintLayout from '@/components/print/PrintLayout'

import StaffContractPrintDocument, { formatDate } from './StaffContractPrintDocument'

const StaffContractPrintable = ({ contract, setup, locale, dictionary }) => {
  if (!contract || typeof document === 'undefined') return null

  return createPortal(
    <div className='staff-contract-print-host' data-print-contract>
      <PrintLayout
        title={dictionary.print.title}
        documentNumber={contract.contract_number}
        date={formatDate(contract.start_date, locale)}
        setup={setup}
        recipientName={contract.staff.full_name}
        authorizedName={setup.signatory_name}
        authorizedTitle={setup.signatory_title}
      >
        <StaffContractPrintDocument contract={contract} setup={setup} locale={locale} dictionary={dictionary} />
      </PrintLayout>
    </div>,
    document.body
  )
}

export default StaffContractPrintable

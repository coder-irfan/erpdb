'use client'

import PrintLayout from '@/components/print/PrintLayout'
import PrintPreviewModal from '@/components/print/PrintPreviewModal'

import StaffContractPrintDocument, { formatDate } from './StaffContractPrintDocument'

const ContractPrintModal = ({ open, contract, setup, locale, dictionary, onClose }) => {
  if (!contract) return null

  return (
    <PrintPreviewModal
      open={open}
      title={dictionary.print.title}
      description={`${contract.contract_number} - ${contract.staff.full_name}`}
      printLabel={dictionary.actions.printSavePdf || dictionary.actions.print}
      closeLabel={dictionary.actions.close || dictionary.actions.cancel}
      onClose={onClose}
    >
      <PrintLayout
        title={dictionary.print.title}
        documentNumber={contract.contract_number}
        date={formatDate(contract.start_date, locale)}
        setup={setup}
        labels={{
          reference: dictionary.print.reference,
          issuedDate: dictionary.print.issuedDate,
          signatures: dictionary.print.signatures,
          recipientSignature: dictionary.print.employeeSignature,
          authorizedRepresentative: dictionary.print.employerSignature,
          employeeSignatureLine: dictionary.print.employeeSignature,
          employerSignatureLine: dictionary.print.employerSignature,
          officialSeal: dictionary.print.officialSeal,
          confidentiality: dictionary.print.confidentiality,
          date: dictionary.print.date,
          page: dictionary.print.page,
          of: dictionary.print.of,
          taxId: dictionary.print.taxId
        }}
        recipientName={contract.staff.full_name}
        authorizedName={setup?.signatory_name}
        authorizedTitle={setup?.signatory_title}
      >
        <StaffContractPrintDocument
          contract={contract}
          setup={setup || {}}
          locale={locale}
          dictionary={dictionary}
        />
      </PrintLayout>
    </PrintPreviewModal>
  )
}

export default ContractPrintModal

'use client'

import PrintPreviewModal from '@/components/print/PrintPreviewModal'

import FinanceLoanPrint from './FinanceLoanPrint'

const FinanceLoanPrintVoucherModal = ({ open, loan, setup, locale, dictionary, onClose }) => {
  if (!loan) return null

  const borrower = loan.staff?.full_name || loan.entity_name || dictionary.common.notAvailable

  return (
    <PrintPreviewModal
      open={open}
      title={dictionary.actions.printVoucher}
      description={`${loan.loan_number} · ${borrower}`}
      printLabel={dictionary.actions.print}
      closeLabel={dictionary.actions.close}
      onClose={onClose}
    >
      <FinanceLoanPrint loan={loan} setup={setup} locale={locale} />
    </PrintPreviewModal>
  )
}

export default FinanceLoanPrintVoucherModal

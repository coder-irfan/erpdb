import PrintLayout from '@/components/print/PrintLayout'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const FinanceLoanPrint = ({ loan, setup, locale }) => {
  const borrower = loan.staff?.full_name || loan.entity_name || 'N/A'

  return (
    <PrintLayout title='LOAN DISBURSEMENT & REPAYMENT VOUCHER' documentNumber={loan.loan_number} date={toDateInputValue(loan.issue_date)} setup={setup} metadata={[{ label: 'Status', value: loan.status?.label }]} recipientLabel='Borrower Signature' recipientName={borrower} authorizedName={loan.approved_by?.full_name || setup?.signatory_name} authorizedTitle='Approved By / Finance Director' labels={{ authorizedRepresentative: 'Approved By / Finance Director Signature', recipientSignature: 'Borrower Signature' }}>
      <div className='space-y-6 text-xs'>
        <section><h2 className='enterprise-section-title'>Borrower & Approval Details</h2><div className='grid grid-cols-2 gap-4'>{[['Borrower Type', loan.loan_type], ['Borrower Name', borrower], ['Staff Position / Department', loan.staff?.position || 'N/A'], ['Approved By', loan.approved_by?.full_name || 'N/A'], ['Reason / Purpose', loan.reason || 'N/A']].map(([label, value]) => <div key={label} className='rounded border border-gray-200 bg-gray-50/50 p-3'><p className='text-[10px] font-semibold uppercase text-gray-500'>{label}</p><p className='mt-1 font-semibold text-gray-800'>{value}</p></div>)}</div></section>
        <section><h2 className='enterprise-section-title'>Loan Terms & Schedule Summary</h2><table className='w-full border-collapse'><thead><tr className='bg-gray-50'><th className='border border-gray-200 p-2 text-end'>Total Loan Amount</th><th className='border border-gray-200 p-2 text-end'>Monthly Deduction</th><th className='border border-gray-200 p-2 text-end'>Total Repaid</th><th className='border border-gray-200 p-2 text-end'>Remaining Balance</th></tr></thead><tbody><tr><td className='border border-gray-200 p-2 text-end'>{formatCurrency(loan.total_amount, locale, loan.currency)}</td><td className='border border-gray-200 p-2 text-end'>{formatCurrency(loan.monthly_deduction, locale, loan.currency)}</td><td className='border border-gray-200 p-2 text-end'>{formatCurrency(loan.repaid_amount, locale, loan.currency)}</td><td className='border border-gray-200 p-2 text-end font-semibold'>{formatCurrency(loan.remaining_balance, locale, loan.currency)}</td></tr></tbody></table></section>
        <section className='rounded border border-gray-200 bg-gray-50/50 p-3'><strong>Base Equivalent:</strong> {formatCurrency(loan.amount_base, locale, setup?.currency_code || 'AFN')} (Exchange Rate: {loan.exchange_rate})</section>
        <section className='rounded border-s-4 border-primary bg-gray-50 p-3 leading-relaxed'>I acknowledge receipt of the loan amount above and authorize monthly salary deductions as scheduled until fully repaid.</section>
      </div>
    </PrintLayout>
  )
}

export default FinanceLoanPrint

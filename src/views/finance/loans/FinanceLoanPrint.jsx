import PrintLayout from '@/components/print/PrintLayout'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertAfnToUsd, formatCurrency, normalizeToAfn, toFiniteNumber } from '@/utils/formatCurrency'
import { formatLedgerText, formatPaymentMethod } from '@/utils/ledgerDisplay'

const Money = ({ amount, loan, locale }) => {
  const afn = normalizeToAfn(amount, loan.currency, loan.exchange_rate)
  const usd = loan.currency === 'USD' ? toFiniteNumber(amount) : convertAfnToUsd(afn, loan.exchange_rate)

  return <><span className='font-semibold'>{formatCurrency(afn, locale, 'AFN')}</span><br /><span className='text-[10px] text-gray-500'>{formatCurrency(usd, locale, 'USD')}</span></>
}

const FinanceLoanPrint = ({ loan, setup, locale }) => {
  const isStaff = loan.loan_type === 'STAFF'
  const counterparty = loan.staff?.full_name || loan.entity_name || 'N/A'
  const repayments = [...(loan.repayments || [])].sort((a, b) => new Date(a.repayment_date) - new Date(b.repayment_date))
  let runningBalance = toFiniteNumber(loan.total_amount)

  const ledger = repayments.map(repayment => {
    runningBalance = Math.max(0, runningBalance - toFiniteNumber(repayment.amount))

    return { ...repayment, runningBalance }
  })

  return (
    <PrintLayout
      title={isStaff ? 'STAFF LOAN AGREEMENT & STATEMENT' : 'CORPORATE DEBT DISBURSEMENT VOUCHER'}
      documentNumber={loan.loan_number}
      date={toDateInputValue(loan.issue_date)}
      setup={setup}
      metadata={[{ label: 'Status', value: loan.status?.label }, { label: isStaff ? 'Employee' : 'Lender', value: counterparty }]}
      recipientLabel={isStaff ? 'Employee / Borrower Signature' : 'Lender / Authorized Representative'}
      recipientName={counterparty}
      authorizedName={loan.approved_by?.full_name || setup?.signatory_name}
      authorizedTitle='Approved By / Finance Director'
      labels={{ authorizedRepresentative: 'Approved By / Finance Director', recipientSignature: isStaff ? 'Employee Signature' : 'Lender Signature' }}
    >
      <div className='flex flex-col gap-5 pb-2 text-xs'>
        <section><h2 className='enterprise-section-title'>{isStaff ? 'Employee & Recovery Terms' : 'Lender & Borrowing Terms'}</h2><div className='grid grid-cols-2 gap-3'>{[
          [isStaff ? 'Staff Member' : 'Lender Name / Entity', counterparty],
          [isStaff ? 'Position' : 'Lender Type', isStaff ? loan.staff?.position : loan.lender_type?.replaceAll('_', ' ')],
          ['Currency / Locked Rate', `${loan.currency} / ${loan.exchange_rate} AFN per USD`],
          [isStaff ? 'Repayment Start Date' : 'Issue Date', toDateInputValue(isStaff ? loan.repayment_start_date : loan.issue_date)],
          [isStaff ? 'Payslip Auto-Deduction' : 'Disbursement Bank Account', isStaff ? (loan.auto_deduct ? 'Authorized' : 'Not authorized') : loan.disbursement_bank_account],
          [isStaff ? 'Reason / Notes' : 'Interest / Tenure', isStaff ? loan.reason : `${loan.annual_interest_rate}% / ${loan.tenure_months} months`]
        ].map(([label, value]) => <div key={label} className='rounded border border-gray-200 bg-gray-50/50 p-3'><p className='text-[10px] font-semibold uppercase text-gray-500'>{label}</p><p className='mt-1 font-semibold text-gray-800'>{value || 'N/A'}</p></div>)}</div></section>

        <section><h2 className='enterprise-section-title'>Financial Summary</h2><table className='w-full border-collapse'><thead><tr className='bg-gray-50'>{['Total Amount', isStaff ? 'Monthly Deduction' : 'Monthly Repayment', 'Repaid Amount', 'Remaining Balance'].map(label => <th key={label} className='border border-gray-200 p-2 text-end'>{label}</th>)}</tr></thead><tbody><tr>{[loan.total_amount, loan.monthly_deduction, loan.repaid_amount, loan.remaining_balance].map((amount, index) => <td key={index} className='border border-gray-200 p-2 text-end'><Money amount={amount} loan={loan} locale={locale} /></td>)}</tr></tbody></table></section>

        <section><h2 className='enterprise-section-title'>Repayment History Ledger</h2><table className='w-full border-collapse'><thead><tr className='bg-gray-50'>{['Payment Date', 'Method', 'Amount', 'Running Remaining Balance'].map(label => <th key={label} className={`border border-gray-200 p-2 ${label.includes('Amount') || label.includes('Balance') ? 'text-end' : 'text-start'}`}>{label}</th>)}</tr></thead><tbody>{ledger.length ? ledger.map(row => <tr key={row.id}><td className='border border-gray-200 p-2'>{toDateInputValue(row.repayment_date)}</td><td className='border border-gray-200 p-2'>{formatPaymentMethod(row.payment_method) || formatLedgerText(row.source).replaceAll('_', ' ')}</td><td className='border border-gray-200 p-2 text-end'><Money amount={row.amount} loan={loan} locale={locale} /></td><td className='border border-gray-200 p-2 text-end'><Money amount={row.runningBalance} loan={loan} locale={locale} /></td></tr>) : <tr><td colSpan='4' className='border border-gray-200 p-4 text-center text-gray-500'>No repayments recorded.</td></tr>}</tbody></table></section>

        {!isStaff && loan.repayment_schedule?.length > 0 && <section><h2 className='enterprise-section-title'>Amortization Schedule</h2><table className='w-full border-collapse text-[10px]'><thead><tr className='bg-gray-50'>{['#', 'Due Date', 'Principal', 'Interest', 'Payment', 'Principal Balance'].map(label => <th key={label} className='border border-gray-200 p-1.5 text-end'>{label}</th>)}</tr></thead><tbody>{loan.repayment_schedule.map(row => <tr key={row.id}><td className='border border-gray-200 p-1.5 text-end'>{row.installment_number}</td><td className='border border-gray-200 p-1.5 text-end'>{toDateInputValue(row.due_date)}</td>{[row.principal_amount, row.interest_amount, row.payment_amount, row.remaining_principal].map((amount, index) => <td key={index} className='border border-gray-200 p-1.5 text-end'>{formatCurrency(amount, locale, loan.currency)}</td>)}</tr>)}</tbody></table></section>}

        {isStaff && <section className='rounded border-s-4 border-primary bg-gray-50 p-3 leading-relaxed'>I acknowledge receipt of the loan amount above and authorize the stated salary deductions until the remaining balance is fully paid.</section>}
      </div>
    </PrintLayout>
  )
}

export default FinanceLoanPrint

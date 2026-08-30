import PrintLayout from '@/components/print/PrintLayout'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const FinanceExpensePrint = ({ expense, setup, locale }) => {
  const year = new Date(expense.expense_date || expense.created_at).getUTCFullYear()
  const voucherNumber = expense.voucher_number || `EXP-${year}-${expense.id.slice(-8).toUpperCase()}`
  const scope = expense.project?.title || 'General Overhead'
  const approver = expense.approved_by?.full_name || setup?.signatory_name
  const approverTitle = expense.approved_by?.position || 'Finance Director'

  return (
    <PrintLayout
      title='PAYMENT / EXPENSE VOUCHER'
      documentNumber={voucherNumber}
      date={toDateInputValue(expense.paid_at || expense.expense_date)}
      setup={setup}
      metadata={[
        { label: 'Approval Status', value: expense.approval_status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) },
        { label: 'Project Scope', value: scope }
      ]}
      recipientLabel='Vendor / Payee Signature'
      recipientName={expense.vendor_payee}
      authorizedName={approver}
      authorizedTitle={approverTitle}
      labels={{ authorizedRepresentative: 'Approved By / Finance Director', recipientSignature: 'Vendor / Payee Signature' }}
    >
      <div className='flex flex-col gap-5 pb-2 text-xs'>
        <section className='rounded border-s-4 border-primary bg-gray-50 p-4'>
          <p className='text-[10px] font-semibold uppercase text-gray-500'>Vendor / Payee</p>
          <p className='mt-1 text-lg font-bold text-gray-900'>{expense.vendor_payee}</p>
        </section>

        <section>
          <h2 className='enterprise-section-title'>Disbursement Details</h2>
          <div className='grid grid-cols-2 gap-4'>
            {[
              ['Project Scope', scope],
              ['Payment Method', expense.payment_method?.label || 'Pending Payment'],
              ['Expense Category', expense.expense_type?.label || 'N/A'],
              ['Processing Officer', expense.processed_by?.full_name || expense.spent_by?.full_name || 'N/A']
            ].map(([label, value]) => (
              <div key={label} className='rounded border border-gray-200 bg-gray-50/50 p-3'>
                <p className='text-[10px] font-semibold uppercase text-gray-500'>{label}</p>
                <p className='mt-1 font-semibold text-gray-800'>{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className='enterprise-section-title'>Line Item Particulars</h2>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='bg-gray-50'>
                <th className='border border-gray-200 p-2 text-start'>Item Description</th>
                <th className='border border-gray-200 p-2 text-end'>Quantity</th>
                <th className='border border-gray-200 p-2 text-end'>Unit Price</th>
                <th className='border border-gray-200 p-2 text-end'>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className='border border-gray-200 p-2'>{expense.details}</td>
                <td className='border border-gray-200 p-2 text-end'>{expense.quantity}</td>
                <td className='border border-gray-200 p-2 text-end'>{formatCurrency(expense.unit_price, locale, expense.currency)}</td>
                <td className='border border-gray-200 p-2 text-end font-semibold'>{formatCurrency(expense.sub_total, locale, expense.currency)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className='ms-auto w-full max-w-[92mm] rounded border border-gray-200 text-xs'>
          <div className='flex justify-between border-b border-gray-200 p-2'><span>Subtotal</span><strong>{formatCurrency(expense.sub_total, locale, expense.currency)}</strong></div>
          <div className='flex justify-between border-b border-gray-200 p-2'><span>Base Equivalent</span><strong>{formatCurrency(expense.amount_base, locale, setup?.currency_code || 'AFN')} (Rate: {expense.exchange_rate})</strong></div>
          <div className='flex justify-between p-2 text-sm'><strong>TOTAL DISBURSED</strong><strong>{formatCurrency(expense.sub_total, locale, expense.currency)}</strong></div>
        </section>

        <section className='grid grid-cols-3 gap-3 text-center text-[11px]'>
          <div className='border border-gray-200 p-3'>Prepared By<br /><strong>{expense.spent_by?.full_name || '—'}</strong></div>
          <div className='border border-gray-200 p-3'>Processed By<br /><strong>{expense.processed_by?.full_name || '—'}</strong></div>
          <div className='border border-gray-200 p-3'>Approved By<br /><strong>{approver || '—'}</strong></div>
        </section>
      </div>
    </PrintLayout>
  )
}

export default FinanceExpensePrint

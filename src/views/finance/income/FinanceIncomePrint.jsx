import PrintLayout from '@/components/print/PrintLayout'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const FinanceIncomePrint = ({ income, setup, locale }) => {
  const payer = income.client?.company_name || income.client?.primary_contact_name || 'N/A'
  const reference = income.invoice?.invoice_number || income.id
  const hasBalance = toFiniteNumber(income.remind_amount) > 0

  return (
    <PrintLayout
      title='OFFICIAL PAYMENT RECEIPT'
      documentNumber={reference}
      date={toDateInputValue(income.created_at)}
      setup={setup}
      metadata={[{ label: 'Status', value: income.status }]}
      recipientLabel='Payer Signature / Stamp'
      recipientName={payer}
      authorizedName={income.received_by?.full_name}
      authorizedTitle='Received By / Cashier'
      labels={{ authorizedRepresentative: 'Received By Signature & Cashier Stamp', recipientSignature: 'Payer Signature / Stamp' }}
    >
      <div className='flex flex-col gap-5 pb-2 text-xs'>
        <section>
          <h2 className='enterprise-section-title'>Payer & Collection Details</h2>
          <div className='grid grid-cols-2 gap-4'>
            {[['Received From', payer], ['Category / Income Type', income.income_type?.label || 'N/A'], ['Associated Project', income.project?.title || 'N/A'], ['Contract Ref', income.contract?.contract_number || 'N/A'], ['Collected / Received By', income.received_by?.full_name || 'N/A']].map(([label, value]) => <div key={label} className='rounded border border-gray-200 bg-gray-50/50 p-3'><p className='text-[10px] font-semibold uppercase text-gray-500'>{label}</p><p className='mt-1 font-semibold text-gray-800'>{value}</p></div>)}
          </div>
        </section>
        <section>
          <h2 className='enterprise-section-title'>Payment Breakdown</h2>
          <table className='w-full border-collapse'><thead><tr className='bg-gray-50'><th className='border border-gray-200 p-2 text-start'>Description / Reason</th><th className='border border-gray-200 p-2 text-end'>Total Amount</th><th className='border border-gray-200 p-2 text-end'>Amount Paid</th><th className='border border-gray-200 p-2 text-end'>Outstanding Balance</th></tr></thead><tbody><tr><td className='border border-gray-200 p-2'>{income.name}{income.pay_details ? ` — ${income.pay_details}` : ''}</td><td className='border border-gray-200 p-2 text-end'>{formatCurrency(income.total_amount, locale, income.currency)}</td><td className='border border-gray-200 p-2 text-end font-semibold'>{formatCurrency(income.paid_amount, locale, income.currency)}</td><td className='border border-gray-200 p-2 text-end'>{formatCurrency(income.remind_amount, locale, income.currency)}</td></tr></tbody></table>
        </section>
        <section className='ms-auto w-full max-w-[92mm] rounded border border-gray-200 text-xs'><div className='flex justify-between border-b border-gray-200 p-2'><span>Total Received Amount</span><strong>{formatCurrency(income.paid_amount, locale, income.currency)}</strong></div>{income.currency !== (setup?.currency_code || 'AFN') && <div className='flex justify-between border-b border-gray-200 p-2'><span>Base Equivalent</span><strong>{formatCurrency(income.amount_base, locale, setup?.currency_code || 'AFN')}</strong></div>}{hasBalance && <div className='flex justify-between p-2'><span>Next Payment Due</span><strong>{toDateInputValue(income.remind_date) || 'N/A'}</strong></div>}</section>
      </div>
    </PrintLayout>
  )
}

export default FinanceIncomePrint

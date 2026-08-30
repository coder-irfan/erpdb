import PrintLayout from '@/components/print/PrintLayout'
import { toDateInputValue } from '@/utils/contractDuration'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const parsePaymentDetails = value => {
  if (!value) return {}
  if (typeof value === 'object') return value

  try {
    const parsed = JSON.parse(value)

    return parsed && typeof parsed === 'object' ? parsed : { details: String(value) }
  } catch {
    return { details: String(value) }
  }
}

const FinanceIncomePrint = ({ income, setup, locale }) => {
  const payer = income.client?.company_name || income.client?.primary_contact_name || 'N/A'
  const legacyDetails = parsePaymentDetails(income.pay_details)
  const createdYear = new Date(income.created_at).getUTCFullYear()
  const voucherNumber = income.receipt_voucher_number || `RCT-${createdYear}-${income.id.slice(-8).toUpperCase()}`
  const invoiceReference = income.invoice?.invoice_number || 'N/A'
  const paymentReference = `Ref: #${income.id.slice(-6).toUpperCase()}`

  const receiver = income.received_by
    ? `${income.received_by.full_name}${income.received_by.position ? ` (${income.received_by.position})` : ''}`
    : 'N/A'

  const paymentMethod = income.payment_method?.label || legacyDetails.payment_method || 'N/A'
  const paymentDate = toDateInputValue(income.payment_date || legacyDetails.payment_date || income.created_at)
  const paymentNotes = income.notes || legacyDetails.notes || legacyDetails.details || ''

  const cleanDescription = [
    `Payment Method: ${paymentMethod}`,
    `Date: ${paymentDate}`,
    paymentNotes && `Notes: ${paymentNotes}`
  ].filter(Boolean).join(' | ')

  const hasBalance = toFiniteNumber(income.remind_amount) > 0
  const baseCurrency = setup?.currency_code || 'AFN'

  const receivedBase = convertToBaseCurrency(
    income.paid_amount,
    income.currency,
    income.exchange_rate,
    baseCurrency
  )

  return (
    <PrintLayout
      title='OFFICIAL PAYMENT RECEIPT'
      documentNumber={voucherNumber}
      date={paymentDate}
      setup={setup}
      metadata={[
        { label: 'Invoice Reference', value: invoiceReference },
        { label: 'Payment Reference', value: paymentReference },
        { label: 'Status', value: income.status }
      ]}
      recipientLabel='Payer Signature / Stamp'
      recipientName={payer}
      authorizedName={income.received_by?.full_name}
      authorizedTitle={income.received_by?.position || 'Received By / Cashier'}
      labels={{ authorizedRepresentative: 'Received By Signature & Cashier Stamp', recipientSignature: 'Payer Signature / Stamp' }}
    >
      <div className='flex flex-col gap-5 pb-2 text-xs'>
        <section>
          <h2 className='enterprise-section-title'>Payer & Collection Details</h2>
          <div className='grid grid-cols-2 gap-4'>
            {[
              ['Received From', payer],
              ['Category / Income Type', income.income_type?.label || 'N/A'],
              ['Associated Project', income.project?.title || 'N/A'],
              ['Contract Ref', income.contract?.contract_number || 'N/A'],
              ['Collected / Received By', receiver]
            ].map(([label, value]) => (
              <div key={label} className='rounded border border-gray-200 bg-gray-50/50 p-3'>
                <p className='text-[10px] font-semibold uppercase text-gray-500'>{label}</p>
                <p className='mt-1 font-semibold text-gray-800'>{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className='enterprise-section-title'>Payment Breakdown</h2>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='bg-gray-50'>
                <th className='border border-gray-200 p-2 text-start'>Description / Reason</th>
                <th className='border border-gray-200 p-2 text-end'>Total Amount</th>
                <th className='border border-gray-200 p-2 text-end'>Amount Paid</th>
                <th className='border border-gray-200 p-2 text-end'>Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className='border border-gray-200 p-2'>
                  <strong>{income.name}</strong>
                  <div className='mt-1 text-[10px] text-gray-600'>{cleanDescription}</div>
                </td>
                <td className='border border-gray-200 p-2 text-end'>{formatCurrency(income.total_amount, locale, income.currency)}</td>
                <td className='border border-gray-200 p-2 text-end font-semibold'>{formatCurrency(income.paid_amount, locale, income.currency)}</td>
                <td className='border border-gray-200 p-2 text-end'>{formatCurrency(income.remind_amount, locale, income.currency)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className='ms-auto w-full max-w-[92mm] rounded border border-gray-200 text-xs'>
          <div className='flex justify-between border-b border-gray-200 p-2'>
            <span>Total Received Amount</span>
            <strong>{formatCurrency(income.paid_amount, locale, income.currency)}</strong>
          </div>
          {income.currency !== baseCurrency && (
            <div className='flex justify-between border-b border-gray-200 p-2'>
              <span>Base Equivalent</span>
              <strong>{formatCurrency(receivedBase, locale, baseCurrency)}</strong>
            </div>
          )}
          {hasBalance && (
            <div className='flex justify-between p-2'>
              <span>Next Payment Due</span>
              <strong>{toDateInputValue(income.remind_date) || 'N/A'}</strong>
            </div>
          )}
        </section>
      </div>
    </PrintLayout>
  )
}

export default FinanceIncomePrint

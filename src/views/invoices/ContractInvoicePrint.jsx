import PrintLayout from '@/components/print/PrintLayout'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const Detail = ({ label, value }) => <div><dt className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>{label}</dt><dd className='mt-1 text-xs font-bold text-gray-800'>{value || 'N/A'}</dd></div>

const ContractInvoicePrint = ({ invoice, setup, locale, dictionary }) => {
  const print = dictionary.print
  const statusLabel = invoice.is_overdue ? dictionary.status.OVERDUE : invoice.status.label
  const baseCurrency = setup.currency_code || 'AFN'
  const labels = { reference: dictionary.fields.invoiceNumber, issuedDate: dictionary.fields.issueDate, signatures: 'Signatures', recipientSignature: 'Client Acknowledgment', authorizedRepresentative: 'Finance / Accounts Approval', employeeSignatureLine: 'Client Acknowledgment', employerSignatureLine: 'Finance / Accounts Approval', date: 'Date', officialSeal: 'Official Seal', confidentiality: 'Confidential & Proprietary', page: 'Page', of: 'of', taxId: print.taxId }

  return (
    <PrintLayout title='COMMERCIAL INVOICE' documentNumber={invoice.invoice_number} date={toDateInputValue(invoice.issued_date)} setup={setup} labels={labels} metadata={[{ label: dictionary.fields.dueDate, value: toDateInputValue(invoice.due_date) }, { label: dictionary.fields.status, value: statusLabel }]} recipientLabel='Client Acknowledgment' recipientName={invoice.client.primary_contact_name} authorizedTitle='Finance / Accounts Approval'>
      <div className='flex flex-col gap-6 pb-2'>
        <section className='grid grid-cols-2 gap-4'>
          <section className='rounded border border-gray-200 bg-gray-50/50 p-3'><h2 className='enterprise-section-title'>{print.billTo}</h2><dl className='grid gap-3'><Detail label={dictionary.filters.client} value={invoice.client.company_name} /><Detail label='Contact Person' value={invoice.client.primary_contact_name} /><Detail label='Email / Phone' value={[invoice.client.email, invoice.client.phone].filter(Boolean).join(' · ')} /><Detail label={print.taxId} value={invoice.client.tax_id} /></dl></section>
          <section className='rounded border border-gray-200 bg-gray-50/50 p-3'><h2 className='enterprise-section-title'>{dictionary.fields.contract}</h2><dl className='grid gap-3'><Detail label='Associated Contract' value={`${invoice.contract.contract_number} — ${invoice.contract.title}`} /><Detail label={dictionary.fields.issueDate} value={toDateInputValue(invoice.issued_date)} /><Detail label={dictionary.fields.dueDate} value={toDateInputValue(invoice.due_date)} /><Detail label={dictionary.fields.status} value={statusLabel} /></dl></section>
        </section>
        <section>
          <h2 className='enterprise-section-title'>Payment Breakdown</h2>
          <table className='w-full border-collapse text-xs'><thead className='bg-gray-100 text-[10px] uppercase tracking-wide text-gray-600'><tr><th className='w-12 border border-gray-200 px-3 py-2'>#</th><th className='border border-gray-200 px-3 py-2 text-start'>Description</th><th className='border border-gray-200 px-3 py-2 text-start'>{dictionary.fields.dueDate}</th><th className='border border-gray-200 px-3 py-2 text-end'>{dictionary.fields.amount}</th></tr></thead><tbody><tr><td className='border border-gray-200 px-3 py-2 text-center'>1</td><td className='border border-gray-200 px-3 py-2 font-semibold'>{invoice.contract.title} (Invoice Installment)</td><td className='border border-gray-200 px-3 py-2'>{toDateInputValue(invoice.due_date)}</td><td className='border border-gray-200 px-3 py-2 text-end font-semibold'>{formatCurrency(invoice.amount, locale, invoice.currency)}</td></tr></tbody></table>
          <div className='ms-auto mt-4 max-w-[280px] text-xs'><div className='flex justify-between border-b border-gray-200 py-2'><span>Subtotal / Net Amount</span><strong>{formatCurrency(invoice.amount, locale, invoice.currency)}</strong></div>{invoice.currency !== baseCurrency && <div className='flex justify-between border-b border-gray-200 py-2'><span>Base Equivalent</span><strong>{formatCurrency(invoice.amount_base, locale, baseCurrency)}</strong></div>}<div className='flex justify-between border-b-2 border-gray-700 py-2.5 text-sm'><strong>{print.amountDue}</strong><strong>{formatCurrency(invoice.amount, locale, invoice.currency)}</strong></div></div>
        </section>
      </div>
    </PrintLayout>
  )
}

export default ContractInvoicePrint

import { formatCurrency } from '@/utils/formatCurrency'
import { formatStatusLabel } from '@/utils/formatStatusLabel'

const DATE_LOCALES = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) => value
  ? new Intl.DateTimeFormat(DATE_LOCALES[locale] || DATE_LOCALES.en, { dateStyle: 'long' }).format(new Date(value))
  : '—'

const SectionHeader = ({ children }) => <h2 className='enterprise-section-title'>{children}</h2>

const Detail = ({ label, value, className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    <dt className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>{label}</dt>
    <dd className='mt-1 break-words text-xs font-bold text-gray-800'>{value || '—'}</dd>
  </div>
)

const Term = ({ label, value }) => (
  <div className='min-w-0 rounded border border-gray-200 bg-white px-3 py-2.5'>
    <div className='text-[9px] font-semibold uppercase tracking-wide text-gray-500'>{label}</div>
    <div className='mt-1 break-words text-xs font-semibold text-gray-800'>{value || '—'}</div>
  </div>
)

const StaffContractPrintDocument = ({ contract, setup, locale, dictionary }) => {
  const print = dictionary.print
  const currency = contract.currency || 'AFN'
  const isAfnSalary = currency.toUpperCase() === 'AFN'
  const salary = formatCurrency(contract.base_salary, locale, currency)

  return (
    <div className='flex flex-col gap-7 pb-2'>
      <section>
        <SectionHeader>{print.parties}</SectionHeader>
        <div className='grid grid-cols-2 gap-4'>
          <section className='rounded border border-gray-200 bg-gray-50/50 p-3'>
            <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-700'>{print.employer}</h3>
            <dl className='grid gap-3'>
              <Detail label={print.companyName} value={setup.company_name} />
              <Detail label={print.authorizedRepresentative} value={setup.signatory_name || setup.company_name} />
              <Detail label={print.representativeTitle} value={setup.signatory_title} />
              <Detail label={dictionary.fields.address} value={setup.company_address} />
            </dl>
          </section>
          <section className='rounded border border-gray-200 bg-gray-50/50 p-3'>
            <h3 className='mb-3 text-xs font-bold uppercase tracking-wide text-gray-700'>{print.employee}</h3>
            <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
              <Detail label={dictionary.fields.staffMember} value={contract.staff.full_name} />
              <Detail label={dictionary.fields.fatherName} value={contract.staff.father_name} />
              <Detail label={dictionary.fields.tazkiraNo} value={contract.staff.tazkira_no} />
              <Detail label={dictionary.fields.position} value={contract.staff?.position} />
              <Detail label={dictionary.fields.phone} value={contract.staff.phone} />
              <Detail label={dictionary.fields.email} value={contract.staff.email} />
              <Detail className='col-span-2' label={dictionary.fields.address} value={contract.staff.address} />
              {(contract.staff.guarantor_name || contract.staff.guarantor_phone) && (
                <Detail
                  className='col-span-2'
                  label={print.guarantor}
                  value={[contract.staff.guarantor_name, contract.staff.guarantor_phone].filter(Boolean).join(' · ')}
                />
              )}
            </dl>
          </section>
        </div>
      </section>

      <section>
        <SectionHeader>{print.terms}</SectionHeader>
        <div className='grid grid-cols-2 gap-2 rounded bg-gray-50 p-2 sm:grid-cols-4'>
          <Term label={dictionary.fields.contractType} value={contract.contract_type.label} />
          <Term label={dictionary.fields.status} value={formatStatusLabel(contract.status.value, dictionary.status[contract.status.value] || contract.status.label)} />
          <Term label={dictionary.fields.currency} value={currency} />
          <Term label={dictionary.fields.duration || 'Duration'} value={contract.duration_label} />
          <Term label={dictionary.fields.baseSalary} value={salary} />
          <Term label={print.exchangeRate} value={isAfnSalary ? '1.0000' : contract.exchange_rate} />
          <Term label={print.baseCurrencyValue} value={formatCurrency(contract.amount_base, locale, setup.currency_code || 'AFN')} />
          <Term label={dictionary.fields.startDate} value={formatDate(contract.start_date, locale)} />
          <Term label={dictionary.fields.endDate} value={formatDate(contract.end_date, locale)} />
        </div>
      </section>

      <section>
        <SectionHeader>{print.legalClauses}</SectionHeader>
        <div
          className='enterprise-legal-content print-document-body rounded border border-gray-200 bg-white px-4 py-3 text-justify text-xs leading-relaxed text-gray-800'
          dangerouslySetInnerHTML={{ __html: contract.content_html || `<p>${dictionary.details.noContent}</p>` }}
        />
        <div className='mt-3 grid gap-2 rounded border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-800'>
          <p><strong>Probation:</strong> The first {contract.probation_days || 90} days constitute the probation period, subject to applicable employment law and documented performance review.</p>
          <p><strong>Termination and resignation notice:</strong> Either party must provide at least {contract.notice_period_days || 30} days written notice, except where immediate termination is permitted by law.</p>
          <p><strong>Final settlement:</strong> On termination, earned salary, approved benefits, recoverable advances, and any lawful severance must be reconciled before final clearance.</p>
        </div>
      </section>
    </div>
  )
}

export { formatDate }
export default StaffContractPrintDocument

import { formatCurrency } from '@/utils/formatCurrency'

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

const TermsRow = ({ children, shaded = false }) => <tr className={shaded ? 'bg-gray-50' : 'bg-white'}>{children}</tr>
const TermsLabel = ({ children }) => <th className='w-1/4 border border-gray-200 px-3 py-2.5 text-start text-[10px] font-semibold uppercase tracking-wide text-gray-500'>{children}</th>
const TermsValue = ({ children, colSpan }) => <td colSpan={colSpan} className='border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-800'>{children}</td>

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
              <Detail label={dictionary.fields.position} value={contract.position_title} />
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
        <table className='w-full border-collapse'>
          <tbody>
            <TermsRow><TermsLabel>{dictionary.fields.contractType}</TermsLabel><TermsValue>{contract.contract_type.label}</TermsValue><TermsLabel>{dictionary.fields.status}</TermsLabel><TermsValue>{dictionary.status[contract.status.value] || contract.status.label}</TermsValue></TermsRow>
            {isAfnSalary ? (
              <TermsRow shaded><TermsLabel>{dictionary.fields.baseSalary}</TermsLabel><TermsValue colSpan={3}>{salary}</TermsValue></TermsRow>
            ) : (
              <TermsRow shaded><TermsLabel>{dictionary.fields.baseSalary}</TermsLabel><TermsValue>{salary}</TermsValue><TermsLabel>{print.exchangeRate}</TermsLabel><TermsValue>{contract.exchange_rate}</TermsValue></TermsRow>
            )}
            <TermsRow><TermsLabel>{dictionary.fields.startDate}</TermsLabel><TermsValue>{formatDate(contract.start_date, locale)}</TermsValue><TermsLabel>{dictionary.fields.endDate}</TermsLabel><TermsValue>{formatDate(contract.end_date, locale)}</TermsValue></TermsRow>
            {!isAfnSalary && <TermsRow shaded><TermsLabel>{print.baseCurrencyValue}</TermsLabel><TermsValue colSpan={3}>{formatCurrency(contract.amount_base, locale, setup.currency_code || 'AFN')}</TermsValue></TermsRow>}
          </tbody>
        </table>
      </section>

      <section>
        <SectionHeader>{print.legalClauses}</SectionHeader>
        <div
          className='enterprise-legal-content print-document-body rounded border border-gray-200 bg-white px-4 py-3 text-justify text-xs leading-relaxed text-gray-800'
          dangerouslySetInnerHTML={{ __html: contract.content_html || `<p>${dictionary.details.noContent}</p>` }}
        />
      </section>
    </div>
  )
}

export { formatDate }
export default StaffContractPrintDocument

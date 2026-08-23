const DEFAULT_LABELS = {
  reference: 'Reference Number',
  issuedDate: 'Issued Date',
  authorizedRepresentative: 'Employer / Authorized Signatory',
  recipientSignature: 'Employee Signature',
  signatures: 'Signatures',
  date: 'Date',
  page: 'Page',
  of: 'of',
  confidentiality: 'Confidential & Proprietary',
  officialSeal: 'Official Seal',
  taxId: 'Tax ID',
  employeeSignatureLine: 'Employee Signature',
  employerSignatureLine: 'Employer / Authorized Signatory'
}

const PrintLayout = ({
  title,
  documentNumber,
  date,
  setup,
  children,
  labels = {},
  metadata = [],
  recipientName,
  recipientLabel,
  authorizedName,
  authorizedTitle,
  landscape = false
}) => {
  const text = { ...DEFAULT_LABELS, ...labels }
  const companyName = setup?.company_name || setup?.app_name || 'Company'
  const logoSrc = setup?.company_logo || setup?.print_logo || null

  return (
    <article
      className={`enterprise-print-root enterprise-print-document mx-auto w-full bg-white text-black shadow-lg ${
        landscape ? 'max-w-[297mm]' : 'max-w-[210mm]'
      }`}
    >
      <div className='flex min-h-[200mm] print:min-h-0 flex-col px-6 py-7 sm:px-[18mm] sm:py-[15mm]'>
        <header className='print-letterhead flex items-start justify-between gap-6 border-b border-gray-200 pb-4'>
          <div className='flex min-h-10 min-w-28 items-center'>
            {logoSrc ? (
              <img src={logoSrc} alt={companyName} className='max-h-10 w-auto max-w-40 object-contain object-left' />
            ) : (
              <span className='text-lg font-bold tracking-wide text-gray-800'>{companyName}</span>
            )}
          </div>
          <address className='max-w-[105mm] not-italic text-end text-[11px] leading-tight text-gray-500'>
            <div className='mb-1 text-sm font-bold text-gray-800'>{companyName}</div>
            {setup?.company_address && <div className='whitespace-pre-line'>{setup.company_address}</div>}
            <div className='mt-1'>{[setup?.company_phone, setup?.company_email].filter(Boolean).join(' · ')}</div>
            {setup?.company_tax_id && (
              <div className='mt-1'>
                {text.taxId}: {setup.company_tax_id}
              </div>
            )}
          </address>
        </header>

        <section className='print-document-meta py-6 text-center'>
          <h1 className='m-0 text-xl font-bold uppercase tracking-wider text-gray-800'>{title}</h1>
          <div className='mt-3 flex flex-wrap justify-center gap-2 text-xs text-gray-600'>
            <span className='rounded bg-gray-100 px-3 py-1'>
              <strong className='font-semibold text-gray-700'>{text.reference}:</strong> {documentNumber || '—'}
            </span>
            <span className='rounded bg-gray-100 px-3 py-1'>
              <strong className='font-semibold text-gray-700'>{text.issuedDate}:</strong> {date || '—'}
            </span>
            {metadata
              .filter(item => item?.value)
              .map(item => (
                <span key={item.label} className='rounded bg-gray-100 px-3 py-1'>
                  {item.label && <strong className='font-semibold text-gray-700'>{item.label}:</strong>} {item.value}
                </span>
              ))}
          </div>
        </section>

        <main className='enterprise-print-content grow'>{children}</main>

        <footer className='print-signatures enterprise-print-footer mt-auto pt-8'>
          <h2 className='enterprise-section-title'>{text.signatures}</h2>
          <div className='grid grid-cols-2 gap-8'>
            <section className='enterprise-signature-card'>
              <div className='text-sm font-semibold text-gray-800'>{recipientLabel || text.recipientSignature}</div>
              {recipientName && <div className='mt-1 text-xs font-medium text-gray-600'>{recipientName}</div>}
              <div className='mt-12 border-b border-gray-500' />
              <div className='mt-2 flex justify-between gap-4 text-[11px] text-gray-500'>
                <span>{text.employeeSignatureLine}</span>
                <span>{text.date}: __________</span>
              </div>
            </section>
            <section className='enterprise-signature-card relative'>
              <div className='text-sm font-semibold text-gray-800'>{text.authorizedRepresentative}</div>
              <div className='mt-1 text-xs font-medium text-gray-600'>{authorizedName || setup?.signatory_name || companyName}</div>
              {(authorizedTitle || setup?.signatory_title) && <div className='text-[11px] text-gray-500'>{authorizedTitle || setup.signatory_title}</div>}
              <div className='enterprise-stamp-box absolute right-3 top-9 flex items-center justify-center'>
                {setup?.signatory_stamp ? (
                  <img
                    src={setup.signatory_stamp}
                    alt={text.authorizedRepresentative}
                    className='max-h-14 max-w-20 object-contain opacity-90'
                  />
                ) : (
                  <span>{text.officialSeal}</span>
                )}
              </div>
              <div className='mt-12 border-b border-gray-500' />
              <div className='mt-2 flex justify-between gap-4 text-[11px] text-gray-500'>
                <span>{text.employerSignatureLine}</span>
                <span>{text.date}: __________</span>
              </div>
            </section>
          </div>
          <div className='mt-8 flex items-end justify-between gap-6 border-t border-gray-300 pt-3 text-[10px] text-gray-500'>
            <span>
              {text.confidentiality} — {companyName}
            </span>
            <span className='whitespace-nowrap'>
              {text.page} 1 {text.of} 1
            </span>
          </div>
        </footer>
      </div>
    </article>
  )
}

export default PrintLayout

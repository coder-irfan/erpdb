import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const Detail = ({ label, value }) => (
  <div>
    <Typography component='dt' className='text-[10pt] font-semibold uppercase tracking-wide text-gray-500'>
      {label}
    </Typography>
    <Typography component='dd' className='mt-1 text-[11pt] text-black'>
      {value || '—'}
    </Typography>
  </div>
)

const PrintLayout = ({ contract, setup, dictionary, locale = 'en' }) => {
  const currency = setup.currency_code || 'AFN'

  return (
    <article className='print-container mx-auto flex w-[210mm] flex-col bg-white p-[20mm] text-black shadow-lg'>
      <header className='print-letterhead flex items-start justify-between gap-8 border-b-2 border-black pb-5'>
        <div className='flex min-h-20 min-w-32 items-center'>
          {setup.company_logo ? (
            <img src={setup.company_logo} alt={setup.company_name} className='max-h-20 max-w-48 object-contain' />
          ) : (
            <Typography className='text-xl font-bold text-black'>{setup.company_name}</Typography>
          )}
        </div>
        <div className='max-w-[115mm] text-right'>
          <Typography component='h1' className='text-xl font-bold text-black'>
            {setup.company_name}
          </Typography>
          {setup.company_address && (
            <Typography className='mt-1 whitespace-pre-line text-[10pt]'>{setup.company_address}</Typography>
          )}
          <Typography className='mt-1 text-[10pt]'>
            {[setup.company_phone, setup.company_email].filter(Boolean).join(' · ')}
          </Typography>
          {setup.company_tax_id && (
            <Typography className='text-[10pt]'>{`${dictionary.print.taxId}: ${setup.company_tax_id}`}</Typography>
          )}
        </div>
      </header>

      <section className='py-8 text-center'>
        <Typography component='h2' className='text-2xl font-bold tracking-wide text-black'>
          {dictionary.print.title}
        </Typography>
        <Typography className='mt-2 text-[11pt]'>{`${dictionary.fields.contractNumber}: ${contract.contract_number}`}</Typography>
      </section>

      <dl className='grid grid-cols-2 gap-x-10 gap-y-5 rounded border border-gray-400 p-5'>
        <Detail label={dictionary.fields.staffMember} value={contract.staff.full_name} />
        <Detail label={dictionary.fields.tazkiraNo} value={contract.staff.tazkira_no} />
        <Detail label={dictionary.fields.position} value={contract.position_title} />
        <Detail label={dictionary.fields.contractType} value={contract.contract_type.label} />
        <Detail label={dictionary.fields.baseSalary} value={formatCurrency(contract.base_salary, locale, currency)} />
        <Detail label={dictionary.fields.startDate} value={contract.start_date.slice(0, 10)} />
        <Detail label={dictionary.fields.endDate} value={contract.end_date?.slice(0, 10)} />
        <Detail
          label={dictionary.fields.status}
          value={dictionary.status[contract.status.value] || contract.status.label}
        />
      </dl>

      <section
        className='print-document-body policy-document-preview py-8 text-[11pt] leading-[1.7] text-black'
        dangerouslySetInnerHTML={{ __html: contract.content_html || `<p>${dictionary.details.noContent}</p>` }}
      />

      <footer className='print-signatures mt-auto grid grid-cols-2 gap-16 pt-16'>
        <div>
          <Typography className='font-semibold text-black'>{dictionary.print.employeeSignature}</Typography>
          <div className='mt-12 border-b border-dotted border-black' />
          <Typography className='mt-2 text-[10pt]'>{contract.staff.full_name}</Typography>
          <Typography className='mt-5 text-[10pt]'>{`${dictionary.print.date}: ____________________`}</Typography>
        </div>
        <div className='relative'>
          <Typography className='font-semibold text-black'>{dictionary.print.employerSignature}</Typography>
          {setup.signatory_stamp && (
            <img
              src={setup.signatory_stamp}
              alt={dictionary.print.signatoryStamp}
              className='absolute left-8 top-5 max-h-20 max-w-32 object-contain opacity-80'
            />
          )}
          <div className='mt-12 border-b border-dotted border-black' />
          <Typography className='mt-2 text-[10pt]'>{setup.signatory_name || setup.company_name}</Typography>
          <Typography className='text-[10pt]'>{setup.signatory_title}</Typography>
          <Typography className='mt-5 text-[10pt]'>{`${dictionary.print.date}: ____________________`}</Typography>
        </div>
      </footer>
    </article>
  )
}

export default PrintLayout

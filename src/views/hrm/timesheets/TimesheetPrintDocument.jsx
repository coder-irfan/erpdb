import PrintLayout from '@/components/print/PrintLayout'

const DATE_LOCALES = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatPeriod = (value, locale) =>
  new Intl.DateTimeFormat(DATE_LOCALES[locale] || DATE_LOCALES.en, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}-01T00:00:00.000Z`))

const formatDay = (value, locale) =>
  new Intl.DateTimeFormat(DATE_LOCALES[locale] || DATE_LOCALES.en, {
    weekday: 'short',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00.000Z`))

const formatTimeRange = record =>
  record.check_in_time || record.check_out_time
    ? `${record.check_in_time || '—'} / ${record.check_out_time || '—'}`
    : '—'

const IndividualTimesheetPrintDocument = ({ staff, records, period, locale, dictionary, setup }) => {
  const print = dictionary.print
  const totalHours = records.reduce((total, record) => total + Number(record.hours_worked || 0), 0)
  const presentDays = records.filter(record => record.status === 'PRESENT').length
  const offLeaveDays = records.filter(record => record.status === 'ABSENT' || record.status === 'LEAVE').length
  const orderedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date))

  const labels = {
    reference: print.period,
    issuedDate: print.generatedOn,
    signatures: print.approvals,
    recipientSignature: print.employeeSignature,
    authorizedRepresentative: print.supervisorApproval,
    employeeSignatureLine: print.employeeSignature,
    employerSignatureLine: print.supervisorApproval,
    date: print.date,
    officialSeal: print.officialSeal,
    confidentiality: print.confidentiality,
    page: print.page,
    of: print.of,
    taxId: print.taxId
  }

  return (
    <div className='timesheet-print-root hidden print:block'>
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .timesheet-print-root .enterprise-print-document { width: 100% !important; max-width: none !important; }
          .timesheet-print-root .enterprise-print-document > div { min-height: 0 !important; padding: 6mm 8mm !important; }
          .timesheet-print-root .enterprise-print-footer { margin-top: 0.75rem !important; padding-top: 0.5rem !important; page-break-inside: avoid; }
          .timesheet-print-root .enterprise-signature-card { min-height: 0; padding: 0.5rem; }
          .timesheet-print-root .enterprise-signature-card > .mt-12 { margin-top: 1rem !important; }
          .timesheet-print-root .enterprise-print-content th,
          .timesheet-print-root .enterprise-print-content td { padding: 3px 6px !important; font-size: 10px !important; }
        }
      `}</style>
      <PrintLayout
        title={print.individualTitle}
        documentNumber={formatPeriod(period, locale)}
        date={formatPeriod(period, locale)}
        setup={setup}
        landscape
        labels={labels}
        metadata={[
          { label: print.employee, value: staff.full_name },
          { label: dictionary.fields.position, value: staff.position },
          { label: print.period, value: formatPeriod(period, locale) }
        ]}
        recipientLabel={print.employeeSignature}
        recipientName={staff.full_name}
        authorizedName={setup?.signatory_name || undefined}
        authorizedTitle={print.supervisorApproval}
      >
        <section className='mb-3 grid grid-cols-3 overflow-hidden rounded border border-gray-300 bg-white'>
          {[
            [print.totalLoggedHours, `${totalHours.toFixed(2)} ${dictionary.hoursShort}`],
            [print.presentDays, presentDays],
            [print.offLeaveDays, offLeaveDays]
          ].map(([label, value], index) => (
            <div key={label} className={`px-2 py-1.5 text-center ${index < 2 ? 'border-e border-gray-300' : ''}`}>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>{label}</div>
              <div className='text-sm font-bold text-gray-900'>{value}</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className='enterprise-section-title'>{print.dailyLog}</h2>
          <table className='w-full border-collapse border border-gray-300 text-xs text-gray-800'>
            <thead className='bg-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-700'>
              <tr>
                <th className='w-[18%] border border-gray-300 px-2 py-1 text-start'>{dictionary.fields.date}</th>
                <th className='w-[17%] border border-gray-300 px-2 py-1 text-start'>{print.day}</th>
                <th className='w-[26%] border border-gray-300 px-2 py-1 text-start'>{print.timeInOut}</th>
                <th className='w-[20%] border border-gray-300 px-2 py-1 text-start'>{dictionary.fields.status}</th>
                <th className='w-[19%] border border-gray-300 px-2 py-1 text-end'>{dictionary.fields.hours}</th>
              </tr>
            </thead>
            <tbody>
              {orderedRecords.length ? orderedRecords.map((record, index) => (
                <tr key={record.id} className={index % 2 ? 'bg-gray-50' : ''}>
                  <td className='border border-gray-300 px-2 py-1'>{record.date}</td>
                  <td className='border border-gray-300 px-2 py-1'>{formatDay(record.date, locale)}</td>
                  <td className='border border-gray-300 px-2 py-1 whitespace-nowrap'>{formatTimeRange(record)}</td>
                  <td className='border border-gray-300 px-2 py-1'>{dictionary.status[record.status] || record.status}</td>
                  <td className='border border-gray-300 px-2 py-1 text-end'>{record.hours_worked ? `${Number(record.hours_worked).toFixed(2)} ${dictionary.hoursShort}` : '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className='border border-gray-300 px-2 py-4 text-center text-gray-500'>{print.noRecords}</td></tr>
              )}
            </tbody>
            <tfoot className='bg-gray-50 font-bold'>
              <tr>
                <td colSpan={4} className='border border-gray-300 px-2 py-1 text-end uppercase tracking-wide text-gray-600'>{print.totalLoggedHours}</td>
                <td className='border border-gray-300 px-2 py-1 text-end'>{totalHours.toFixed(2)} {dictionary.hoursShort}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      </PrintLayout>
    </div>
  )
}

export default IndividualTimesheetPrintDocument

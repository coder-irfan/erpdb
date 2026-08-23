import PrintLayout from '@/components/print/PrintLayout'
import { formatCurrency } from '@/utils/formatCurrency'

const DATE_LOCALES = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(DATE_LOCALES[locale] || DATE_LOCALES.en, {
        dateStyle: 'medium',
        timeZone: 'UTC'
      }).format(new Date(value))
    : '—'

const formatMonth = (value, locale) =>
  new Intl.DateTimeFormat(DATE_LOCALES[locale] || DATE_LOCALES.en, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}-01T00:00:00.000Z`))

const PrintSummary = ({ stats }) => (
  <section className='mb-5 grid grid-cols-4 overflow-hidden rounded border border-gray-200 bg-gray-50'>
    {stats.map(({ label, value }, index) => (
      <div key={label} className={`px-3 py-2.5 text-center ${index < stats.length - 1 ? 'border-e border-gray-200' : ''}`}>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>{label}</div>
        <div className='mt-1 text-sm font-bold text-gray-800'>{value}</div>
      </div>
    ))}
  </section>
)

const Table = ({ children, className = '' }) => (
  <table className={`w-full border-collapse text-xs text-gray-800 ${className}`}>{children}</table>
)

const Head = ({ children }) => <th className='border border-gray-200 bg-gray-100 px-2 py-2 text-start text-[10px] font-semibold uppercase tracking-wide text-gray-600'>{children}</th>
const Cell = ({ children, className = '' }) => <td className={`border border-gray-200 px-2 py-2 align-top ${className}`}>{children}</td>
const Empty = ({ colSpan, message }) => <tr><td colSpan={colSpan} className='border border-gray-200 px-2 py-6 text-center text-gray-500'>{message}</td></tr>

const ReportLayout = ({ reportType, rows, stats, startDate, endDate, selectedStaff, setup, locale, dictionary, generatedAt, children }) => {
  const print = dictionary.print

  const labels = {
    reference: dictionary.filters.dateRange,
    issuedDate: print.generated,
    signatures: print.signatures,
    recipientSignature: print.preparedBy,
    authorizedRepresentative: print.approvedBy,
    employeeSignatureLine: print.preparedBy,
    employerSignatureLine: print.approvedBy,
    date: print.date,
    officialSeal: print.officialSeal,
    confidentiality: print.confidentiality,
    page: print.page,
    of: print.of,
    taxId: print.taxId
  }

  return (
    <div className='hidden print:block'>
      <PrintLayout
        title={dictionary.tabs[reportType].label}
        documentNumber={`${formatDate(`${startDate}T00:00:00.000Z`, locale)} — ${formatDate(`${endDate}T00:00:00.000Z`, locale)}`}
        date={formatDate(generatedAt, locale)}
        setup={setup}
        labels={labels}
        metadata={[
          { label: dictionary.filters.staff, value: selectedStaff?.full_name || dictionary.filters.allStaff }
        ]}
        landscape={reportType === 'attendance'}
      >
        <PrintSummary stats={stats} />
        {children}
      </PrintLayout>
    </div>
  )
}

export const PayrollSummaryPrint = props => {
  const { rows, locale, dictionary } = props

  return (
    <ReportLayout {...props} reportType='payroll'>
      <Table>
        <thead><tr><Head>{dictionary.table.staff}</Head><Head>{dictionary.table.position}</Head><Head>{dictionary.table.period}</Head><Head>{dictionary.table.baseSalary}</Head><Head>{dictionary.table.allowances}</Head><Head>{dictionary.table.deductions}</Head><Head>{dictionary.table.netPayout}</Head><Head>{dictionary.table.status}</Head></tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={row.id} className={index % 2 ? 'bg-gray-50' : ''}><Cell>{row.staff_name}</Cell><Cell>{row.position}</Cell><Cell>{formatMonth(row.period, locale)}</Cell><Cell>{formatCurrency(row.base_salary, locale, row.currency)}</Cell><Cell>{formatCurrency(row.allowances, locale, row.currency)}</Cell><Cell>{formatCurrency(row.deductions, locale, row.currency)}</Cell><Cell className='font-semibold'>{formatCurrency(row.net_payout, locale, row.currency)}</Cell><Cell>{dictionary.status[row.status] || row.status_label}</Cell></tr>) : <Empty colSpan={8} message={dictionary.empty.description} />}</tbody>
      </Table>
    </ReportLayout>
  )
}

export const TimesheetSummaryPrint = props => {
  const { rows, dictionary } = props

  return (
    <ReportLayout {...props} reportType='attendance'>
      <Table>
        <thead><tr><Head>{dictionary.table.staff}</Head><Head>{dictionary.table.position}</Head><Head>{dictionary.table.present}</Head><Head>{dictionary.table.absent}</Head><Head>{dictionary.table.leave}</Head><Head>{dictionary.table.hours}</Head><Head>{dictionary.table.presenceRate}</Head></tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={row.id} className={index % 2 ? 'bg-gray-50' : ''}><Cell>{row.staff_name}</Cell><Cell>{row.position}</Cell><Cell>{row.present}</Cell><Cell>{row.absent}</Cell><Cell>{row.leave}</Cell><Cell>{row.total_hours}</Cell><Cell>{row.presence_rate}%</Cell></tr>) : <Empty colSpan={7} message={dictionary.empty.description} />}</tbody>
      </Table>
    </ReportLayout>
  )
}

export const LeaveBalanceReportPrint = props => {
  const { rows, dictionary } = props

  return (
    <ReportLayout {...props} reportType='leaves'>
      <Table>
        <thead><tr><Head>{dictionary.table.staff}</Head><Head>{dictionary.table.position}</Head><Head>{dictionary.table.approvedDays}</Head><Head>{dictionary.table.pending}</Head><Head>{dictionary.table.leaveBreakdown}</Head><Head>{dictionary.table.allowance}</Head><Head>{dictionary.table.remaining}</Head></tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={row.id} className={index % 2 ? 'bg-gray-50' : ''}><Cell>{row.staff_name}</Cell><Cell>{row.position}</Cell><Cell>{row.approved_days}</Cell><Cell>{row.pending_requests}</Cell><Cell>{row.leave_types.length ? row.leave_types.map(item => `${item.name}: ${item.days}`).join(', ') : '—'}</Cell><Cell>{row.allowance_days ?? dictionary.common.notConfigured}</Cell><Cell>{row.remaining_days ?? dictionary.common.notConfigured}</Cell></tr>) : <Empty colSpan={7} message={dictionary.empty.description} />}</tbody>
      </Table>
    </ReportLayout>
  )
}

export const ContractExpirationReportPrint = props => {
  const { rows, locale, dictionary } = props

  return (
    <ReportLayout {...props} reportType='contracts'>
      <Table>
        <thead><tr><Head>{dictionary.table.contractNumber}</Head><Head>{dictionary.table.staff}</Head><Head>{dictionary.table.position}</Head><Head>{dictionary.table.contractType}</Head><Head>{dictionary.table.endDate}</Head><Head>{dictionary.table.daysRemaining}</Head><Head>{dictionary.table.renewalStatus}</Head></tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={row.id} className={index % 2 ? 'bg-gray-50' : ''}><Cell>{row.contract_number}</Cell><Cell>{row.staff_name}</Cell><Cell>{row.position}</Cell><Cell>{row.contract_type}</Cell><Cell>{formatDate(row.end_date, locale)}</Cell><Cell>{row.days_remaining}</Cell><Cell>{dictionary.status[row.renewal_status] || row.renewal_status}</Cell></tr>) : <Empty colSpan={7} message={dictionary.empty.description} />}</tbody>
      </Table>
    </ReportLayout>
  )
}

const ActiveHrmReportPrint = props => {
  if (props.reportType === 'attendance') return <TimesheetSummaryPrint {...props} />
  if (props.reportType === 'leaves') return <LeaveBalanceReportPrint {...props} />
  if (props.reportType === 'contracts') return <ContractExpirationReportPrint {...props} />

  return <PayrollSummaryPrint {...props} />
}

export default ActiveHrmReportPrint
 
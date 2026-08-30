import PrintLayout from '@/components/print/PrintLayout'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const Detail = ({ label, value }) => (
  <div>
    <dt className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>{label}</dt>
    <dd className='mt-1 break-words text-xs font-bold text-gray-800'>{value || '—'}</dd>
  </div>
)

const SalaryPayslipPrintDocument = ({ salary, company, locale, dictionary }) => {
  const print = dictionary.payslip.print
  const paymentDate = salary.payment_date ? salary.payment_date.slice(0, 10) : print.pending
  const processor = salary.processed_by?.full_name || salary.processor_identity?.full_name || null
  const showEquivalent = salary.currency !== 'AFN' || toFiniteNumber(salary.payable_usd) > 0

  const labels = {
    reference: print.payPeriod,
    issuedDate: print.paymentDate,
    signatures: print.approvals,
    recipientSignature: print.employeeSignature,
    authorizedRepresentative: print.processedApprovedBy,
    employeeSignatureLine: print.employeeSignature,
    employerSignatureLine: print.processedApprovedBy,
    date: print.date,
    officialSeal: print.officialSeal,
    confidentiality: print.confidentiality,
    page: print.page,
    of: print.of,
    taxId: print.taxId
  }

  const rows = [
    [print.baseSalary, print.base, salary.base_salary],
    [print.earnedSalary, print.earning, salary.earned_salary],
    [print.bonus, print.earning, salary.bonus_amount],
    ['Unpaid leave deduction', print.deduction, salary.unpaid_leave_deduction],
    [print.loanDeduction, print.deduction, salary.loan_deduction]
  ]

  return (
    <PrintLayout
      title={print.title}
      documentNumber={salary.timesheet_month}
      date={paymentDate}
      setup={company}
      labels={labels}
      metadata={[{ label: print.status, value: dictionary.status[salary.status] || salary.status }]}
      recipientLabel={print.employeeSignature}
      recipientName={salary.staff.full_name}
      authorizedName={processor}
      authorizedTitle={processor ? print.processedApprovedBy : undefined}
    >
      <div className='flex flex-col gap-6 pb-2'>
        <section className='grid grid-cols-2 gap-4'>
          <section className='rounded border border-gray-200 bg-gray-50/50 p-3'>
            <h2 className='enterprise-section-title'>{print.employeeInformation}</h2>
            <dl className='grid gap-3'>
              <Detail label={print.staffMember} value={salary.staff.full_name} />
              <Detail label={print.position} value={salary.staff.position} />
              <Detail label={print.employeeId} value={salary.staff.id} />
            </dl>
          </section>
          <section className='rounded border border-gray-200 bg-gray-50/50 p-3'>
            <h2 className='enterprise-section-title'>{print.attendanceRate}</h2>
            <dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
              <Detail label={print.totalDays} value={salary.total_month_days} />
              <Detail label={print.daysWorked} value={salary.worked_days} />
              <Detail label={print.offDays} value={salary.off_days} />
              <Detail label={print.dailyRate} value={formatCurrency(salary.base_daily_rate, locale, salary.currency)} />
            </dl>
          </section>
        </section>

        <section>
          <h2 className='enterprise-section-title'>{print.salaryBreakdown}</h2>
          <table className='w-full border-collapse text-xs'>
            <thead className='bg-gray-100 text-[10px] uppercase tracking-wide text-gray-600'>
              <tr>
                <th className='border border-gray-200 px-3 py-2 text-start'>{print.description}</th>
                <th className='w-1/4 border border-gray-200 px-3 py-2 text-start'>{print.type}</th>
                <th className='w-1/4 border border-gray-200 px-3 py-2 text-end'>{print.amount}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([description, type, amount], index) => (
                <tr key={description} className={index % 2 ? 'bg-gray-50' : 'bg-white'}>
                  <td className='border border-gray-200 px-3 py-2 font-semibold text-gray-800'>{description}</td>
                  <td className='border border-gray-200 px-3 py-2 text-gray-600'>{type}</td>
                  <td className={`border border-gray-200 px-3 py-2 text-end font-semibold ${type === print.deduction ? 'text-red-700' : 'text-gray-800'}`}>
                    {type === print.deduction ? '− ' : ''}{formatCurrency(amount, locale, salary.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className='bg-gray-100'>
                <td colSpan={2} className='border border-gray-300 px-3 py-2.5 text-end text-sm font-bold text-gray-800'>{print.totalNetPayable}</td>
                <td className='border border-gray-300 px-3 py-2.5 text-end text-sm font-bold text-gray-900'>{formatCurrency(salary.payable_amount, locale, salary.currency)}</td>
              </tr>
            </tfoot>
          </table>
          {showEquivalent && (
            <p className='mt-2 text-xs text-gray-600'>
              {print.equivalent}: {salary.payable_usd ? formatCurrency(salary.payable_usd, locale, 'USD') : '—'} USD ({print.exchangeRate}: {salary.exchange_rate || '—'})
            </p>
          )}
        </section>
      </div>
    </PrintLayout>
  )
}

export default SalaryPayslipPrintDocument

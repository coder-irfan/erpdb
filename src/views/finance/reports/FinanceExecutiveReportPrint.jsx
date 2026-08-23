import PrintLayout from '@/components/print/PrintLayout'
import { formatCurrency } from '@/utils/formatCurrency'

const REPORT_CONFIG = {
  income: { title: 'MASTER REVENUE STATEMENT', metrics: [['Gross Income', 'gross_income'], ['Transactions', 'transaction_count'], ['Average Transaction', 'average_transaction']], columns: [['Date', 'date'], ['Reference', 'reference'], ['Category', 'source'], ['Collected', 'amount_display'], ['Status', 'status']] },
  expenses: { title: 'MASTER EXPENDITURE STATEMENT', metrics: [['Total Spent', 'operational_expense'], ['Top Category', 'top_expense_category'], ['Records', 'approved_count']], columns: [['Date', 'date'], ['Description', 'title'], ['Category', 'category'], ['Payee / Project', 'payee'], ['Amount', 'amount_display']] },
  loans: { title: 'LOAN PORTFOLIO & LIABILITY STATEMENT', metrics: [['Active Loan Balance', 'active_loan_balance'], ['Total Repaid', 'total_repaid'], ['Monthly Recovery', 'monthly_recovery']], columns: [['Loan Number', 'loan_number'], ['Borrower', 'borrower'], ['Type', 'type'], ['Total', 'total'], ['Repaid', 'repaid'], ['Remaining', 'remaining']] },
  inventory: { title: 'INVENTORY STOCK VALUATION REPORT', metrics: [['Total Asset Value', 'stock_valuation'], ['Stock Items', 'sku_count'], ['Low Stock Items', 'low_stock_count']], columns: [['SKU', 'sku'], ['Item', 'name'], ['Category', 'category'], ['In Stock', 'quantity'], ['Unit Cost', 'unit_cost'], ['Asset Value', 'total_value']] },
  salary: { title: 'PAYROLL MASTER REGISTER', metrics: [['Payroll Disbursed', 'payroll_disbursed'], ['Total Deductions', 'total_deductions'], ['Staff Paid', 'active_staff_paid']], columns: [['Staff Member', 'staff_name'], ['Designation', 'designation'], ['Month', 'month'], ['Base Salary', 'base_salary'], ['Deductions', 'deductions'], ['Net Payable', 'net_paid']] }
}

const FinanceExecutiveReportPrint = ({ tab, data, setup, locale, startDate, endDate }) => {
  const config = REPORT_CONFIG[tab]
  const currency = data.display_currency || setup?.currency_code || 'AFN'
  const value = (label, raw) => typeof raw === 'number' && !/Records|Items|Transactions|Staff/.test(label) ? formatCurrency(raw, locale, currency) : raw ?? '—'

  return (
    <PrintLayout title={config.title} documentNumber={`${startDate} — ${endDate}`} date={endDate} setup={setup} metadata={[{ label: 'Report Period', value: `${startDate} — ${endDate}` }, { label: 'Currency', value: currency }]} recipientLabel='Prepared By / Chief Accountant' authorizedName={setup?.signatory_name} authorizedTitle='Chief Financial Officer' labels={{ authorizedRepresentative: 'Approved By / Chief Financial Officer', recipientSignature: 'Prepared By / Chief Accountant' }}>
      <div className='space-y-6 text-xs'>
        <section className='grid grid-cols-3 gap-3'>
          {config.metrics.map(([label, key]) => <div key={key} className='rounded border border-gray-300 bg-gray-50 p-3'><p className='text-[10px] font-semibold uppercase text-gray-500'>{label}</p><p className='mt-1 text-sm font-bold text-gray-800'>{value(label, data.summary?.[key])}</p></div>)}
        </section>
        <section>
          <h2 className='enterprise-section-title'>Executive Register</h2>
          <table className='w-full border-collapse'><thead><tr className='bg-gray-50'>{config.columns.map(([label]) => <th key={label} className='border border-gray-300 p-2 text-start'>{label}</th>)}</tr></thead><tbody>{data.rows?.length ? data.rows.map(row => <tr key={row.id}>{config.columns.map(([label, key]) => <td key={key} className='border border-gray-300 p-2'>{value(label, row[key])}</td>)}</tr>) : <tr><td colSpan={config.columns.length} className='border border-gray-300 p-4 text-center text-gray-500'>No records for the selected report period.</td></tr>}</tbody></table>
        </section>
      </div>
    </PrintLayout>
  )
}

export default FinanceExecutiveReportPrint

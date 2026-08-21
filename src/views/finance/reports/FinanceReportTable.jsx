import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = {
  PAID: 'success',
  APPROVED: 'success',
  ACTIVE: 'success',
  IN_STOCK: 'success',
  PARTIAL: 'warning',
  PENDING: 'warning',
  DRAFT: 'warning',
  LOW_STOCK: 'warning',
  OVERDUE: 'error',
  OUT_OF_STOCK: 'error',
  CANCELLED: 'secondary',
  CLOSED: 'secondary',
  REPAID: 'info',
  RECORDED: 'info'
}

const normalizeStatus = value => String(value || '').trim().toUpperCase().replaceAll(' ', '_')

const StatusBadge = ({ value, dictionary }) => {
  const normalized = normalizeStatus(value)
  const label = dictionary.status?.[normalized] || value || dictionary.common.notAvailable

  return <Chip size='small' variant='tonal' color={STATUS_COLORS[normalized] || 'secondary'} label={label} />
}

const PrimarySecondary = ({ primary, secondary }) => (
  <div className='min-is-[160px] max-is-[280px]'>
    <Typography className='truncate font-medium' color='text.primary'>
      {primary}
    </Typography>
    {secondary ? (
      <Typography variant='body2' color='text.secondary' className='truncate'>
        {secondary}
      </Typography>
    ) : null}
  </div>
)

const currencyCell = (amount, currency, locale) => formatCurrency(amount, locale, currency)

const TABLES = {
  income: {
    headers: ['date', 'reference', 'sourceCategory', 'amountLocal', 'baseAmountUsd', 'paymentMethod', 'status'],
    render: (row, { dictionary, locale }) => (
      <>
        <td className='whitespace-nowrap'>{row.date}</td>
        <td><PrimarySecondary primary={row.reference} secondary={row.name} /></td>
        <td><PrimarySecondary primary={row.source} secondary={row.source_detail} /></td>
        <td className='whitespace-nowrap font-medium'>{currencyCell(row.amount_local, row.currency, locale)}</td>
        <td className='whitespace-nowrap'>{currencyCell(row.amount_usd, 'USD', locale)}</td>
        <td>
          <Tooltip title={row.payment_method || dictionary.common.notAvailable}>
            <Typography className='max-is-[180px] truncate' variant='body2'>
              {row.payment_method || dictionary.common.notAvailable}
            </Typography>
          </Tooltip>
        </td>
        <td><StatusBadge value={row.status} dictionary={dictionary} /></td>
      </>
    )
  },
  expenses: {
    headers: ['date', 'expenseTitle', 'category', 'vendorPayee', 'amount', 'paymentMethod', 'status'],
    render: (row, { dictionary, displayCurrency, locale }) => (
      <>
        <td className='whitespace-nowrap'>{row.date}</td>
        <td>
          <Tooltip title={row.title}>
            <Typography className='max-is-[260px] truncate font-medium' color='text.primary'>{row.title}</Typography>
          </Tooltip>
        </td>
        <td>{row.category || dictionary.common.notAvailable}</td>
        <td>{row.payee || dictionary.common.notAvailable}</td>
        <td className='whitespace-nowrap font-medium'>{currencyCell(row.amount_display, displayCurrency, locale)}</td>
        <td>{row.payment_method || dictionary.common.notAvailable}</td>
        <td><StatusBadge value={row.status} dictionary={dictionary} /></td>
      </>
    )
  },
  salary: {
    headers: ['staffName', 'designation', 'month', 'baseSalary', 'bonuses', 'deductions', 'netPaid', 'paymentStatus'],
    render: (row, { dictionary, displayCurrency, locale }) => (
      <>
        <td className='font-medium'>{row.staff_name || dictionary.common.notAvailable}</td>
        <td>{row.designation || dictionary.common.notAvailable}</td>
        <td className='whitespace-nowrap'>{row.month}</td>
        <td className='whitespace-nowrap'>{currencyCell(row.base_salary, displayCurrency, locale)}</td>
        <td className='whitespace-nowrap text-success'>{currencyCell(row.bonus, displayCurrency, locale)}</td>
        <td className='whitespace-nowrap text-error'>{currencyCell(row.deductions, displayCurrency, locale)}</td>
        <td className='whitespace-nowrap font-semibold'>{currencyCell(row.net_paid, displayCurrency, locale)}</td>
        <td><StatusBadge value={row.status} dictionary={dictionary} /></td>
      </>
    )
  },
  inventory: {
    headers: ['sku', 'itemName', 'category', 'inStockQty', 'unitCost', 'totalAssetValue', 'reorderStatus'],
    render: (row, { dictionary, displayCurrency, locale }) => (
      <>
        <td className='whitespace-nowrap font-medium'>{row.sku}</td>
        <td>{row.name}</td>
        <td>{row.category}</td>
        <td className='text-center'>{row.quantity}</td>
        <td className='whitespace-nowrap'>{currencyCell(row.unit_cost, displayCurrency, locale)}</td>
        <td className='whitespace-nowrap font-semibold'>{currencyCell(row.total_value, displayCurrency, locale)}</td>
        <td><StatusBadge value={row.reorder_status} dictionary={dictionary} /></td>
      </>
    )
  },
  loans: {
    headers: ['loanNumber', 'borrower', 'loanType', 'totalLoan', 'repaid', 'remainingBalance', 'issueDate'],
    render: (row, { dictionary, displayCurrency, locale }) => {
      const localizedStatus = dictionary.status?.[normalizeStatus(row.status)] || row.status

      return (
        <>
          <td className='whitespace-nowrap font-medium'>{row.loan_number}</td>
          <td><PrimarySecondary primary={row.borrower || dictionary.common.notAvailable} secondary={localizedStatus} /></td>
          <td><Chip size='small' variant='outlined' label={dictionary.loanTypes?.[row.type] || row.type} /></td>
          <td className='whitespace-nowrap'>{currencyCell(row.total, displayCurrency, locale)}</td>
          <td className='whitespace-nowrap text-success'>{currencyCell(row.repaid, displayCurrency, locale)}</td>
          <td className='whitespace-nowrap font-semibold'>{currencyCell(row.remaining, displayCurrency, locale)}</td>
          <td className='whitespace-nowrap'>{row.issue_date}</td>
        </>
      )
    }
  }
}

const FinanceReportTable = ({ tab, rows, loading, dictionary, locale, displayCurrency, className = '' }) => {
  const config = TABLES[tab]
  const headers = config.headers

  return (
    <table className={`${tableStyles.table} ${className}`}>
      <thead>
        <tr>{headers.map(header => <th key={header} className='whitespace-nowrap'>{dictionary.table[header]}</th>)}</tr>
      </thead>
      <tbody>
        {loading ? (
          <TableSkeletonRows columns={headers.length} />
        ) : rows.length === 0 ? (
          <TableEmptyStateRow
            colSpan={headers.length}
            icon='tabler-report-off'
            title={dictionary.empty.title}
            description={dictionary.empty.description}
          />
        ) : (
          rows.map(row => <tr key={row.id}>{config.render(row, { dictionary, locale, displayCurrency })}</tr>)
        )}
      </tbody>
    </table>
  )
}

export default FinanceReportTable

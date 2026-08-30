'use client'

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatPaymentMethod } from '@/utils/ledgerDisplay'

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

const normalizeStatus = value =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')

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
const paymentMethodCell = (value, fallback) => formatPaymentMethod(value) || fallback

const StaffCell = ({ staff, primary, secondary, fallback }) => (
  <div className='flex min-is-[160px] items-center gap-3'>
    <UserAvatar user={staff || { name: primary || fallback }} size={32} />
    <PrimarySecondary primary={primary || fallback} secondary={secondary} />
  </div>
)

const TABLES = {
  income: {
    headers: ['date', 'reference', 'sourceCategory', 'amountLocal', 'paymentMethod', 'status'],
    render: (row, { dictionary, locale }) => (
      <>
        <td className='whitespace-nowrap'>{row.date}</td>
        <td>
          <div className='flex min-is-[180px] items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
              <i className='tabler-receipt-tax' />
            </span>
            <PrimarySecondary primary={row.reference} secondary={row.name} />
          </div>
        </td>
        <td>
          <PrimarySecondary primary={row.source} secondary={row.source_detail} />
        </td>
        <td><DualCurrencyAmount amount={row.amount_local} amountBase={row.amount_base ?? row.amount_display} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
        <td>
          <Tooltip title={paymentMethodCell(row.payment_method, dictionary.common.notAvailable)}>
            <Typography className='max-is-[180px] truncate' variant='body2'>
              {paymentMethodCell(row.payment_method, dictionary.common.notAvailable)}
            </Typography>
          </Tooltip>
        </td>
        <td>
          <StatusBadge value={row.status} dictionary={dictionary} />
        </td>
      </>
    )
  },
  expenses: {
    headers: ['date', 'expenseTitle', 'category', 'vendorPayee', 'amount', 'paymentMethod', 'status'],
    render: (row, { dictionary, displayCurrency, locale }) => (
      <>
        <td className='whitespace-nowrap'>{row.date}</td>
        <td>
          <div className='flex min-is-[150px] items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-errorLighter text-error'>
              <i className='tabler-receipt-tax' />
            </span>
            <Tooltip title={row.title}>
              <Typography className='max-is-[260px] truncate font-medium' color='text.primary'>
                {row.title}
              </Typography>
            </Tooltip>
          </div>
        </td>
        <td>{row.category || dictionary.common.notAvailable}</td>
        <td><StaffCell staff={row.staff} primary={row.payee} fallback={dictionary.common.notAvailable} /></td>
        <td><DualCurrencyAmount amount={row.amount_local} amountBase={row.amount_display} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
        <td>{paymentMethodCell(row.payment_method, dictionary.common.notAvailable)}</td>
        <td>
          <StatusBadge value={row.status} dictionary={dictionary} />
        </td>
      </>
    )
  },
  salary: {
    headers: ['staffName', 'designation', 'month', 'baseSalary', 'bonuses', 'deductions', 'netPaid', 'paymentStatus'],
    render: (row, { dictionary, displayCurrency, locale }) => (
      <>
        <td><StaffCell staff={row.staff} primary={row.staff_name} secondary={row.staff?.email} fallback={dictionary.common.notAvailable} /></td>
        <td>{row.designation || dictionary.common.notAvailable}</td>
        <td className='whitespace-nowrap'>{row.month}</td>
        <td><DualCurrencyAmount amount={row.original_base_salary} amountBase={row.base_salary} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
        <td><DualCurrencyAmount amount={row.original_bonus} amountBase={row.bonus} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} primaryClassName='text-success' /></td>
        <td><DualCurrencyAmount amount={row.original_deductions} amountBase={row.deductions} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} primaryClassName='text-error' /></td>
        <td><DualCurrencyAmount amount={row.original_net_paid} amountBase={row.net_paid} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
        <td>
          <StatusBadge value={row.status} dictionary={dictionary} />
        </td>
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
        <td><DualCurrencyAmount amount={row.original_unit_cost} amountBase={row.unit_cost} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
        <td><DualCurrencyAmount amount={row.original_total_value} amountBase={row.total_value} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
        <td>
          <StatusBadge value={row.reorder_status} dictionary={dictionary} />
        </td>
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
          <td>
            <StaffCell staff={row.staff} primary={row.borrower} secondary={localizedStatus} fallback={dictionary.common.notAvailable} />
          </td>
          <td>
            <Chip size='small' variant='outlined' label={dictionary.loanTypes?.[row.type] || row.type} />
          </td>
          <td><DualCurrencyAmount amount={row.original_total} amountBase={row.total} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
          <td><DualCurrencyAmount amount={row.original_repaid} amountBase={row.repaid} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} primaryClassName='text-success' /></td>
          <td><DualCurrencyAmount amount={row.original_remaining} amountBase={row.remaining} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} /></td>
          <td className='whitespace-nowrap'>{row.issue_date}</td>
        </>
      )
    }
  }
}

const FinanceReportTable = ({ tab, rows, loading, dictionary, locale, displayCurrency, className = '' }) => {
  const config = TABLES[tab]
  const headers = config.headers

  const renderMobilePrimary = row => {
    if (tab === 'income') return <PrimarySecondary primary={row.reference} secondary={row.name} />
    if (tab === 'expenses') return <PrimarySecondary primary={row.title} secondary={row.payee} />
    if (tab === 'salary') return <PrimarySecondary primary={row.staff_name} secondary={row.designation} />
    if (tab === 'inventory') return <PrimarySecondary primary={row.sku} secondary={row.name} />

    return <PrimarySecondary primary={row.loan_number} secondary={row.borrower} />
  }

  const renderMobileStatus = row => (
    <StatusBadge value={tab === 'inventory' ? row.reorder_status : row.status} dictionary={dictionary} />
  )

  const mobileMetadata = (() => {
    if (tab === 'income') {
      return [
        { id: 'date', label: dictionary.table.date, render: row => row.date },
        { id: 'source', label: dictionary.table.sourceCategory, render: row => row.source },
        {
          id: 'local-amount',
          label: dictionary.table.amountLocal,
          render: row => <DualCurrencyAmount amount={row.amount_local} amountBase={row.amount_base ?? row.amount_display} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} />
        },
        {
          id: 'payment',
          label: dictionary.table.paymentMethod,
          render: row => paymentMethodCell(row.payment_method, dictionary.common.notAvailable)
        }
      ]
    }

    if (tab === 'expenses') {
      return [
        { id: 'date', label: dictionary.table.date, render: row => row.date },
        {
          id: 'category',
          label: dictionary.table.category,
          render: row => row.category || dictionary.common.notAvailable
        },
        {
          id: 'payee',
          label: dictionary.table.vendorPayee,
          render: row => row.payee || dictionary.common.notAvailable
        },
        {
          id: 'amount',
          label: dictionary.table.amount,
          render: row => <DualCurrencyAmount amount={row.amount_local} amountBase={row.amount_display} currency={row.currency} exchangeRate={row.exchange_rate} locale={locale} />
        },
        {
          id: 'payment',
          label: dictionary.table.paymentMethod,
          render: row => paymentMethodCell(row.payment_method, dictionary.common.notAvailable)
        }
      ]
    }

    if (tab === 'salary') {
      return [
        { id: 'month', label: dictionary.table.month, render: row => row.month },
        {
          id: 'base',
          label: dictionary.table.baseSalary,
          render: row => currencyCell(row.base_salary, displayCurrency, locale)
        },
        {
          id: 'bonus',
          label: dictionary.table.bonuses,
          render: row => currencyCell(row.bonus, displayCurrency, locale)
        },
        {
          id: 'deductions',
          label: dictionary.table.deductions,
          render: row => currencyCell(row.deductions, displayCurrency, locale)
        },
        {
          id: 'net',
          label: dictionary.table.netPaid,
          render: row => currencyCell(row.net_paid, displayCurrency, locale)
        }
      ]
    }

    if (tab === 'inventory') {
      return [
        { id: 'category', label: dictionary.table.category, render: row => row.category },
        { id: 'quantity', label: dictionary.table.inStockQty, render: row => row.quantity },
        {
          id: 'unit-cost',
          label: dictionary.table.unitCost,
          render: row => currencyCell(row.unit_cost, displayCurrency, locale)
        },
        {
          id: 'total-value',
          label: dictionary.table.totalAssetValue,
          render: row => currencyCell(row.total_value, displayCurrency, locale)
        }
      ]
    }

    return [
      { id: 'type', label: dictionary.table.loanType, render: row => dictionary.loanTypes?.[row.type] || row.type },
      {
        id: 'total',
        label: dictionary.table.totalLoan,
        render: row => currencyCell(row.total, displayCurrency, locale)
      },
      {
        id: 'repaid',
        label: dictionary.table.repaid,
        render: row => currencyCell(row.repaid, displayCurrency, locale)
      },
      {
        id: 'remaining',
        label: dictionary.table.remainingBalance,
        render: row => currencyCell(row.remaining, displayCurrency, locale)
      },
      { id: 'date', label: dictionary.table.issueDate, render: row => row.issue_date }
    ]
  })()

  return (
    <ResponsiveDataTable
      mobileRows={rows}
      loading={loading}
      getMobileRowId={row => row.id}
      renderMobilePrimary={renderMobilePrimary}
      renderMobileStatus={renderMobileStatus}
      mobileMetadata={mobileMetadata}
      emptyState={{
        icon: 'tabler-report-off',
        title: dictionary.empty.title,
        description: dictionary.empty.description
      }}
    >
      <table className={`${tableStyles.table} ${className}`}>
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} className='whitespace-nowrap'>
                {dictionary.table[header]}
              </th>
            ))}
          </tr>
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
    </ResponsiveDataTable>
  )
}

export default FinanceReportTable

'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const COLORS = new Set(['primary', 'secondary', 'success', 'error', 'warning', 'info'])

const FinanceLoanTable = ({
  data,
  loading,
  page,
  rowsPerPage,
  locale,
  dictionary,
  canWrite,
  canManageStatus,
  statusUpdating,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onPrint,
  onRepay,
  onStatusChange,
  onApproveAndDisburse
}) => {
  const statusActions = loan => {
    if (!canManageStatus) return []

    const common = { disabled: statusUpdating === loan.id, requiresConfirmation: true }

    if (loan.status?.value === 'REQUESTED' && loan.loan_type === 'STAFF') {
      return [
        {
          ...common,
          label: 'Approve & Disburse',
          icon: 'tabler-cash-banknote',
          requiresConfirmation: false,
          onClick: () => onApproveAndDisburse(loan)
        },
        {
          ...common,
          label: dictionary.actions.reject,
          icon: 'tabler-x',
          color: 'error',
          onClick: () => onStatusChange(loan, 'REJECTED')
        }
      ]
    }

    if (loan.status?.value === 'APPROVED' && loan.loan_type === 'STAFF') {
      return [
        {
          ...common,
          label: 'Disburse',
          icon: 'tabler-cash-banknote',
          requiresConfirmation: false,
          onClick: () => onApproveAndDisburse(loan)
        }
      ]
    }

    const hasRepayments = toFiniteNumber(loan.repaid_amount) > 0 || (loan.repayments?.length || 0) > 0

    if (loan.status?.value === 'ACTIVE' && !hasRepayments) {
      return [
        {
          ...common,
          label: dictionary.actions.void,
          icon: 'tabler-ban',
          color: 'error',
          onClick: () => onStatusChange(loan, 'CANCELLED')
        }
      ]
    }

    return []
  }

  const renderActions = loan => {
    const isActive = loan.status?.value === 'ACTIVE'

    const fallbackActions = [
      { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(loan) },
      { label: dictionary.actions.printVoucher, icon: 'tabler-printer', onClick: () => onPrint(loan) }
    ]

    const activeActions = [
      canWrite &&
        toFiniteNumber(loan.remaining_balance) > 0 && {
          label: dictionary.actions.repay,
          icon: 'tabler-cash',
          skipConfirmation: true,
          onClick: () => onRepay(loan)
        },
      { label: 'View Schedule', icon: 'tabler-calendar-dollar', onClick: () => onView(loan) },
      ...statusActions(loan)
    ]

    return (
      <EntityActionsMenu
        moreActionsLabel={dictionary.table.actions}
        actions={
          loan.status?.value === 'REQUESTED' || loan.status?.value === 'APPROVED'
            ? statusActions(loan)
            : isActive
              ? activeActions
              : fallbackActions
        }
      />
    )
  }

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.loans}
        loading={loading}
        getMobileRowId={loan => loan.id}
        onRowClick={onView}
        renderMobilePrimary={loan => {
          const borrower = loan.staff?.full_name || loan.entity_name || dictionary.common.unassigned

          return (
            <div className='flex min-is-0 items-center gap-3'>
              <UserAvatar user={loan.staff || { name: borrower }} size={36} />
              <div className='min-is-0'>
                <Typography className='truncate font-semibold'>{loan.loan_number}</Typography>
                <Typography variant='caption' color='text.secondary' className='block truncate'>
                  {borrower}
                </Typography>
              </div>
            </div>
          )
        }}
        renderMobileStatus={loan => (
          <Chip
            size='small'
            variant='tonal'
            color={COLORS.has(loan.status.color_code) ? loan.status.color_code : 'secondary'}
            label={loan.status.label}
          />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          {
            id: 'type',
            label: dictionary.table.loan,
            render: loan => dictionary.types[loan.loan_type] || loan.loan_type
          },
          {
            id: 'total',
            label: dictionary.table.total,
            render: loan => (
              <DualCurrencyAmount
                amount={loan.total_amount}
                amountBase={loan.amount_base}
                currency={loan.currency}
                exchangeRate={loan.exchange_rate}
                locale={locale}
              />
            )
          },
          {
            id: 'monthly',
            label: dictionary.table.monthly,
            render: loan => (
              <DualCurrencyAmount
                amount={loan.monthly_deduction}
                currency={loan.currency}
                exchangeRate={loan.exchange_rate}
                locale={locale}
              />
            )
          },
          {
            id: 'repaid',
            label: dictionary.table.repaid,
            render: loan => (
              <DualCurrencyAmount
                amount={loan.repaid_amount}
                currency={loan.currency}
                exchangeRate={loan.exchange_rate}
                locale={locale}
              />
            )
          },
          {
            id: 'remaining',
            label: dictionary.table.remaining,
            render: loan => (
              <DualCurrencyAmount
                amount={loan.remaining_balance}
                currency={loan.currency}
                exchangeRate={loan.exchange_rate}
                locale={locale}
              />
            )
          },
          { id: 'date', label: dictionary.table.date, render: loan => toDateInputValue(loan.issue_date) }
        ]}
        emptyState={{
          icon: 'tabler-building-bank',
          title: dictionary.empty.title,
          description: dictionary.empty.description
        }}
      >
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.table.loan}</th>
                <th>{dictionary.table.borrower}</th>
                <th className='text-end'>{dictionary.table.total}</th>
                <th className='text-end'>{dictionary.table.monthly}</th>
                <th className='text-end'>{dictionary.table.repaid}</th>
                <th className='text-end'>{dictionary.table.remaining}</th>
                <th>{dictionary.table.status}</th>
                <th>{dictionary.table.date}</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={9} />
              ) : data.loans.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={9}
                  icon='tabler-building-bank'
                  title={dictionary.empty.title}
                  description={dictionary.empty.description}
                />
              ) : (
                data.loans.map(loan => {
                  const borrower = loan.staff?.full_name || loan.entity_name || dictionary.common.unassigned
                  const statusColor = COLORS.has(loan.status.color_code) ? loan.status.color_code : 'secondary'

                  return (
                    <tr key={loan.id} onClick={() => onView(loan)}>
                      <td>
                        <div className='flex min-is-[180px] items-center gap-3'>
                          <span className='flex size-9 shrink-0 items-center justify-center rounded bg-secondaryLighter text-secondary'>
                            <i className='tabler-receipt-tax' />
                          </span>
                          <div className='flex flex-col gap-1'>
                            <Typography className='whitespace-nowrap font-semibold text-secondary'>
                              {loan.loan_number}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {dictionary.types[loan.loan_type] || loan.loan_type}
                            </Typography>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className='flex min-is-[190px] items-center gap-2'>
                          <UserAvatar user={loan.staff || { name: borrower }} size={32} />
                          <div className='min-is-0'>
                            <Typography className='max-is-[190px] truncate font-medium'>{borrower}</Typography>
                            <Typography variant='caption' color='text.secondary' className='block truncate'>
                              {loan.staff?.position || loan.loan_type}
                            </Typography>
                          </div>
                        </div>
                      </td>
                      <td className='text-end'>
                        <DualCurrencyAmount
                          amount={loan.total_amount}
                          amountBase={loan.amount_base}
                          currency={loan.currency}
                          exchangeRate={loan.exchange_rate}
                          locale={locale}
                          className='min-is-[130px] items-end'
                        />
                      </td>
                      <td className='text-end'>
                        <DualCurrencyAmount
                          amount={loan.monthly_deduction}
                          currency={loan.currency}
                          exchangeRate={loan.exchange_rate}
                          locale={locale}
                          className='min-is-[130px] items-end'
                        />
                      </td>
                      <td className='text-end'>
                        <DualCurrencyAmount
                          amount={loan.repaid_amount}
                          currency={loan.currency}
                          exchangeRate={loan.exchange_rate}
                          locale={locale}
                          className='min-is-[125px] items-end'
                          primaryClassName='text-success'
                        />
                      </td>
                      <td className='text-end'>
                        <DualCurrencyAmount
                          amount={loan.remaining_balance}
                          currency={loan.currency}
                          exchangeRate={loan.exchange_rate}
                          locale={locale}
                          className='min-is-[135px] items-end'
                          primaryClassName={toFiniteNumber(loan.remaining_balance) > 0 ? 'text-error' : 'text-success'}
                        />
                      </td>
                      <td>
                        <Chip size='small' variant='tonal' color={statusColor} label={loan.status.label} />
                      </td>
                      <td>
                        <Typography variant='body2' className='min-is-[105px] whitespace-nowrap'>
                          {toDateInputValue(loan.issue_date)}
                        </Typography>
                      </td>
                      <td className='text-end' onClick={event => event.stopPropagation()}>
                        {renderActions(loan)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </ResponsiveDataTable>
      <DashboardTablePagination
        count={data.totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageLabel={dictionary.common.rowsPerPage}
        ofLabel={dictionary.common.of}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  )
}

export default FinanceLoanTable

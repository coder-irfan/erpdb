'use client'

import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const initials = name =>
  name
    ?.split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

const COLORS = new Set(['primary', 'secondary', 'success', 'error', 'warning', 'info'])

const FinanceLoanTable = ({
  data,
  loading,
  page,
  rowsPerPage,
  locale,
  dictionary,
  canWrite,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onPrint,
  onRepay
}) => {
  const renderActions = loan => (
    <EntityActionsMenu
      moreActionsLabel={dictionary.table.actions}
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(loan) },
        canWrite && toFiniteNumber(loan.remaining_balance) > 0 && {
          label: dictionary.actions.repay,
          icon: 'tabler-cash',
          onClick: () => onRepay(loan)
        },
        { label: 'Print Voucher', icon: 'tabler-printer', onClick: () => onPrint(loan) }
      ]}
    />
  )

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
              <Avatar className='size-9 text-xs'>{initials(borrower)}</Avatar>
              <div className='min-is-0'>
                <Typography className='truncate font-semibold'>{loan.loan_number}</Typography>
                <Typography variant='caption' color='text.secondary' className='block truncate'>{borrower}</Typography>
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
          { id: 'type', label: dictionary.table.loan, render: loan => dictionary.types[loan.loan_type] || loan.loan_type },
          {
            id: 'total',
            label: dictionary.table.total,
            render: loan => formatCurrency(loan.total_amount, locale, loan.currency)
          },
          {
            id: 'monthly',
            label: dictionary.table.monthly,
            render: loan => formatCurrency(loan.monthly_deduction, locale, loan.currency)
          },
          {
            id: 'repaid',
            label: dictionary.table.repaid,
            render: loan => formatCurrency(loan.repaid_amount, locale, loan.currency)
          },
          {
            id: 'remaining',
            label: dictionary.table.remaining,
            render: loan => formatCurrency(loan.remaining_balance, locale, loan.currency)
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
                    <div className='min-is-[150px]'>
                      <Typography className='whitespace-nowrap font-semibold'>{loan.loan_number}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {dictionary.types[loan.loan_type] || loan.loan_type}
                      </Typography>
                    </div>
                  </td>
                  <td>
                    <div className='flex min-is-[190px] items-center gap-2'>
                      <Avatar className='size-8 text-xs'>{initials(borrower)}</Avatar>
                      <div className='min-is-0'>
                        <Typography className='max-is-[190px] truncate font-medium'>{borrower}</Typography>
                        <Typography variant='caption' color='text.secondary' className='block truncate'>
                          {loan.staff?.position || loan.loan_type}
                        </Typography>
                      </div>
                    </div>
                  </td>
                  <td className='text-end'>
                    <Typography className='min-is-[130px] whitespace-nowrap font-medium'>
                      {formatCurrency(loan.total_amount, locale, loan.currency)}
                    </Typography>
                  </td>
                  <td className='text-end'>
                    <Typography className='min-is-[130px] whitespace-nowrap'>
                      {formatCurrency(loan.monthly_deduction, locale, loan.currency)}
                    </Typography>
                  </td>
                  <td className='text-end'>
                    <Typography className='min-is-[125px] whitespace-nowrap text-success'>
                      {formatCurrency(loan.repaid_amount, locale, loan.currency)}
                    </Typography>
                  </td>
                  <td className='text-end'>
                    <Typography
                      className={`min-is-[135px] whitespace-nowrap font-semibold ${toFiniteNumber(loan.remaining_balance) > 0 ? 'text-error' : 'text-success'}`}
                    >
                      {formatCurrency(loan.remaining_balance, locale, loan.currency)}
                    </Typography>
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

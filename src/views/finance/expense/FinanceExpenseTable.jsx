'use client'

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const PALETTE_COLORS = new Set(['primary', 'secondary', 'success', 'error', 'info', 'warning'])

const typeChipProps = option => {
  const configuredColor = option?.color_code?.toLowerCase()

  if (PALETTE_COLORS.has(configuredColor)) return { color: configuredColor }

  if (/^#[0-9a-f]{6}$/i.test(configuredColor || '')) {
    return {
      sx: { color: configuredColor, backgroundColor: `${configuredColor}18`, borderColor: `${configuredColor}55` }
    }
  }

  return { color: 'info' }
}

const FinanceExpenseTable = ({
  data,
  loading,
  page,
  rowsPerPage,
  locale,
  dictionary,
  canWrite,
  canDelete,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onPrint,
  onEdit,
  onDelete,
  onAdd
}) => {
  const renderActions = expense => (
    <EntityActionsMenu
      moreActionsLabel={dictionary.table.actions}
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(expense) },
        { label: dictionary.actions.printVoucher, icon: 'tabler-printer', onClick: () => onPrint(expense) },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(expense) },
        canDelete && {
          label: dictionary.actions.delete,
          icon: 'tabler-trash',
          color: 'error',
          onClick: () => onDelete(expense)
        }
      ]}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.expenses}
        loading={loading}
        getMobileRowId={expense => expense.id}
        onRowClick={onView}
        renderMobilePrimary={expense => (
          <div className='flex min-is-0 items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-errorLighter text-error'>
              <i className='tabler-receipt-tax' />
            </span>
            <Typography className='min-is-0 truncate font-medium'>{expense.details}</Typography>
          </div>
        )}
        renderMobileStatus={expense => (
          <Chip
            size='small'
            variant='tonal'
            label={expense.expense_type.label}
            {...typeChipProps(expense.expense_type)}
          />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          {
            id: 'scope',
            label: dictionary.table.scope,
            render: expense => expense.project?.title || dictionary.common.generalOverhead
          },
          {
            id: 'spent-by',
            label: dictionary.table.scope,
            render: expense => expense.spent_by?.full_name || dictionary.common.unassigned
          },
          { id: 'date', label: dictionary.table.date, render: expense => toDateInputValue(expense.expense_date) },
          {
            id: 'quantity',
            label: dictionary.table.quantity,
            render: expense => `${expense.quantity} × ${formatCurrency(expense.unit_price, locale, expense.currency)}`
          },
          {
            id: 'subtotal',
            label: dictionary.table.subtotal,
            render: expense => formatCurrency(expense.sub_total, locale, expense.currency)
          }
        ]}
        emptyState={{
          icon: 'tabler-receipt-off',
          title: dictionary.empty.title,
          description: dictionary.empty.description,
          actionLabel: canWrite ? dictionary.actions.add : undefined,
          onAction: canWrite ? onAdd : undefined
        }}
      >
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{dictionary.table.details}</th>
                <th>{dictionary.table.type}</th>
                <th>{dictionary.table.scope}</th>
                <th>{dictionary.table.date}</th>
                <th>{dictionary.table.quantity}</th>
                <th className='text-end'>{dictionary.table.subtotal}</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={7} />
              ) : data.expenses.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={7}
                  icon='tabler-receipt-off'
                  title={dictionary.empty.title}
                  description={dictionary.empty.description}
                  actionLabel={canWrite ? dictionary.actions.add : null}
                  onAction={canWrite ? onAdd : null}
                />
              ) : (
                data.expenses.map(expense => (
                  <tr key={expense.id} onClick={() => onView(expense)}>
                    <td>
                      <div className='flex min-is-[230px] items-center gap-3'>
                        <span className='flex size-9 shrink-0 items-center justify-center rounded bg-errorLighter text-error'>
                          <i className='tabler-receipt-tax' />
                        </span>
                        <Tooltip title={expense.details}>
                          <Typography className='max-is-[240px] truncate font-medium'>{expense.details}</Typography>
                        </Tooltip>
                        {expense.receipt_url && (
                          <Tooltip title={dictionary.fields.receipt}>
                            <i className='tabler-paperclip shrink-0 text-lg text-primary' />
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        label={expense.expense_type.label}
                        {...typeChipProps(expense.expense_type)}
                      />
                    </td>
                    <td>
                      <div className='min-is-[200px]'>
                        {expense.project ? (
                          <Tooltip title={`${expense.project.project_code} · ${expense.project.title}`}>
                            <Typography variant='body2' className='max-is-[210px] truncate font-medium'>
                              {expense.project.title}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Chip
                            size='small'
                            variant='tonal'
                            color='secondary'
                            label={dictionary.common.generalOverhead}
                          />
                        )}
                        <div className='mt-1 flex items-center gap-2'>
                          <UserAvatar user={expense.spent_by || { name: dictionary.common.unassigned }} size={28} />
                          <Typography variant='caption' color='text.secondary' className='max-is-[150px] truncate'>
                            {expense.spent_by?.full_name || dictionary.common.unassigned}
                          </Typography>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Typography variant='body2' className='min-is-[105px] whitespace-nowrap'>
                        {toDateInputValue(expense.expense_date)}
                      </Typography>
                    </td>
                    <td>
                      <Typography variant='body2' className='min-is-[170px] whitespace-nowrap'>
                        {expense.quantity} × {formatCurrency(expense.unit_price, locale, expense.currency)}
                      </Typography>
                    </td>
                    <td className='text-end'>
                      <Tooltip
                        title={`${dictionary.fields.baseAmount}: ${formatCurrency(expense.amount_base, locale, data.baseCurrency)}`}
                      >
                        <div className='min-is-[150px]'>
                          <Typography variant='body2' className='whitespace-nowrap font-semibold'>
                            {formatCurrency(expense.sub_total, locale, expense.currency)}
                          </Typography>
                          <Chip size='small' variant='outlined' label={expense.currency} className='mt-1' />
                        </div>
                      </Tooltip>
                    </td>
                    <td className='text-end' onClick={event => event.stopPropagation()}>
                      {renderActions(expense)}
                    </td>
                  </tr>
                ))
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

export default FinanceExpenseTable

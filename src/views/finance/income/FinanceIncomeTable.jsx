'use client'

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = { PAID: 'success', PARTIAL: 'warning', PENDING: 'error' }
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

const FinanceIncomeTable = ({
  data,
  loading,
  busyId,
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
  onMarkPaid,
  onDelete,
  onAdd
}) => {
  const today = new Date()

  today.setHours(0, 0, 0, 0)

  const renderActions = income => (
    <EntityActionsMenu
      moreActionsLabel={dictionary.table.actions}
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(income) },
        { label: dictionary.actions.printReceipt, icon: 'tabler-printer', onClick: () => onPrint(income) },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(income) },
        canWrite &&
          income.status !== 'PAID' && {
            label: dictionary.actions.markPaid,
            icon: 'tabler-circle-check',
            disabled: busyId === income.id,
            onClick: () => onMarkPaid(income)
          },
        canDelete && {
          label: dictionary.actions.delete,
          icon: 'tabler-trash',
          color: 'error',
          onClick: () => onDelete(income)
        }
      ]}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.incomes}
        loading={loading}
        getMobileRowId={income => income.id}
        onRowClick={onView}
        renderMobilePrimary={income => (
          <div className='flex min-is-0 items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-successLighter text-success'>
              <i className='tabler-cash-banknote' />
            </span>
            <div className='min-is-0'>
              <Typography className='truncate font-medium'>{income.name}</Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>
                {income.project
                  ? `${income.project.project_code} · ${income.project.title}`
                  : income.client?.company_name || dictionary.common.notAvailable}
              </Typography>
            </div>
          </div>
        )}
        renderMobileStatus={income => (
          <Chip
            size='small'
            variant='tonal'
            color={STATUS_COLORS[income.status] || 'secondary'}
            label={dictionary.status[income.status] || income.status}
          />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          { id: 'type', label: dictionary.table.type, render: income => income.income_type.label },
          {
            id: 'amount',
            label: dictionary.table.amounts,
            render: income => <DualCurrencyAmount amount={income.total_amount} amountBase={income.amount_base} currency={income.currency} exchangeRate={income.exchange_rate} locale={locale} />
          },
          {
            id: 'paid-due',
            label: `${dictionary.table.paid} / ${dictionary.table.due}`,
            render: income =>
              `${formatCurrency(income.paid_amount, locale, income.currency)} / ${formatCurrency(income.remind_amount, locale, income.currency)}`
          },
          {
            id: 'receiver',
            label: dictionary.table.receiver,
            render: income => income.received_by?.full_name || dictionary.common.unassigned
          },
          {
            id: 'reminder',
            label: dictionary.table.reminder,
            render: income => toDateInputValue(income.remind_date) || dictionary.common.notAvailable
          }
        ]}
        emptyState={{
          icon: 'tabler-cash-off',
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
                <th>{dictionary.table.income}</th>
                <th>{dictionary.table.type}</th>
                <th>{dictionary.table.amounts}</th>
                <th>{dictionary.table.receiver}</th>
                <th>{dictionary.table.reminder}</th>
                <th>{dictionary.table.status}</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={7} />
              ) : data.incomes.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={7}
                  icon='tabler-cash-off'
                  title={dictionary.empty.title}
                  description={dictionary.empty.description}
                  actionLabel={canWrite ? dictionary.actions.add : null}
                  onAction={canWrite ? onAdd : null}
                />
              ) : (
                data.incomes.map(income => {
                  const source = income.project
                    ? `${income.project.project_code} · ${income.project.title}`
                    : income.client?.company_name || dictionary.common.notAvailable

                  const reminder = income.remind_date ? new Date(income.remind_date) : null
                  const overdue = income.status !== 'PAID' && reminder && reminder < today

                  return (
                    <tr key={income.id} onClick={() => onView(income)}>
                      <td>
                        <div className='flex min-is-[220px] items-center gap-3'>
                          <span className='flex size-9 shrink-0 items-center justify-center rounded bg-successLighter text-success'>
                            <i className='tabler-cash-banknote' />
                          </span>
                          <div className='min-is-0'>
                            <Tooltip title={income.name}>
                              <Typography className='max-is-[220px] truncate font-medium'>{income.name}</Typography>
                            </Tooltip>
                            <Tooltip title={source}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                className='block max-is-[220px] truncate'
                              >
                                {source}
                              </Typography>
                            </Tooltip>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          label={income.income_type.label}
                          {...typeChipProps(income.income_type)}
                        />
                      </td>
                      <td>
                        <div className='min-is-[225px]'>
                          <DualCurrencyAmount amount={income.total_amount} amountBase={income.amount_base} currency={income.currency} exchangeRate={income.exchange_rate} locale={locale} />
                          <Typography variant='caption' color='text.secondary' className='block whitespace-nowrap'>
                            {dictionary.table.paid}: {formatCurrency(income.paid_amount, locale, income.currency)} ·{' '}
                            {dictionary.table.due}: {formatCurrency(income.remind_amount, locale, income.currency)}
                          </Typography>
                        </div>
                      </td>
                      <td>
                        <div className='flex min-is-[165px] items-center gap-2'>
                          <UserAvatar user={income.received_by || { name: dictionary.common.unassigned }} size={32} />
                          <Typography variant='body2' className='max-is-[130px] truncate'>
                            {income.received_by?.full_name || dictionary.common.unassigned}
                          </Typography>
                        </div>
                      </td>
                      <td>
                        <div className='min-is-[125px]'>
                          <Typography
                            variant='body2'
                            color={overdue ? 'error.main' : 'text.primary'}
                            className='whitespace-nowrap'
                          >
                            {toDateInputValue(income.remind_date) || dictionary.common.notAvailable}
                          </Typography>
                          {overdue && (
                            <Typography variant='caption' color='error'>
                              {dictionary.common.overdue}
                            </Typography>
                          )}
                        </div>
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={STATUS_COLORS[income.status] || 'secondary'}
                          label={dictionary.status[income.status] || income.status}
                        />
                      </td>
                      <td className='text-end' onClick={event => event.stopPropagation()}>
                        {renderActions(income)}
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

export default FinanceIncomeTable

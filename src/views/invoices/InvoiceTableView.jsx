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
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = { PAID: 'success', UNPAID: 'warning', PARTIALLY_PAID: 'info', CANCELLED: 'secondary', OVERDUE: 'error' }

const InvoiceTableView = ({ data, loading, statusUpdating, page, rowsPerPage, locale, dictionary, canWrite, canDelete, onPageChange, onRowsPerPageChange, onView, onPrint, onPay, onEdit, onDelete, onStatusChange, onAdd }) => {
  const renderActions = invoice => (
    <EntityActionsMenu
      locale={locale}
      actions={[
        { label: dictionary.actions.viewDetails || 'View details', icon: 'tabler-eye', onClick: () => onView(invoice.id) },
        { label: dictionary.actions.viewPrint, icon: 'tabler-printer', onClick: () => onPrint(invoice) },
        canWrite && Number(invoice.remaining_balance) > 0.005 && !['PAID', 'CANCELLED'].includes(invoice.status.value) && {
          label: dictionary.actions.recordPayment,
          icon: 'tabler-cash',
          skipConfirmation: true,
          onClick: () => onPay(invoice)
        },
        canWrite && {
          label: dictionary.actions.edit,
          icon: 'tabler-edit',
          onClick: () => onEdit(invoice)
        },
        canDelete && !invoice.payment_income && invoice.status.value !== 'PAID' && {
          label: dictionary.actions.delete,
          icon: 'tabler-trash',
          color: 'error',
          onClick: () => onDelete(invoice)
        }
      ]}
      statusOptions={
        canWrite
          ? data.statuses.filter(status => {
              if (['PAID', 'PARTIALLY_PAID'].includes(status.value)) return false
              if (invoice.status.value === 'CANCELLED') return false
              if (invoice.payment_income || ['PAID', 'PARTIALLY_PAID'].includes(invoice.status.value)) return status.value === 'CANCELLED'

              return true
            })
          : []
      }
      currentStatus={invoice.status_id}
      statusDisabled={statusUpdating === invoice.id}
      changeStatusLabel={dictionary.actions.changeStatus}
      moreActionsLabel={dictionary.table.actions}
      onStatusChange={statusId => onStatusChange(invoice, statusId)}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.invoices}
        loading={loading}
        getMobileRowId={invoice => invoice.id}
        renderMobilePrimary={invoice => (
          <div className='flex min-is-0 items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
              <i className='tabler-receipt' />
            </span>
            <div className='min-is-0'>
              <Typography variant='body2' className='truncate font-semibold text-primary'>#{invoice.invoice_number}</Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>#{invoice.contract.contract_number}</Typography>
            </div>
          </div>
        )}
        renderMobileStatus={invoice => {
          const displayStatus = invoice.is_overdue ? 'OVERDUE' : invoice.status.value

          return <div className='flex flex-col items-end gap-1'><Chip size='small' variant='tonal' color={STATUS_COLORS[displayStatus] || 'default'} label={invoice.is_overdue ? dictionary.status.OVERDUE : invoice.status.label} />{invoice.status.value === 'PARTIALLY_PAID' && <Typography variant='caption' color='text.secondary'>{dictionary.fields.remainingBalance || 'Remaining'}: {formatCurrency(invoice.remaining_balance, locale, invoice.currency)}</Typography>}</div>
        }}
        renderMobileActions={renderActions}
        mobileMetadata={[
          {
            id: 'client',
            label: dictionary.table.client,
            render: invoice => {
              const clientName = invoice.client.company_name || invoice.client.primary_contact_name

              return (
                <div className='flex items-center gap-2'>
                  <UserAvatar user={{ name: clientName }} size={32} />
                  <span className='truncate'>{clientName}</span>
                </div>
              )
            }
          },
          { id: 'issued', label: dictionary.fields.issueDate, render: invoice => toDateInputValue(invoice.issued_date) },
          { id: 'due', label: dictionary.fields.dueDate, render: invoice => toDateInputValue(invoice.due_date) },
          {
            id: 'amount',
            label: dictionary.table.amountCurrency,
            render: invoice => <DualCurrencyAmount amount={invoice.amount} amountBase={invoice.amount_base} currency={invoice.currency} exchangeRate={invoice.exchange_rate} locale={locale} />
          },
          {
            id: 'base-amount',
            label: dictionary.table.baseAmount,
            render: invoice => formatCurrency(invoice.amount_base, locale, data.baseCurrency)
          }
        ]}
        emptyState={{
          icon: 'tabler-receipt-off',
          title: dictionary.empty.title,
          description: dictionary.empty.description,
          actionLabel: canWrite ? dictionary.actions.create : undefined,
          onAction: canWrite ? onAdd : undefined
        }}
        onRowClick={invoice => onView(invoice.id)}
      >
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead><tr>
          <th>{dictionary.table.invoiceContract}</th>
          <th>{dictionary.table.client}</th>
          <th>{dictionary.table.issueDue}</th>
          <th className='text-end'>{dictionary.table.amountCurrency}</th>
          <th className='text-end'>{dictionary.table.baseAmount}</th>
          <th>{dictionary.table.status}</th>
          <th className='text-end'>{dictionary.table.actions}</th>
        </tr></thead>
        <tbody>
          {loading ? <TableSkeletonRows columns={7} /> : data.invoices.length === 0 ? (
            <TableEmptyStateRow colSpan={7} icon='tabler-receipt-off' title={dictionary.empty.title} description={dictionary.empty.description} actionLabel={canWrite ? dictionary.actions.create : null} onAction={canWrite ? onAdd : null} />
          ) : data.invoices.map(invoice => {
            const displayStatus = invoice.is_overdue ? 'OVERDUE' : invoice.status.value

            return (
              <tr key={invoice.id} className='cursor-pointer' onClick={() => onView(invoice.id)}>
                <td>
                  <div className='flex min-is-[205px] items-center gap-3'>
                    <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'><i className='tabler-receipt' /></span>
                    <div className='min-is-0'>
                      <Typography variant='body2' className='whitespace-nowrap font-semibold text-primary'>#{invoice.invoice_number}</Typography>
                      <Typography variant='caption' color='text.secondary' className='block truncate'>#{invoice.contract.contract_number}</Typography>
                    </div>
                  </div>
                </td>
                <td><div className='flex min-is-[170px] items-center gap-2'><UserAvatar user={{ name: invoice.client.company_name || invoice.client.primary_contact_name }} size={32} /><Typography variant='body2' className='whitespace-nowrap font-medium'>{invoice.client.company_name || invoice.client.primary_contact_name}</Typography></div></td>
                <td>
                  <div className='min-is-[155px]'>
                    <Typography variant='body2' className='whitespace-nowrap'>{toDateInputValue(invoice.issued_date)}</Typography>
                    <Typography variant='caption' className={`whitespace-nowrap ${invoice.is_overdue ? 'font-semibold text-error' : 'text-textSecondary'}`}>{toDateInputValue(invoice.due_date)}</Typography>
                  </div>
                </td>
                <td className='text-end'>
                  <DualCurrencyAmount amount={invoice.amount} amountBase={invoice.amount_base} currency={invoice.currency} exchangeRate={invoice.exchange_rate} locale={locale} className='items-end' />
                </td>
                <td className='whitespace-nowrap text-end font-semibold'>{formatCurrency(invoice.amount_base, locale, data.baseCurrency)}</td>
                <td><div className='flex min-is-[150px] flex-col items-start gap-1'><Chip size='small' variant='tonal' color={STATUS_COLORS[displayStatus] || 'default'} label={invoice.is_overdue ? dictionary.status.OVERDUE : invoice.status.label} />{invoice.status.value === 'PARTIALLY_PAID' && <Typography variant='caption' color='text.secondary'>{dictionary.fields.remainingBalance || 'Remaining'}: {formatCurrency(invoice.remaining_balance, locale, invoice.currency)}</Typography>}</div></td>
                <td className='text-end' onClick={event => event.stopPropagation()}>
                  {renderActions(invoice)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
        </div>
      </ResponsiveDataTable>
      <DashboardTablePagination count={data.totalCount} page={page} rowsPerPage={rowsPerPage} rowsPerPageLabel={dictionary.pagination.rowsPerPage} ofLabel={dictionary.pagination.of} onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange} />
    </>
  )
}

export default InvoiceTableView

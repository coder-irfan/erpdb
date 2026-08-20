'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = { PAID: 'success', UNPAID: 'warning', PARTIALLY_PAID: 'info', CANCELLED: 'secondary', OVERDUE: 'error' }

const InvoiceTableView = ({ data, loading, statusUpdating, page, rowsPerPage, locale, dictionary, canWrite, canDelete, onPageChange, onRowsPerPageChange, onView, onPay, onEdit, onDelete, onStatusChange, onAdd }) => (
  <>
    <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead><tr>
          <th>{dictionary.table.invoiceContract}</th>
          <th>{dictionary.table.client}</th>
          <th>{dictionary.table.issueDue}</th>
          <th className='text-right'>{dictionary.table.amountCurrency}</th>
          <th className='text-right'>{dictionary.table.baseAmount}</th>
          <th>{dictionary.table.status}</th>
          <th className='text-right'>{dictionary.table.actions}</th>
        </tr></thead>
        <tbody>
          {loading ? <TableSkeletonRows columns={7} /> : data.invoices.length === 0 ? (
            <TableEmptyStateRow colSpan={7} icon='tabler-receipt-off' title={dictionary.empty.title} description={dictionary.empty.description} actionLabel={canWrite ? dictionary.actions.create : null} onAction={canWrite ? onAdd : null} />
          ) : data.invoices.map(invoice => {
            const displayStatus = invoice.is_overdue ? 'OVERDUE' : invoice.status.value

            return (
              <tr key={invoice.id}>
                <td>
                  <div className='flex min-is-[205px] items-center gap-3'>
                    <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'><i className='tabler-receipt' /></span>
                    <div className='min-is-0'>
                      <Typography variant='body2' className='whitespace-nowrap font-semibold text-primary'>#{invoice.invoice_number}</Typography>
                      <Typography variant='caption' color='text.secondary' className='block truncate'>#{invoice.contract.contract_number}</Typography>
                    </div>
                  </div>
                </td>
                <td><Typography variant='body2' className='min-is-[155px] whitespace-nowrap font-medium'>{invoice.client.company_name || invoice.client.primary_contact_name}</Typography></td>
                <td>
                  <div className='min-is-[155px]'>
                    <Typography variant='body2' className='whitespace-nowrap'>{toDateInputValue(invoice.issued_date)}</Typography>
                    <Typography variant='caption' className={`whitespace-nowrap ${invoice.is_overdue ? 'font-semibold text-error' : 'text-textSecondary'}`}>{toDateInputValue(invoice.due_date)}</Typography>
                  </div>
                </td>
                <td className='text-right'>
                  <Typography variant='body2' className='whitespace-nowrap font-semibold'>{formatCurrency(invoice.amount, locale, invoice.currency)}</Typography>
                  <Typography variant='caption' color='text.secondary'>{invoice.currency}</Typography>
                </td>
                <td className='whitespace-nowrap text-right font-semibold'>{formatCurrency(invoice.amount_base, locale, data.baseCurrency)}</td>
                <td><Chip size='small' variant='tonal' color={STATUS_COLORS[displayStatus] || 'default'} label={invoice.is_overdue ? dictionary.status.OVERDUE : invoice.status.label} /></td>
                <td className='text-right' onClick={event => event.stopPropagation()}>
                  <EntityActionsMenu
                    actions={[
                      { label: dictionary.actions.viewPrint, icon: 'tabler-printer', onClick: () => onView(invoice) },
                      canWrite && !invoice.payment_income && !['PAID', 'CANCELLED'].includes(invoice.status.value) && { label: dictionary.actions.recordPayment, icon: 'tabler-cash', onClick: () => onPay(invoice) },
                      canWrite && !invoice.payment_income && invoice.status.value !== 'PAID' && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(invoice) },
                      canDelete && !invoice.payment_income && invoice.status.value !== 'PAID' && { label: dictionary.actions.delete, icon: 'tabler-trash', color: 'error', onClick: () => onDelete(invoice) }
                    ]}
                    statusOptions={
                      canWrite && !invoice.payment_income && invoice.status.value !== 'PAID'
                        ? data.statuses.filter(status => status.value !== 'PAID')
                        : []
                    }
                    currentStatus={invoice.status_id}
                    statusDisabled={statusUpdating === invoice.id}
                    changeStatusLabel={dictionary.actions.changeStatus}
                    moreActionsLabel={dictionary.table.actions}
                    onStatusChange={statusId => onStatusChange(invoice, statusId)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    <DashboardTablePagination count={data.totalCount} page={page} rowsPerPage={rowsPerPage} rowsPerPageLabel={dictionary.pagination.rowsPerPage} ofLabel={dictionary.pagination.of} onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange} />
  </>
)

export default InvoiceTableView

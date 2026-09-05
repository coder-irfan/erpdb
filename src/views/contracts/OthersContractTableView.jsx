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

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  PENDING_SIGNATURE: 'info',
  EXPIRED: 'error',
  TERMINATED: 'error'
}

const remainingProps = days => {
  if (days < 0) return { color: 'error', icon: 'tabler-alert-triangle' }
  if (days <= 30) return { color: 'warning', icon: 'tabler-clock' }

  return { color: 'success', icon: 'tabler-calendar-check' }
}

const OthersContractTableView = ({
  data,
  loading,
  statusUpdating,
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
  onStatusChange,
  onAdd
}) => {
  const renderActions = contract => (
    <EntityActionsMenu
      locale={locale}
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(contract) },
        {
          label: dictionary.actions.printDocument || 'Print Document',
          icon: 'tabler-printer',
          onClick: () => onPrint(contract)
        },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(contract) },
        canDelete && {
          label: dictionary.actions.delete,
          icon: 'tabler-trash',
          color: 'error',
          onClick: () => onDelete(contract)
        }
      ]}
      statusOptions={
        canWrite ? data.statuses.map(status => ({ ...status, skipConfirmation: status.value === 'TERMINATED' })) : []
      }
      currentStatus={contract.status_id}
      statusDisabled={statusUpdating === contract.id}
      changeStatusLabel={dictionary.actions.changeStatus}
      moreActionsLabel={dictionary.table.actions}
      onStatusChange={statusId => onStatusChange(contract, statusId)}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.contracts}
        loading={loading}
        getMobileRowId={contract => contract.id}
        onRowClick={onView}
        renderMobilePrimary={contract => (
          <div className='flex min-is-0 items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
              <i className='tabler-file-certificate' />
            </span>
            <div className='min-is-0'>
              <Typography variant='body2' className='truncate font-semibold text-primary'>
                {contract.contract_number}
              </Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>
                {contract.vendor?.company_name || contract.title}
              </Typography>
            </div>
          </div>
        )}
        renderMobileStatus={contract => (
          <Chip
            size='small'
            variant='tonal'
            color={STATUS_COLORS[contract.status.value] || 'default'}
            label={contract.status.label}
          />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          {
            id: 'vendor',
            label: 'Vendor',
            render: contract => (
              <div className='flex items-center gap-2'>
                <UserAvatar user={{ name: contract.vendor?.company_name || contract.title }} size={32} />
                <span className='truncate'>{contract.vendor?.company_name || contract.title}</span>
              </div>
            )
          },
          { id: 'type', label: 'Contract Purpose', render: contract => contract.contract_type.label },
          { id: 'template', label: 'Contract Template', render: contract => contract.template?.label || '—' },
          { id: 'owner', label: 'Internal Owner', render: contract => contract.account_manager?.full_name || '—' },
          {
            id: 'duration',
            label: 'Contract Duration',
            render: contract => `${toDateInputValue(contract.start_date)} \u2192 ${toDateInputValue(contract.end_date)}`
          },
          {
            id: 'amount',
            label: 'Total Amount',
            render: contract => (
              <DualCurrencyAmount
                amount={contract.total_amount}
                amountBase={contract.amount_base}
                currency={contract.currency}
                exchangeRate={contract.exchange_rate}
                locale={locale}
              />
            )
          }
        ]}
        emptyState={{
          icon: 'tabler-building-store',
          title: 'No other contracts found',
          description: 'Create a vendor, lease, or miscellaneous contract or adjust the filters.',
          actionLabel: canWrite ? dictionary.actions.add : undefined,
          onAction: canWrite ? onAdd : undefined
        }}
      >
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Vendor</th>
                <th>Contract Purpose</th>
                <th>Contract Template</th>
                <th>Duration</th>
                <th>Internal Owner</th>
                <th className='text-end'>Amount</th>
                <th>Status</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={9} />
              ) : data.contracts.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={9}
                  icon='tabler-building-store'
                  title='No other contracts found'
                  description='Create a vendor, lease, or miscellaneous contract or adjust the filters.'
                  actionLabel={canWrite ? dictionary.actions.add : null}
                  onAction={canWrite ? onAdd : null}
                />
              ) : (
                data.contracts.map(contract => {
                  const remaining = remainingProps(contract.remaining_days)
                  const vendorName = contract.vendor?.company_name || contract.title

                  return (
                    <tr key={contract.id} className='cursor-pointer' onClick={() => onView(contract)}>
                      <td>
                        <div className='flex min-is-[210px] items-center gap-3'>
                          <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
                            <i className='tabler-file-certificate' />
                          </span>
                          <div className='min-is-0'>
                            <Typography variant='body2' className='whitespace-nowrap font-semibold text-primary'>
                              {contract.contract_number}
                            </Typography>
                            <Tooltip title={contract.title}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                className='block max-is-[220px] truncate'
                              >
                                {contract.title}
                              </Typography>
                            </Tooltip>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className='flex min-is-[190px] items-center gap-2'>
                          <UserAvatar user={{ name: vendorName }} size={32} />
                          <div className='min-is-0'>
                            <Typography variant='body2' className='truncate font-medium'>
                              {vendorName}
                            </Typography>
                            <Typography variant='caption' color='text.secondary' className='block truncate'>
                              {contract.vendor?.contact_name || '—'}
                            </Typography>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Typography variant='body2' className='min-is-[150px] font-medium'>
                          {contract.contract_type.label}
                        </Typography>
                      </td>
                      <td>
                        <Typography variant='body2' className='min-is-[150px] font-medium'>
                          {contract.template?.label || '—'}
                        </Typography>
                      </td>
                      <td>
                        <div className='min-is-[190px]'>
                          <Typography variant='body2' className='whitespace-nowrap font-medium'>
                            {toDateInputValue(contract.start_date)} {' \u2192 '} {toDateInputValue(contract.end_date)}
                          </Typography>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={remaining.color}
                            icon={<i className={remaining.icon} />}
                            label={
                              contract.remaining_days < 0
                                ? dictionary.remaining.expired.replace('{days}', Math.abs(contract.remaining_days))
                                : dictionary.remaining.days.replace('{days}', contract.remaining_days)
                            }
                            className='mt-1'
                          />
                        </div>
                      </td>
                      <td>
                        <div className='min-is-[160px]'>
                          <Typography variant='body2' className='whitespace-nowrap font-medium'>
                            {contract.account_manager?.full_name || '—'}
                          </Typography>
                          {contract.account_manager?.position && (
                            <Typography variant='caption' color='text.secondary' className='block truncate'>
                              {contract.account_manager.position}
                            </Typography>
                          )}
                        </div>
                      </td>
                      <td className='whitespace-nowrap text-end'>
                        <DualCurrencyAmount
                          amount={contract.total_amount}
                          amountBase={contract.amount_base}
                          currency={contract.currency}
                          exchangeRate={contract.exchange_rate}
                          locale={locale}
                          className='items-end'
                        />
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={STATUS_COLORS[contract.status.value] || 'default'}
                          label={contract.status.label}
                        />
                      </td>
                      <td className='text-end' onClick={event => event.stopPropagation()}>
                        {renderActions(contract)}
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
        rowsPerPageLabel={dictionary.pagination.rowsPerPage}
        ofLabel={dictionary.pagination.of}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  )
}

export default OthersContractTableView

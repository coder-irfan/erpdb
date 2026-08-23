'use client'

import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = { ACTIVE: 'success', DRAFT: 'secondary', EXPIRED: 'error', TERMINATED: 'error' }

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
      statusOptions={canWrite ? data.statuses : []}
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
          <div className='min-is-0'>
            <Typography color='primary.main' className='truncate font-semibold'>
              {contract.contract_number}
            </Typography>
            <Typography variant='body2' color='text.secondary' className='truncate'>
              {contract.title}
            </Typography>
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
          { id: 'type', label: 'Contract Type', render: contract => contract.contract_type.label },
          {
            id: 'amount',
            label: 'Total Amount',
            render: contract => formatCurrency(contract.total_amount, locale, contract.currency)
          },
          { id: 'start', label: 'Start Date', render: contract => toDateInputValue(contract.start_date) },
          { id: 'end', label: 'End Date', render: contract => toDateInputValue(contract.end_date) }
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
                <th>Contract Number</th>
                <th>Third Party / Title</th>
                <th>Contract Type</th>
                <th className='text-end'>Total Amount</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th className='text-end'>{dictionary.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={8} />
              ) : data.contracts.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={8}
                  icon='tabler-building-store'
                  title='No other contracts found'
                  description='Create a vendor, lease, or miscellaneous contract or adjust the filters.'
                  actionLabel={canWrite ? dictionary.actions.add : null}
                  onAction={canWrite ? onAdd : null}
                />
              ) : (
                data.contracts.map(contract => (
                  <tr key={contract.id} onClick={() => onView(contract)}>
                    <td>
                      <div className='flex min-is-[210px] items-center gap-3'>
                        <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
                          <i className='tabler-file-certificate' />
                        </span>
                        <div className='min-is-0'>
                          <Typography color='primary.main' className='font-semibold'>
                            {contract.contract_number}
                          </Typography>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Typography color='text.primary' className='min-is-[180px] font-medium'>
                        {contract.title}
                      </Typography>
                    </td>
                    <td>{contract.contract_type.label}</td>
                    <td className='whitespace-nowrap text-end font-semibold'>
                      {formatCurrency(contract.total_amount, locale, contract.currency)}
                    </td>
                    <td className='whitespace-nowrap'>{toDateInputValue(contract.start_date)}</td>
                    <td className='whitespace-nowrap'>{toDateInputValue(contract.end_date)}</td>
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
        rowsPerPageLabel={dictionary.pagination.rowsPerPage}
        ofLabel={dictionary.pagination.of}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  )
}

export default OthersContractTableView

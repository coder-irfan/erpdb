'use client'

import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

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

const ContractTableView = ({
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
  onEdit,
  onDelete,
  onStatusChange,
  onAdd
}) => (
  <>
    <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>{dictionary.table.contract}</th>
            <th>{dictionary.table.client}</th>
            <th>{dictionary.table.serviceDuration}</th>
            <th>{dictionary.table.endRemaining}</th>
            <th className='text-end'>{dictionary.table.amount}</th>
            <th>{dictionary.table.status}</th>
            <th className='text-end'>{dictionary.table.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeletonRows columns={7} />
          ) : data.contracts.length === 0 ? (
            <TableEmptyStateRow
              colSpan={7}
              icon='tabler-file-off'
              title={dictionary.empty.title}
              description={dictionary.empty.description}
              actionLabel={canWrite ? dictionary.actions.add : null}
              onAction={canWrite ? onAdd : null}
            />
          ) : (
            data.contracts.map(contract => {
              const remaining = remainingProps(contract.remaining_days)

              return (
                <tr key={contract.id} onClick={() => onView(contract)}>
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
                    <Typography variant='body2' className='min-is-[150px] whitespace-nowrap font-medium'>
                      {contract.client.company_name}
                    </Typography>
                  </td>
                  <td>
                    <div className='min-is-[170px]'>
                      <Typography variant='body2' className='whitespace-nowrap font-medium'>
                        {contract.contract_type.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {contract.duration_option?.label || dictionary.common.notAvailable}
                      </Typography>
                    </div>
                  </td>
                  <td>
                    <div className='min-is-[170px]'>
                      <Typography variant='body2' className='whitespace-nowrap'>
                        {toDateInputValue(contract.end_date)}
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
                  <td className='whitespace-nowrap text-end font-semibold'>
                    {formatCurrency(contract.total_amount, locale, contract.currency)}
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
                    <div className='flex min-is-[245px] items-center justify-end gap-1'>
                      <Tooltip title={dictionary.actions.view}>
                        <IconButton onClick={() => onView(contract)}>
                          <i className='tabler-eye' />
                        </IconButton>
                      </Tooltip>
                      {canWrite && (
                        <Tooltip title={dictionary.actions.edit}>
                          <IconButton onClick={() => onEdit(contract)}>
                            <i className='tabler-edit' />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title={dictionary.actions.delete}>
                          <IconButton color='error' onClick={() => onDelete(contract)}>
                            <i className='tabler-trash' />
                          </IconButton>
                        </Tooltip>
                      )}
                      <CustomTextField
                        select
                        value={contract.status_id || ''}
                        onChange={event => onStatusChange(contract, event.target.value)}
                        disabled={!canWrite || statusUpdating === contract.id}
                        aria-label={dictionary.actions.changeStatus}
                        className='is-[135px]'
                      >
                        {data.statuses.map(status => (
                          <MenuItem key={status.id} value={status.id}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
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

export default ContractTableView

'use client'

import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const MetricChip = ({ icon, value, label, color }) => (
  <Tooltip title={label}>
    <Chip size='small' variant='tonal' color={color} icon={<i className={icon} />} label={value} />
  </Tooltip>
)

const ClientTableView = ({
  data,
  loading,
  page,
  rowsPerPage,
  locale,
  currencyCode,
  dictionary,
  canWrite,
  canDelete,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onActivity,
  onEdit,
  onDelete,
  onAdd
}) => (
  <>
    <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>{dictionary.table.company}</th>
            <th>{dictionary.table.manager}</th>
            <th>{dictionary.table.metrics}</th>
            <th>{dictionary.table.status}</th>
            <th className='text-end'>{dictionary.table.revenue}</th>
            <th className='text-end'>{dictionary.table.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeletonRows columns={6} />
          ) : data.clients.length === 0 ? (
            <TableEmptyStateRow
              colSpan={6}
              icon='tabler-building-off'
              title={dictionary.empty.title}
              description={dictionary.empty.description}
              actionLabel={canWrite ? dictionary.actions.add : null}
              onAction={canWrite ? onAdd : null}
            />
          ) : (
            data.clients.map(client => (
              <tr
                key={client.id}
                className='cursor-pointer transition-colors duration-200'
                onClick={() => onView(client)}
              >
                <td>
                  <div className='flex min-is-[220px] items-center gap-3'>
                    <Avatar variant='rounded' className='bg-primaryLighter text-primary'></Avatar>
                    <div className='min-is-0'>
                      <Typography className='font-semibold' color='text.primary'>
                        {client.company_name}
                      </Typography>
                      <Tooltip
                        title={[client.primary_contact_name, client.email, client.phone].filter(Boolean).join(' · ')}
                      >
                        <Typography variant='body2' color='text.secondary' className='max-is-[240px] truncate'>
                          {[client.primary_contact_name, client.phone].filter(Boolean).join(' · ') || '—'}
                        </Typography>
                      </Tooltip>
                    </div>
                  </div>
                </td>
                <td>
                  {client.account_manager ? (
                    <div>
                      <Typography variant='body2' className='font-medium'>
                        {client.account_manager.full_name}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {client.account_manager.position}
                      </Typography>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <div className='flex flex-wrap gap-2'>
                    <MetricChip
                      icon='tabler-briefcase'
                      value={client._count.projects}
                      label={dictionary.metrics.projects}
                      color='primary'
                    />
                    <MetricChip
                      icon='tabler-file-text'
                      value={client._count.contracts}
                      label={dictionary.metrics.contracts}
                      color='info'
                    />
                    <MetricChip
                      icon='tabler-receipt'
                      value={client._count.invoices}
                      label={dictionary.metrics.invoices}
                      color='warning'
                    />
                  </div>
                </td>
                <td>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={client.status === 'ACTIVE' ? 'success' : 'secondary'}
                    label={dictionary.status[client.status] || client.status}
                  />
                </td>
                <td className='text-end font-semibold text-success'>
                  {formatCurrency(client.total_revenue, locale, currencyCode)}
                </td>
                <td className='text-end' onClick={event => event.stopPropagation()}>
                  <div className='flex justify-end gap-1'>
                    <Tooltip title={dictionary.actions.view}>
                      <IconButton onClick={() => onView(client)}>
                        <i className='tabler-eye' />
                      </IconButton>
                    </Tooltip>
                    {canWrite && (
                      <Tooltip title={dictionary.actions.activity}>
                        <IconButton onClick={() => onActivity(client)}>
                          <i className='tabler-activity' />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canWrite && (
                      <Tooltip title={dictionary.actions.edit}>
                        <IconButton onClick={() => onEdit(client)}>
                          <i className='tabler-edit' />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title={dictionary.actions.delete}>
                        <IconButton color='error' onClick={() => onDelete(client)}>
                          <i className='tabler-trash' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))
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

export default ClientTableView

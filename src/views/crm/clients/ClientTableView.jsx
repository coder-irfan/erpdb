'use client'

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import QuickContact from '@/components/common/QuickContact'
import UserAvatar from '@/components/common/UserAvatar'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
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
  statusUpdating,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onActivity,
  onEdit,
  onDelete,
  onStatusChange,
  onAdd
}) => {
  const renderActions = client => (
    <EntityActionsMenu
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(client) },
        canWrite && { label: dictionary.actions.activity, icon: 'tabler-activity', onClick: () => onActivity(client) },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(client) },
        canDelete && {
          label: dictionary.actions.delete,
          icon: 'tabler-trash',
          color: 'error',
          onClick: () => onDelete(client)
        }
      ]}
      statusOptions={
        canWrite
          ? [
              { id: 'ACTIVE', label: dictionary.status.ACTIVE },
              { id: 'INACTIVE', label: dictionary.status.INACTIVE }
            ]
          : []
      }
      currentStatus={client.status}
      statusDisabled={statusUpdating === client.id}
      changeStatusLabel={dictionary.actions.changeStatus}
      moreActionsLabel={dictionary.table.actions}
      onStatusChange={nextStatus => onStatusChange(client, nextStatus)}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.clients}
        loading={loading}
        getMobileRowId={client => client.id}
        onRowClick={onView}
        renderMobilePrimary={client => (
          <div className='flex min-is-0 items-center gap-3'>
            <UserAvatar user={{ name: client.company_name }} size={40} />
            <div className='min-is-0'>
              <Typography className='truncate font-semibold' color='text.primary'>
                {client.company_name}
              </Typography>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {client.primary_contact_name && `${client.primary_contact_name} · `}
                <QuickContact table email={client.email} phone={client.phone}>
                  {client.email || client.phone}
                </QuickContact>
              </Typography>
            </div>
          </div>
        )}
        renderMobileStatus={client => (
          <Chip
            size='small'
            variant='tonal'
            color={client.status === 'ACTIVE' ? 'success' : 'secondary'}
            label={dictionary.status[client.status] || client.status}
          />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          {
            id: 'manager',
            label: dictionary.table.manager,
            render: client => client.account_manager?.full_name || '—'
          },
          {
            id: 'metrics',
            label: dictionary.table.metrics,
            render: client =>
              `${dictionary.metrics.projects}: ${client._count.projects} · ${dictionary.metrics.contracts}: ${client._count.contracts} · ${dictionary.metrics.invoices}: ${client._count.invoices}`
          },
          {
            id: 'revenue',
            label: dictionary.table.revenue,
            render: client => formatCurrency(client.total_revenue, locale, currencyCode)
          }
        ]}
        emptyState={{
          icon: 'tabler-building-off',
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
                        <UserAvatar user={{ name: client.company_name }} size={40} />
                        <div className='min-is-0'>
                          <Typography className='font-semibold' color='text.primary'>
                            {client.company_name}
                          </Typography>
                          <Tooltip
                            title={[client.primary_contact_name, client.email, client.phone]
                              .filter(Boolean)
                              .join(' · ')}
                          >
                            <Typography variant='body2' color='text.secondary' className='max-is-[240px] truncate'>
                              {client.primary_contact_name && `${client.primary_contact_name} · `}
                              <QuickContact table email={client.email} phone={client.phone}>
                                {client.email || client.phone}
                              </QuickContact>
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
                      {renderActions(client)}
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

export default ClientTableView

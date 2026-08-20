'use client'

import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatTime = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, { timeStyle: 'short' }).format(new Date(value))
    : '—'

const getDuration = visitor => {
  const end = visitor.check_out_time ? new Date(visitor.check_out_time) : new Date()
  const minutes = Math.max(0, Math.floor((end.getTime() - new Date(visitor.visited_at).getTime()) / 60_000))

  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

const VisitorTableView = ({
  data,
  loading,
  page,
  rowsPerPage,
  locale,
  dictionary,
  canWrite,
  canDelete,
  busyId,
  onPageChange,
  onRowsPerPageChange,
  onCheckout,
  onConvert,
  onEdit,
  onDelete,
  onAdd
}) => (
  <>
    <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>{dictionary.table.visitor}</th>
            <th>{dictionary.table.purpose}</th>
            <th>{dictionary.table.host}</th>
            <th>{dictionary.table.times}</th>
            <th>{dictionary.table.status}</th>
            <th className='text-end'>{dictionary.table.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeletonRows columns={6} />
          ) : data.visitors.length === 0 ? (
            <TableEmptyStateRow
              colSpan={6}
              icon='tabler-users-minus'
              title={dictionary.empty.title}
              description={dictionary.empty.description}
              actionLabel={canWrite ? dictionary.actions.add : null}
              onAction={canWrite ? onAdd : null}
            />
          ) : (
            data.visitors.map(visitor => (
              <tr key={visitor.id}>
                <td>
                  <div className='flex min-is-[220px] items-center gap-3'>
                    <Avatar variant='rounded' className='bg-primaryLighter text-primary'></Avatar>
                    <div>
                      <Typography className='font-semibold' color='text.primary'>
                        {visitor.full_name}
                      </Typography>
                      <Tooltip title={[visitor.company_name, visitor.phone, visitor.email].filter(Boolean).join(' · ')}>
                        <Typography variant='body2' color='text.secondary' className='max-is-[240px] truncate'>
                          {[visitor.company_name, visitor.phone].filter(Boolean).join(' · ') || '—'}
                        </Typography>
                      </Tooltip>
                    </div>
                  </div>
                </td>
                <td>
                  <Chip
                    size='small'
                    variant='tonal'
                    color='info'
                    label={dictionary.purposes[visitor.purpose] || visitor.purpose}
                  />
                  {visitor.notes && (
                    <Tooltip title={visitor.notes}>
                      <i className='tabler-notes ms-2 text-textSecondary' />
                    </Tooltip>
                  )}
                </td>
                <td>
                  {visitor.host_staff ? (
                    <div>
                      <Typography variant='body2' className='font-medium'>
                        {visitor.host_staff.full_name}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {visitor.host_staff.position}
                      </Typography>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <Tooltip title={`${dictionary.table.duration}: ${getDuration(visitor)}`} arrow>
                    <div className='flex min-is-[180px] items-center gap-2 whitespace-nowrap'>
                      <Chip
                        size='small'
                        variant='tonal'
                        color='warning'
                        icon={<i className='tabler-login' />}
                        label={formatTime(visitor.visited_at, locale)}
                      />
                      {visitor.check_out_time && (
                        <Chip
                          size='small'
                          variant='tonal'
                          color='success'
                          icon={<i className='tabler-logout' />}
                          label={formatTime(visitor.check_out_time, locale)}
                        />
                      )}
                    </div>
                  </Tooltip>
                </td>
                <td>
                  <div className='flex flex-col items-start gap-1'>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={visitor.status === 'CHECKED_IN' ? 'warning' : 'success'}
                      label={dictionary.status[visitor.status] || visitor.status}
                    />
                    {visitor.converted_lead && (
                      <Chip
                        size='small'
                        variant='tonal'
                        color='primary'
                        icon={<i className='tabler-user-share' />}
                        label={dictionary.status.CONVERTED}
                      />
                    )}
                  </div>
                </td>
                <td className='text-end'>
                  <EntityActionsMenu
                    actions={[
                      canWrite && visitor.status === 'CHECKED_IN' && { label: dictionary.actions.checkout, icon: 'tabler-door-exit', disabled: busyId === visitor.id, onClick: () => onCheckout(visitor) },
                      canWrite && !visitor.converted_lead && { label: dictionary.actions.convert, icon: 'tabler-user-share', disabled: busyId === visitor.id, onClick: () => onConvert(visitor) },
                      canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', disabled: busyId === visitor.id, onClick: () => onEdit(visitor) },
                      canDelete && { label: dictionary.actions.delete, icon: 'tabler-trash', color: 'error', disabled: busyId === visitor.id, onClick: () => onDelete(visitor) }
                    ]}
                    moreActionsLabel={dictionary.table.actions}
                  />
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

export default VisitorTableView

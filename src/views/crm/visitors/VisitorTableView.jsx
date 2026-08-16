'use client'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'

import tableStyles from '@core/styles/table.module.css'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatTime = (value, locale) => value ? new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

const getDuration = visitor => {
  const end = visitor.check_out_time ? new Date(visitor.check_out_time) : new Date()
  const minutes = Math.max(0, Math.floor((end.getTime() - new Date(visitor.visited_at).getTime()) / 60_000))

  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

const VisitorTableView = ({ data, loading, page, rowsPerPage, locale, dictionary, canWrite, canDelete, busyId, onPageChange, onRowsPerPageChange, onCheckout, onConvert, onEdit, onDelete, onAdd }) => (
  <>
    <div className='overflow-x-auto'>
      <table className={tableStyles.table}>
        <thead><tr><th>{dictionary.table.visitor}</th><th>{dictionary.table.purpose}</th><th>{dictionary.table.host}</th><th>{dictionary.table.times}</th><th>{dictionary.table.status}</th><th className='text-right'>{dictionary.table.actions}</th></tr></thead>
        <tbody>
          {loading ? <TableSkeletonRows columns={6} /> : data.visitors.length === 0 ? <TableEmptyStateRow colSpan={6} icon='tabler-users-minus' title={dictionary.empty.title} description={dictionary.empty.description} actionLabel={canWrite ? dictionary.actions.add : null} onAction={canWrite ? onAdd : null} /> : data.visitors.map(visitor => (
            <tr key={visitor.id}>
              <td><div className='flex items-start gap-3'><Avatar className='bg-primaryLighter text-primary'>{visitor.full_name.slice(0, 1).toUpperCase()}</Avatar><div><Typography className='font-semibold' color='text.primary'>{visitor.full_name}</Typography><Typography variant='body2'>{visitor.company_name || '—'}</Typography><Typography variant='caption' color='text.secondary'>{visitor.phone}{visitor.email ? ` · ${visitor.email}` : ''}</Typography></div></div></td>
              <td><Chip size='small' variant='tonal' color='info' label={dictionary.purposes[visitor.purpose] || visitor.purpose} />{visitor.notes && <Tooltip title={visitor.notes}><i className='tabler-notes ms-2 text-textSecondary' /></Tooltip>}</td>
              <td>{visitor.host_staff ? <div className='flex items-center gap-2'><Avatar className='size-8 bg-infoLight text-info'>{visitor.host_staff.full_name.slice(0, 1)}</Avatar><div><Typography variant='body2' className='font-medium'>{visitor.host_staff.full_name}</Typography><Typography variant='caption' color='text.secondary'>{visitor.host_staff.position}</Typography></div></div> : '—'}</td>
              <td><Typography variant='body2'><i className='tabler-login me-1 text-warning' />{formatTime(visitor.visited_at, locale)}</Typography>{visitor.check_out_time && <Typography variant='body2'><i className='tabler-logout me-1 text-success' />{formatTime(visitor.check_out_time, locale)}</Typography>}<Typography variant='caption' color='text.secondary'>{dictionary.table.duration}: {getDuration(visitor)}</Typography></td>
              <td><div className='flex flex-col items-start gap-1'><Chip size='small' variant='tonal' color={visitor.status === 'CHECKED_IN' ? 'warning' : 'success'} label={dictionary.status[visitor.status] || visitor.status} />{visitor.converted_lead && <Chip size='small' variant='tonal' color='primary' icon={<i className='tabler-user-share' />} label={dictionary.status.CONVERTED} />}</div></td>
              <td className='text-right'><div className='flex items-center justify-end gap-1'>{canWrite && visitor.status === 'CHECKED_IN' && <Button size='small' variant='tonal' color='success' disabled={busyId === visitor.id} startIcon={<i className='tabler-door-exit' />} onClick={() => onCheckout(visitor)}>{dictionary.actions.checkout}</Button>}{canWrite && !visitor.converted_lead && <Tooltip title={dictionary.actions.convert}><IconButton color='primary' disabled={busyId === visitor.id} onClick={() => onConvert(visitor)}><i className='tabler-user-share' /></IconButton></Tooltip>}{canWrite && <Tooltip title={dictionary.actions.edit}><IconButton onClick={() => onEdit(visitor)}><i className='tabler-edit' /></IconButton></Tooltip>}{canDelete && <Tooltip title={dictionary.actions.delete}><IconButton color='error' onClick={() => onDelete(visitor)}><i className='tabler-trash' /></IconButton></Tooltip>}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <DashboardTablePagination count={data.totalCount} page={page} rowsPerPage={rowsPerPage} rowsPerPageLabel={dictionary.pagination.rowsPerPage} ofLabel={dictionary.pagination.of} onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange} />
  </>
)

export default VisitorTableView

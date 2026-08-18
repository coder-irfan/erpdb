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

const COLOR_MAP = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const LeadTableView = ({
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
  onActivity,
  onConvert,
  onEdit,
  onDelete,
  onAdd
}) => {
  const formatDate = value =>
    value
      ? new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, { dateStyle: 'medium' }).format(new Date(value))
      : '—'

  const now = new Date()

  return (
    <>
      <div className='no-scrollbar overflow-x-auto scroll-smooth'>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>{dictionary.table.lead}</th>
              <th>{dictionary.table.contact}</th>
              <th>{dictionary.table.source}</th>
              <th>{dictionary.table.status}</th>
              <th className='text-end'>{dictionary.table.value}</th>
              <th>{dictionary.table.assigned}</th>
              <th>{dictionary.table.followUp}</th>
              <th className='text-end'>{dictionary.table.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows columns={8} />
            ) : data.leads.length === 0 ? (
              <TableEmptyStateRow
                colSpan={8}
                icon='tabler-filter-off'
                title={dictionary.empty.title}
                description={dictionary.empty.description}
                actionLabel={canWrite ? dictionary.actions.newLead : null}
                onAction={canWrite ? onAdd : null}
              />
            ) : (
              data.leads.map(lead => {
                const overdue =
                  lead.next_follow_up_date && new Date(lead.next_follow_up_date) < now && !lead.converted_client

                return (
                  <tr key={lead.id}>
                    <td>
                      <div className='flex min-is-[220px] items-center gap-3'>
                        <Avatar variant='rounded' className='bg-primaryLighter text-primary'></Avatar>
                        <div>
                          <Typography className='font-medium' color='text.primary'>
                            {lead.title}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {lead.company_name || '—'}
                          </Typography>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Typography>{lead.contact_name}</Typography>
                      <Tooltip title={[lead.email, lead.phone].filter(Boolean).join(' · ')}>
                        <Typography variant='body2' color='text.secondary' className='max-is-[220px] truncate'>
                          {lead.email || lead.phone || '—'}
                        </Typography>
                      </Tooltip>
                    </td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={COLOR_MAP[lead.source.color_code] || 'primary'}
                        label={lead.source.label}
                      />
                    </td>
                    <td>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={COLOR_MAP[lead.status.color_code] || 'secondary'}
                        label={lead.status.label}
                      />
                    </td>
                    <td className='text-end font-semibold text-success'>
                      {formatCurrency(lead.estimated_value, locale, lead.currency || currencyCode)}
                    </td>
                    <td>
                      {lead.assigned_to ? (
                        <div>
                          <Typography variant='body2' className='font-medium'>
                            {lead.assigned_to.full_name}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {lead.assigned_to.position}
                          </Typography>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {lead.next_follow_up_date ? (
                        <Chip
                          size='small'
                          variant='tonal'
                          color={overdue ? 'error' : 'warning'}
                          label={formatDate(lead.next_follow_up_date)}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='text-end'>
                      <div className='flex justify-end gap-1'>
                        <Tooltip title={dictionary.actions.activity}>
                          <IconButton onClick={() => onActivity(lead)}>
                            <i className='tabler-activity' />
                          </IconButton>
                        </Tooltip>
                        {canWrite && !lead.converted_client && (
                          <Tooltip title={dictionary.actions.convert}>
                            <IconButton color='success' onClick={() => onConvert(lead)}>
                              <i className='tabler-user-check' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canWrite && (
                          <Tooltip title={dictionary.actions.edit}>
                            <IconButton onClick={() => onEdit(lead)}>
                              <i className='tabler-edit' />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && !lead.converted_client && (
                          <Tooltip title={dictionary.actions.delete}>
                            <IconButton color='error' onClick={() => onDelete(lead)}>
                              <i className='tabler-trash' />
                            </IconButton>
                          </Tooltip>
                        )}
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
}

export default LeadTableView

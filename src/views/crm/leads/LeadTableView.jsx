'use client'

import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import UserAvatar from '@/components/common/UserAvatar'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
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
  onAdd,
  onView
}) => {
  const formatDate = value =>
    value
      ? new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, { dateStyle: 'medium' }).format(new Date(value))
      : '—'

  const now = new Date()

  const renderActions = lead => (
    <EntityActionsMenu
      actions={[
        { label: dictionary.actions.view || 'View details', icon: 'tabler-eye', onClick: () => onView(lead) },
        { label: dictionary.actions.activity, icon: 'tabler-activity', onClick: () => onActivity(lead) },
        canWrite &&
          !lead.converted_client && {
            label: dictionary.actions.convert,
            icon: 'tabler-user-check',
            onClick: () => onConvert(lead)
          },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(lead) },
        canDelete &&
          !lead.converted_client && {
            label: dictionary.actions.delete,
            icon: 'tabler-trash',
            color: 'error',
            onClick: () => onDelete(lead)
          }
      ]}
      moreActionsLabel={dictionary.table.actions}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.leads}
        loading={loading}
        getMobileRowId={lead => lead.id}
        renderMobilePrimary={lead => (
          <div className='flex min-is-0 items-center gap-3'>
            <UserAvatar user={{ name: lead.title }} size={40} />
            <div className='min-is-0'>
              <Typography className='truncate font-medium' color='text.primary'>
                {lead.title}
              </Typography>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {lead.company_name || '—'}
              </Typography>
            </div>
          </div>
        )}
        renderMobileStatus={lead => (
          <Chip
            size='small'
            variant='tonal'
            color={COLOR_MAP[lead.status.color_code] || 'secondary'}
            label={lead.status.label}
          />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          {
            id: 'contact',
            label: dictionary.table.contact,
            render: lead => [lead.contact_name, lead.email || lead.phone].filter(Boolean).join(' · ') || '—'
          },
          { id: 'source', label: dictionary.table.source, render: lead => lead.source.label },
          {
            id: 'value',
            label: dictionary.table.value,
            render: lead => formatCurrency(lead.estimated_value, locale, lead.currency || currencyCode)
          },
          {
            id: 'assigned',
            label: dictionary.table.assigned,
            render: lead => lead.assigned_to?.full_name || '—'
          },
          {
            id: 'follow-up',
            label: dictionary.table.followUp,
            render: lead => formatDate(lead.next_follow_up_date)
          }
        ]}
        emptyState={{
          icon: 'tabler-filter-off',
          title: dictionary.empty.title,
          description: dictionary.empty.description,
          actionLabel: canWrite ? dictionary.actions.newLead : undefined,
          onAction: canWrite ? onAdd : undefined
        }}
        onRowClick={row => onView(row.original || row)}
      >
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
                    <tr key={lead.id} className='cursor-pointer' onClick={event => {
                      if (!event.target.closest('button, a, input, select, textarea, [role="button"], [data-row-action]')) onView(lead)
                    }}>
                      <td>
                        <div className='flex min-is-[220px] items-center gap-3'>
                          <UserAvatar user={{ name: lead.title }} size={40} />
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
                      <td className='text-end'>{renderActions(lead)}</td>
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

export default LeadTableView

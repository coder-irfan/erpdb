'use client'

import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

import tableStyles from '@core/styles/table.module.css'

const CHIP_COLORS = { ACTIVE: 'success', IN_PROGRESS: 'primary', PLANNING: 'info', ON_HOLD: 'warning', COMPLETED: 'success', CANCELLED: 'secondary', LOW: 'success', MEDIUM: 'info', HIGH: 'warning', URGENT: 'error' }
const PALETTE_COLORS = new Set(['primary', 'secondary', 'success', 'error', 'info', 'warning'])
const initials = name => name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?'

const chipProps = option => {
  const configuredColor = option.color_code?.toLowerCase()

  if (PALETTE_COLORS.has(configuredColor)) return { color: configuredColor }

  if (/^#[0-9a-f]{6}$/i.test(configuredColor || '')) {
    return { sx: { color: configuredColor, backgroundColor: `${configuredColor}18`, borderColor: `${configuredColor}55` } }
  }

  return { color: CHIP_COLORS[option.value] || 'default' }
}

const ProjectTableView = ({ data, loading, statusUpdating, page, rowsPerPage, locale, dictionary, canWrite, canDelete, statusOptions, onPageChange, onRowsPerPageChange, onView, onEdit, onMembers, onDelete, onStatusChange, onAdd }) => {
  const renderActions = project => (
    <EntityActionsMenu
      moreActionsLabel={dictionary.table.actions}
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(project) },
        canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(project) },
        canWrite && { label: dictionary.actions.manageMembers, icon: 'tabler-users-plus', onClick: () => onMembers(project) },
        canDelete && { label: dictionary.actions.delete, icon: 'tabler-trash', color: 'error', onClick: () => onDelete(project) }
      ]}
      statusOptions={canWrite ? statusOptions : []}
      currentStatus={project.status_id}
      statusDisabled={statusUpdating === project.id}
      changeStatusLabel={dictionary.actions.changeStatus}
      onStatusChange={statusId => onStatusChange(project, statusId)}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.projects}
        loading={loading}
        getMobileRowId={project => project.id}
        onRowClick={onView}
        renderMobilePrimary={project => (
          <div className='flex min-is-0 items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
              <i className='tabler-briefcase' />
            </span>
            <div className='min-is-0'>
              <Chip size='small' variant='tonal' color='primary' label={project.project_code} />
              <Typography variant='caption' color='text.secondary' className='mt-1 block truncate'>{project.title}</Typography>
            </div>
          </div>
        )}
        renderMobileStatus={project => (
          <Chip size='small' variant='tonal' label={project.status.label} {...chipProps(project.status)} />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          { id: 'client', label: dictionary.table.client, render: project => project.client.company_name },
          {
            id: 'team',
            label: dictionary.table.team,
            render: project => project.project_manager?.full_name || dictionary.common.unassigned
          },
          {
            id: 'timeline',
            label: dictionary.table.timeline,
            render: project => `${toDateInputValue(project.start_date)} — ${toDateInputValue(project.end_date)}`
          },
          {
            id: 'hours',
            label: dictionary.table.hours,
            render: project => `${project.actual_hours || 0} / ${project.estimated_hours || 0}h · ${project.progress}%`
          },
          {
            id: 'budget',
            label: dictionary.table.budget,
            render: project => formatCurrency(project.budget, locale, project.currency)
          },
          { id: 'priority', label: dictionary.table.priority, render: project => project.priority.label }
        ]}
        emptyState={{
          icon: 'tabler-folders-off',
          title: dictionary.empty.title,
          description: dictionary.empty.description,
          actionLabel: canWrite ? dictionary.actions.add : undefined,
          onAction: canWrite ? onAdd : undefined
        }}
      >
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead><tr>
          <th>{dictionary.table.project}</th><th>{dictionary.table.client}</th><th>{dictionary.table.team}</th><th>{dictionary.table.timeline}</th><th>{dictionary.table.hours}</th><th className='text-end'>{dictionary.table.budget}</th><th>{dictionary.table.status}</th><th className='text-end'>{dictionary.table.actions}</th>
        </tr></thead>
        <tbody>
          {loading ? <TableSkeletonRows columns={8} /> : data.projects.length === 0 ? (
            <TableEmptyStateRow colSpan={8} icon='tabler-folders-off' title={dictionary.empty.title} description={dictionary.empty.description} actionLabel={canWrite ? dictionary.actions.add : null} onAction={canWrite ? onAdd : null} />
          ) : data.projects.map(project => (
            <tr key={project.id} onClick={() => onView(project)}>
              <td><div className='flex min-is-[210px] items-center gap-3'><span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'><i className='tabler-briefcase' /></span><div className='min-is-0'><Chip size='small' variant='tonal' color='primary' label={project.project_code} /><Tooltip title={project.title}><Typography variant='caption' color='text.secondary' className='mt-1 block max-is-[210px] truncate'>{project.title}</Typography></Tooltip></div></div></td>
              <td><Typography variant='body2' className='min-is-[150px] whitespace-nowrap font-medium'>{project.client.company_name}</Typography></td>
              <td><div className='flex min-is-[185px] items-center gap-3'><Tooltip title={project.project_manager?.full_name || dictionary.common.unassigned}><Avatar className='size-9 text-sm'>{initials(project.project_manager?.full_name)}</Avatar></Tooltip><div><Typography variant='body2' className='max-is-[125px] truncate'>{project.project_manager?.full_name || dictionary.common.unassigned}</Typography>{project.members.length ? <AvatarGroup max={4} className='justify-end [&_.MuiAvatar-root]:size-6 [&_.MuiAvatar-root]:text-[10px]'>{project.members.map(member => <Tooltip key={member.id} title={`${member.staff.full_name}${member.role ? ` · ${member.role}` : ''}`}><Avatar>{initials(member.staff.full_name)}</Avatar></Tooltip>)}</AvatarGroup> : <Typography variant='caption' color='text.secondary'>{dictionary.common.noTeam}</Typography>}</div></div></td>
              <td><div className='min-is-[185px]'><Typography variant='body2' className='whitespace-nowrap'>{toDateInputValue(project.start_date)} {' → '} {toDateInputValue(project.end_date)}</Typography>{project.is_overdue ? <Chip size='small' variant='tonal' color='error' label={dictionary.common.overdue} className='mt-1' /> : project.actual_end_date ? <Chip size='small' variant='tonal' color='success' label={dictionary.common.completed} className='mt-1' /> : null}</div></td>
              <td><div className='min-is-[145px]'><div className='mb-1 flex justify-between gap-3'><Typography variant='caption'>{project.actual_hours || 0} / {project.estimated_hours || 0}h</Typography><Typography variant='caption' color='text.secondary'>{project.progress}%</Typography></div><LinearProgress variant='determinate' value={project.progress} color={project.progress > 100 ? 'error' : 'primary'} className='bs-1.5 rounded' /></div></td>
              <td className='text-end'><Tooltip title={`${dictionary.detail.baseAmount}: ${formatCurrency(project.amount_base, locale, data.baseCurrency)}`}><div className='min-is-[135px]'><Typography variant='body2' className='whitespace-nowrap font-semibold'>{formatCurrency(project.budget, locale, project.currency)}</Typography><Chip size='small' variant='outlined' label={project.currency} className='mt-1' /></div></Tooltip></td>
              <td><div className='flex min-is-[120px] flex-col items-start gap-1'><Chip size='small' variant='tonal' label={project.status.label} {...chipProps(project.status)} /><Chip size='small' variant='outlined' label={project.priority.label} {...chipProps(project.priority)} /></div></td>
              <td className='text-end' onClick={event => event.stopPropagation()}>{renderActions(project)}</td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </ResponsiveDataTable>
      <DashboardTablePagination count={data.totalCount} page={page} rowsPerPage={rowsPerPage} rowsPerPageLabel={dictionary.common.rowsPerPage} ofLabel={dictionary.common.of} onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange} />
    </>
  )
}

export default ProjectTableView

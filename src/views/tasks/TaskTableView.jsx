'use client'

import AvatarGroup from '@mui/material/AvatarGroup'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import TableSkeletonRows from '@/components/table/TableSkeletonRows'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'

import { optionChipProps } from './taskUi'

import tableStyles from '@core/styles/table.module.css'

const TaskTableView = ({
  data,
  loading,
  page,
  rowsPerPage,
  dictionary,
  canManage,
  canUpdate,
  canDelete,
  statusUpdating,
  onPageChange,
  onRowsPerPageChange,
  onView,
  onEdit,
  onLogHours,
  onDelete,
  onStatusChange,
  onAdd
}) => {
  const renderActions = task => (
    <EntityActionsMenu
      moreActionsLabel={dictionary.table.actions}
      actions={[
        { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(task) },
        canManage && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(task) },
        canUpdate && { label: dictionary.actions.logHours, icon: 'tabler-clock-plus', onClick: () => onLogHours(task) },
        canDelete && { label: dictionary.actions.delete, icon: 'tabler-trash', color: 'error', onClick: () => onDelete(task) }
      ]}
      statusOptions={
        canUpdate
          ? canManage
            ? data.statuses
            : data.statuses.filter(status => ['COMPLETED', 'DONE'].includes(status.value))
          : []
      }
      currentStatus={task.status_id}
      statusDisabled={statusUpdating === task.id}
      changeStatusLabel={dictionary.actions.changeStatus}
      onStatusChange={statusId => onStatusChange(task, statusId)}
    />
  )

  return (
    <>
      <ResponsiveDataTable
        mobileRows={data.tasks}
        loading={loading}
        getMobileRowId={task => task.id}
        onRowClick={onView}
        renderMobilePrimary={task => (
          <div className='flex min-is-0 items-center gap-3'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
              <i className='tabler-checkbox' />
            </span>
            <div className='min-is-0'>
              <Typography variant='body2' className='truncate font-semibold'>{task.title}</Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>
                {task.project.project_code} · {task.project.title}
              </Typography>
            </div>
          </div>
        )}
        renderMobileStatus={task => (
          <Chip size='small' variant='tonal' label={task.status.label} {...optionChipProps(task.status)} />
        )}
        renderMobileActions={renderActions}
        mobileMetadata={[
          {
            id: 'assignees',
            label: dictionary.table.assignees, 
            render: task => task.assignees.length
              ? task.assignees.map(assignee => assignee.staff.full_name).join(', ')
              : dictionary.common.unassigned
          },
          { id: 'priority', label: dictionary.table.priority, render: task => task.priority.label },
          {
            id: 'due-date',
            label: dictionary.table.dueDate,
            render: task => task.due_date ? toDateInputValue(task.due_date) : dictionary.common.noDueDate
          },
          {
            id: 'hours',
            label: dictionary.table.hours,
            render: task => `${task.actual_hours || 0} / ${task.estimated_hours || 0}h · ${task.progress}%`
          }
        ]}
        emptyState={{
          icon: 'tabler-list-check',
          title: dictionary.empty.title,
          description: dictionary.empty.description,
          actionLabel: canManage ? dictionary.actions.add : undefined,
          onAction: canManage ? onAdd : undefined
        }}
      >
        <div className='no-scrollbar overflow-x-auto scroll-smooth'>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>{dictionary.table.task}</th>
            <th>{dictionary.table.assignees}</th>
            <th>{dictionary.table.priority}</th>
            <th>{dictionary.table.status}</th>
            <th>{dictionary.table.dueDate}</th>
            <th>{dictionary.table.hours}</th>
            <th className='text-end'>{dictionary.table.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeletonRows columns={7} />
          ) : data.tasks.length === 0 ? (
            <TableEmptyStateRow
              colSpan={7}
              icon='tabler-list-check'
              title={dictionary.empty.title}
              description={dictionary.empty.description}
              actionLabel={canManage ? dictionary.actions.add : null}
              onAction={canManage ? onAdd : null}
            />
          ) : (
            data.tasks.map(task => (
              <tr key={task.id} onClick={() => onView(task)}>
                <td>
                  <div className='flex min-is-[220px] items-center gap-3'>
                    <span className='flex size-9 shrink-0 items-center justify-center rounded bg-primaryLighter text-primary'>
                      <i className='tabler-checkbox' />
                    </span>
                    <div className='min-is-0'>
                      <Tooltip title={task.title}>
                        <Typography variant='body2' className='max-is-[220px] truncate font-semibold'>
                          {task.title}
                        </Typography>
                      </Tooltip>
                      <Typography variant='caption' color='text.secondary' className='whitespace-nowrap'>
                        {task.project.project_code} · {task.project.title}
                      </Typography>
                    </div>
                  </div>
                </td>
                <td>
                  <div className='min-is-[130px]'>
                    {task.assignees.length ? (
                      <AvatarGroup
                        max={5}
                        className='justify-end [&_.MuiAvatar-root]:size-8 [&_.MuiAvatar-root]:text-xs'
                      >
                        {task.assignees.map(assignee => (
                          <Tooltip key={assignee.id} title={`${assignee.staff.full_name} · ${assignee.staff.position}`}>
                            <UserAvatar user={assignee.staff} size={32} />
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        {dictionary.common.unassigned}
                      </Typography>
                    )}
                  </div>
                </td>
                <td>
                  <Chip size='small' variant='tonal' label={task.priority.label} {...optionChipProps(task.priority)} />
                </td>
                <td>
                  <Chip size='small' variant='tonal' label={task.status.label} {...optionChipProps(task.status)} />
                </td>
                <td>
                  <div className='min-is-[120px]'>
                    <Typography variant='body2' className={task.is_overdue ? 'font-medium text-error' : ''}>
                      {task.due_date ? toDateInputValue(task.due_date) : dictionary.common.noDueDate}
                    </Typography>
                    {task.is_overdue && (
                      <Typography variant='caption' color='error'>
                        {dictionary.common.overdue}
                      </Typography>
                    )}
                  </div>
                </td>
                <td>
                  <div className='min-is-[150px]'>
                    <div className='mb-1 flex justify-between gap-2'>
                      <Typography variant='caption'>
                        {task.actual_hours || 0} / {task.estimated_hours || 0}h
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {task.progress}%
                      </Typography>
                    </div>
                    <LinearProgress variant='determinate' value={task.progress} className='bs-1.5 rounded' />
                  </div>
                </td>
                <td className='text-end' onClick={event => event.stopPropagation()}>
                  {renderActions(task)}
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
        rowsPerPageLabel={dictionary.common.rowsPerPage}
        ofLabel={dictionary.common.of}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  )
}

export default TaskTableView

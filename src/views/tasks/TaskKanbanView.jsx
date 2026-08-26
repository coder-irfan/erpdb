'use client'

import AvatarGroup from '@mui/material/AvatarGroup'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import KanbanCardSkeleton from '@/components/common/KanbanCardSkeleton'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import { toDateInputValue } from '@/utils/contractDuration'

import { optionChipProps } from './taskUi'

const TaskKanbanView = ({
  data,
  dictionary,
  canManage,
  canUpdate,
  canDelete,
  loading,
  statusUpdating,
  onView,
  onEdit,
  onLogHours,
  onDelete,
  onStatusChange
}) => {
  if (loading) return <KanbanCardSkeleton />

  return (
    <div className='no-scrollbar flex items-start gap-4 overflow-x-auto py-3'>
      {data.statuses.map(status => {
        const tasks = data.tasks.filter(task => task.status_id === status.id)

        return (
          <div key={status.id} className='min-w-[290px] max-w-[320px] flex-1 rounded bg-actionHover p-3'>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <Chip size='small' variant='tonal' label={status.label} {...optionChipProps(status)} />
              <Typography variant='caption' color='text.secondary'>
                {tasks.length}
              </Typography>
            </div>
            <div className='flex flex-col gap-3'>
              {tasks.length === 0 ? (
                <div className='rounded border border-dashed border-divider bg-paper p-5 text-center'>
                  <Typography variant='body2' color='text.secondary'>
                    {dictionary.empty.column}
                  </Typography>
                </div>
              ) : (
                tasks.map(task => (
                  <Card key={task.id} variant='outlined' className='cursor-pointer' onClick={() => onView(task)}>
                    <CardContent className='flex flex-col gap-3'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-is-0'>
                          <Typography className='line-clamp-2 font-semibold'>{task.title}</Typography>
                          <Chip
                            size='small'
                            variant='outlined'
                            color='primary'
                            label={`${task.project.project_code} · ${task.project.title}`}
                            className='mt-2 max-is-full'
                          />
                        </div>
                        <div onClick={event => event.stopPropagation()}>
                          <EntityActionsMenu
                            moreActionsLabel={dictionary.table.actions}
                            actions={[
                              { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(task) },
                              canManage && {
                                label: dictionary.actions.edit,
                                icon: 'tabler-edit',
                                onClick: () => onEdit(task)
                              },
                              canUpdate && {
                                label: dictionary.actions.logHours,
                                icon: 'tabler-clock-plus',
                                onClick: () => onLogHours(task)
                              },
                              canDelete && {
                                label: dictionary.actions.delete,
                                icon: 'tabler-trash',
                                color: 'error',
                                onClick: () => onDelete(task)
                              }
                            ]}
                            statusOptions={
                              canUpdate
                                ? canManage
                                  ? data.statuses
                                  : data.statuses.filter(option => ['COMPLETED', 'DONE'].includes(option.value))
                                : []
                            }
                            currentStatus={task.status_id}
                            statusDisabled={statusUpdating === task.id}
                            changeStatusLabel={dictionary.actions.changeStatus}
                            onStatusChange={statusId => onStatusChange(task, statusId)}
                          />
                        </div>
                      </div>
                      <div className='flex items-center justify-between gap-3'>
                        <Chip
                          size='small'
                          variant='tonal'
                          label={task.priority.label}
                          {...optionChipProps(task.priority)}
                        />
                        <Typography
                          variant='caption'
                          className={task.is_overdue ? 'font-semibold text-error' : 'text-textSecondary'}
                        >
                          <i className='tabler-calendar-event mie-1' />
                          {task.due_date ? toDateInputValue(task.due_date) : dictionary.common.noDueDate}
                        </Typography>
                      </div>
                      <div>
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
                      <div className='flex items-center justify-between'>
                        {task.assignees.length ? (
                          <AvatarGroup max={5} className='[&_.MuiAvatar-root]:size-7 [&_.MuiAvatar-root]:text-[10px]'>
                            {task.assignees.map(assignee => (
                              <Tooltip key={assignee.id} title={assignee.staff.full_name}>
                                <UserAvatar user={assignee.staff} size={28} />
                              </Tooltip>
                            ))}
                          </AvatarGroup>
                        ) : (
                          <Typography variant='caption' color='text.secondary'>
                            {dictionary.common.unassigned}
                          </Typography>
                        )}
                        {task.is_overdue && (
                          <Chip size='small' variant='tonal' color='error' label={dictionary.common.overdue} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TaskKanbanView

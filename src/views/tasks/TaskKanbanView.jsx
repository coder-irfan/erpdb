'use client'

import { useState } from 'react'

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
import ConfirmationComponent from '@/components/dialogs/ConfirmationComponent'
import { toDateInputValue } from '@/utils/contractDuration'

import { optionChipProps } from './taskUi'

const TaskKanbanView = ({
  data,
  locale,
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
  const [draggingId, setDraggingId] = useState(null)
  const [dropStatusId, setDropStatusId] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)

  if (loading) return <KanbanCardSkeleton />

  const dropTask = (event, destination) => {
    event.preventDefault()
    const task = data.tasks.find(item => item.id === draggingId)

    setDraggingId(null)
    setDropStatusId(null)
    if (!task || task.status_id === destination.id) return

    const guardedMove = ['TO_DO', 'TODO'].includes(task.status.value) && ['REVIEW', 'COMPLETED', 'DONE'].includes(destination.value) && Number(task.actual_hours || 0) === 0

    setPendingMove({ task, destination, guardedMove })
  }

  return (
    <div className='h-[calc(100vh-225px)] min-h-[455px] overflow-hidden'>
      <div className='no-scrollbar flex h-full items-stretch gap-4 overflow-x-auto overflow-y-hidden py-3'>
      {data.statuses.map(status => {
        const tasks = data.tasks.filter(task => task.status_id === status.id)

        return (
          <div
            key={status.id}
            className={`flex h-full min-h-0 min-w-[290px] max-w-[320px] flex-1 flex-col overflow-hidden rounded p-3 transition-colors ${dropStatusId === status.id ? 'bg-primaryLighter ring-2 ring-primary' : 'bg-actionHover'}`}
            onDragOver={event => { if (canUpdate) { event.preventDefault(); setDropStatusId(status.id) } }}
            onDragLeave={() => setDropStatusId(current => current === status.id ? null : current)}
            onDrop={event => dropTask(event, status)}
          >
            <div className='sticky top-0 z-10 mb-3 flex shrink-0 items-center justify-between gap-3 bg-transparent'>
              <Chip size='small' variant='tonal' label={status.label} {...optionChipProps(status)} />
              <Typography variant='caption' color='text.secondary'>
                {tasks.length}
              </Typography>
            </div>
            <div className='custom-scrollbar flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-2 pe-1'>
              {tasks.length === 0 ? (
                <div className='flex min-h-0 flex-1 items-center justify-center rounded border border-dashed border-divider bg-paper p-5 text-center'>
                  <Typography variant='body2' color='text.secondary'>
                    {dictionary.empty.column}
                  </Typography>
                </div>
              ) : (
                tasks.map(task => (
                  <Card
                    key={task.id}
                    variant='outlined'
                    draggable={canUpdate && statusUpdating !== task.id}
                    className={`h-auto shrink-0 cursor-pointer transition-opacity ${draggingId === task.id ? 'opacity-40' : ''}`}
                    onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; setDraggingId(task.id) }}
                    onDragEnd={() => { setDraggingId(null); setDropStatusId(null) }}
                    onClick={() => onView(task)}
                  >
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
                            locale={locale}
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
                        <LinearProgress variant='determinate' value={Math.min(100, task.progress)} color={task.progress > 100 ? 'error' : 'primary'} className='bs-1.5 rounded' />
                      </div>
                      {task.subtask_summary.total > 0 && (
                        <div>
                          <div className='mb-1 flex justify-between gap-2'>
                            <Typography variant='caption' color='text.secondary'>{dictionary.kanban.subtasks.replace('{completed}', task.subtask_summary.completed).replace('{total}', task.subtask_summary.total)}</Typography>
                            <Typography variant='caption' color='text.secondary'>{task.subtask_summary.percentage}%</Typography>
                          </div>
                          <LinearProgress color='secondary' variant='determinate' value={task.subtask_summary.percentage} className='bs-1 rounded' />
                        </div>
                      )}
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
      <ConfirmationComponent
        open={Boolean(pendingMove)}
        title={dictionary.actions.changeStatus}
        message={pendingMove?.guardedMove ? dictionary.kanban.zeroHoursConfirm : `${dictionary.actions.changeStatus}: ${pendingMove?.destination?.label || ''}?`}
        confirmText={dictionary.actions.changeStatus}
        cancelText={dictionary.actions.cancel}
        onClose={() => {
          if (pendingMove?.guardedMove) onLogHours(pendingMove.task)
          setPendingMove(null)
        }}
        onConfirm={async () => {
          await onStatusChange(pendingMove.task, pendingMove.destination.id)
          setPendingMove(null)
        }}
      />
    </div>
  )
}

export default TaskKanbanView

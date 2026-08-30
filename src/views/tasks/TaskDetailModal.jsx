'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import AvatarGroup from '@mui/material/AvatarGroup'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { getTaskDetail } from '@/actions/tasks'
import UserAvatar from '@/components/common/UserAvatar'
import DetailSkeleton from '@/components/dialogs/DetailSkeleton'
import { toDateInputValue } from '@/utils/contractDuration'
import { sanitizeRichText } from '@/utils/richText'

import { optionChipProps } from './taskUi'
import TaskCollaborationPanels from './TaskCollaborationPanels'

const Item = ({ label, value }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography className='mt-1 break-words'>{value || '—'}</Typography>
  </div>
)

const TaskDetailModal = ({
  open,
  taskId,
  locale,
  dictionary,
  canManage,
  canUpdate,
  refreshKey,
  onClose,
  onEdit,
  onLogHours
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [task, setTask] = useState(null)
  const [collaborationVersion, setCollaborationVersion] = useState(0)

  useEffect(() => {
    if (!open || !taskId) return
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')
      const result = await getTaskDetail(taskId, { locale })

      if (!active) return
      if (result.success) setTask(result.data)
      else setError(result.error || dictionary.messages.detailLoadFailed)
      setLoading(false)
    }

    load()

    const interval = setInterval(async () => {
      const result = await getTaskDetail(taskId, { locale })

      if (active && result.success) setTask(result.data)
    }, 8000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [collaborationVersion, dictionary.messages.detailLoadFailed, locale, open, refreshKey, taskId])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle className='flex items-start justify-between gap-4'>
        <div className='min-is-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <Typography variant='h5' className='truncate'>
              {task?.title || dictionary.detail.title}
            </Typography>
            {task && <Chip size='small' variant='tonal' label={task.status.label} {...optionChipProps(task.status)} />}
          </div>
          <Typography color='text.secondary'>
            {task ? `${task.project.project_code} · ${task.project.title}` : dictionary.common.loading}
          </Typography>
        </div>
        <div className='flex items-center gap-1'>
          {canUpdate && task && (
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-clock-plus' />}
              onClick={() => onLogHours(task)}
            >
              {dictionary.actions.logHours}
            </Button>
          )}
          {canManage && task && (
            <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={() => onEdit(task)}>
              {dictionary.actions.edit}
            </Button>
          )}
          <IconButton onClick={onClose}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[480px]'>
        {loading ? (
          <DetailSkeleton />
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : task ? (
          <div className='flex flex-col gap-4'>
            <Card variant='outlined'>
              <CardContent>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <Typography variant='h6'>{dictionary.detail.overview}</Typography>
                  <Chip size='small' variant='tonal' label={task.priority.label} {...optionChipProps(task.priority)} />
                </div>
                {task.description ? <div className='text-textSecondary [&_a]:text-primary [&_a]:underline [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pis-6 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-actionHover [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pis-6 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pis-0' dangerouslySetInnerHTML={{ __html: sanitizeRichText(task.description) }} /> : <Typography color='text.secondary'>—</Typography>}
              </CardContent>
            </Card>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <Card variant='outlined'>
                <CardContent>
                  <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                    <Typography variant='h6'>{dictionary.detail.schedule}</Typography>
                    {task.scope_completed && <Chip size='small' variant='tonal' color='success' label={dictionary.common.scopeCompleted} />}
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <Item
                      label={dictionary.fields.dueDate}
                      value={toDateInputValue(task.due_date) || dictionary.common.noDueDate}
                    />
                    <Item label={dictionary.fields.completedAt} value={toDateInputValue(task.completed_at)} />
                    <Item label={dictionary.fields.estimatedHours} value={`${task.estimated_hours || 0}h`} />
                    <Item label={dictionary.fields.actualHours} value={`${task.actual_hours || 0}h`} />
                  </div>
                  <div className='mt-5 flex flex-wrap items-center justify-between gap-2'>
                    <Typography variant='body2' className='font-medium'>
                      {`${task.actual_hours || '0.00'} / ${task.estimated_hours || '0.00'}h`}
                    </Typography>
                    <Typography variant='caption' color={Number(task.hours_variance) < 0 ? 'error' : 'success.main'}>
                      {Number(task.hours_variance) >= 0
                        ? dictionary.common.hoursSaved.replace('{hours}', Number(task.hours_variance).toFixed(2))
                        : dictionary.common.hoursOver.replace('{hours}', Math.abs(Number(task.hours_variance)).toFixed(2))}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>{task.progress}%</Typography>
                  </div>
                  <LinearProgress variant='determinate' value={Math.min(100, task.progress)} color={task.progress > 100 ? 'error' : 'primary'} className='mt-2 bs-2 rounded' />
                </CardContent>
              </Card>
              <Card variant='outlined'>
                <CardContent>
                  <Typography variant='h6' className='mb-4'>
                    {dictionary.detail.people}
                  </Typography>
                  {task.assignees.length ? (
                    <>
                      <AvatarGroup max={8} className='mb-4 justify-end'>
                        {task.assignees.map(assignee => (
                          <Tooltip key={assignee.id} title={`${assignee.staff.full_name} · ${assignee.staff.position}`}>
                            <UserAvatar user={assignee.staff} size={40} />
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                      <Typography variant='body2' color='text.secondary'>
                        {task.assignees.map(assignee => assignee.staff.full_name).join(', ')}
                      </Typography>
                    </>
                  ) : (
                    <Typography color='text.secondary'>{dictionary.common.unassigned}</Typography>
                  )}
                  <div className='mt-5 grid grid-cols-2 gap-4'>
                    <Item label={dictionary.fields.createdBy} value={task.created_by?.full_name} />
                    <Item label={dictionary.detail.created} value={toDateInputValue(task.created_at)} />
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='h6' className='mb-4'>{dictionary.detail.timeAudit}</Typography>
                {task.time_logs.length ? (
                  <div className='divide-y divide-divider'>
                    {task.time_logs.map(entry => (
                      <div key={entry.id} className='grid grid-cols-1 gap-2 py-3 first:pt-0 sm:grid-cols-[140px_1fr_auto] sm:items-center'>
                        <div>
                          <Typography variant='body2' className='font-medium'>{toDateInputValue(entry.work_date)}</Typography>
                          <Typography variant='caption' color='text.secondary'>{entry.staff.full_name}</Typography>
                        </div>
                        <Typography variant='body2' color='text.secondary'>{entry.notes || dictionary.common.noNotes}</Typography>
                        <Chip size='small' variant='tonal' color='info' label={`${entry.worked_hours}h`} />
                      </div>
                    ))}
                  </div>
                ) : <Typography color='text.secondary'>{dictionary.detail.noTimeLogs}</Typography>}
              </CardContent>
            </Card>
            <TaskCollaborationPanels task={task} locale={locale} dictionary={dictionary} canUpdate={canUpdate} onChanged={async () => setCollaborationVersion(value => value + 1)} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default TaskDetailModal

'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { getTaskDetail } from '@/actions/tasks'
import { toDateInputValue } from '@/utils/contractDuration'

import { optionChipProps, staffInitials } from './taskUi'

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

    return () => {
      active = false
    }
  }, [dictionary.messages.detailLoadFailed, locale, open, refreshKey, taskId])

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='md'>
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
          <IconButton onClick={onClose} disabled={loading}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[480px]'>
        {loading ? (
          <div className='flex min-bs-[400px] items-center justify-center'>
            <CircularProgress />
          </div>
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
                <Typography color='text.secondary' className='whitespace-pre-wrap'>
                  {task.description || '—'}
                </Typography>
              </CardContent>
            </Card>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <Card variant='outlined'>
                <CardContent>
                  <Typography variant='h6' className='mb-4'>
                    {dictionary.detail.schedule}
                  </Typography>
                  <div className='grid grid-cols-2 gap-4'>
                    <Item
                      label={dictionary.fields.dueDate}
                      value={toDateInputValue(task.due_date) || dictionary.common.noDueDate}
                    />
                    <Item label={dictionary.fields.completedAt} value={toDateInputValue(task.completed_at)} />
                    <Item label={dictionary.fields.estimatedHours} value={`${task.estimated_hours || 0}h`} />
                    <Item label={dictionary.fields.actualHours} value={`${task.actual_hours || 0}h`} />
                  </div>
                  <LinearProgress variant='determinate' value={task.progress} className='mt-5 bs-2 rounded' />
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
                            <Avatar>{staffInitials(assignee.staff.full_name)}</Avatar>
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
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default TaskDetailModal

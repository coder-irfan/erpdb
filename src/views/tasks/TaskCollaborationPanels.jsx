'use client'

import { useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { uploadFileAction } from '@/app/actions/uploadActions'
import { addTaskAttachment, addTaskComment, addTaskSubtask, toggleTaskSubtask } from '@/actions/tasks'
import UserAvatar from '@/components/common/UserAvatar'

const relativeTime = (value, locale) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const ranges = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const [unit, divisor] = ranges.find(([, amount]) => Math.abs(seconds) >= amount) || ['second', 1]

  return formatter.format(Math.round(seconds / divisor), unit)
}

const SubtaskRows = ({ items, parentId = null, disabled, onToggle, onAddChild, dictionary }) => items
  .filter(item => item.parent_id === parentId)
  .map(item => (
    <div key={item.id} className={parentId ? 'mis-7' : ''}>
      <div className='flex items-center gap-2 rounded px-1 py-1 hover:bg-actionHover'>
        <Checkbox size='small' checked={item.is_completed} disabled={disabled} onChange={() => onToggle(item.id)} />
        <Typography variant='body2' className={`grow ${item.is_completed ? 'text-textDisabled line-through' : ''}`}>{item.title}</Typography>
        {!disabled && <IconButton size='small' title={dictionary.collaboration.addChild} onClick={() => onAddChild(item.id)}><i className='tabler-subtask' /></IconButton>}
      </div>
      <SubtaskRows items={items} parentId={item.id} disabled={disabled} onToggle={onToggle} onAddChild={onAddChild} dictionary={dictionary} />
    </div>
  ))

const TaskCollaborationPanels = ({ task, locale, dictionary, canUpdate, onChanged }) => {
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [subtaskParent, setSubtaskParent] = useState(null)
  const [comment, setComment] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [working, setWorking] = useState(false)
  const mentionMatch = comment.match(/(?:^|\s)@([^\s@]*)$/)
  const mentionQuery = mentionMatch?.[1]?.toLocaleLowerCase() || ''

  const mentionCandidates = useMemo(() => {
    const byId = new Map()

    task.project.members.forEach(member => byId.set(member.staff.id, member.staff))
    task.assignees.forEach(assignee => byId.set(assignee.staff.id, assignee.staff))

    return [...byId.values()].filter(staff => !mentionQuery || staff.full_name.toLocaleLowerCase().includes(mentionQuery)).slice(0, 6)
  }, [mentionQuery, task.assignees, task.project.members])

  const run = async operation => {
    setWorking(true)
    const result = await operation()

    if (result.success) {
      toast.success(result.message)
      await onChanged()
    } else toast.error(result.error || dictionary.messages.operationFailed)
    setWorking(false)

    return result.success
  }

  const addSubtask = async () => {
    const saved = await run(() => addTaskSubtask(task.id, { title: subtaskTitle, parent_id: subtaskParent, locale }))

    if (saved) { setSubtaskTitle(''); setSubtaskParent(null) }
  }

  const addLink = async () => {
    const saved = await run(() => addTaskAttachment(task.id, { attachment_type: 'LINK', name: linkName, url: linkUrl, locale }))

    if (saved) { setLinkName(''); setLinkUrl('') }
  }

  const uploadFiles = async files => {
    for (const file of files) {
      const formData = new FormData()

      formData.set('file', file)
      formData.set('uploadType', 'taskAttachment')
      setWorking(true)
      const upload = await uploadFileAction(formData)

      if (!upload.success) {
        toast.error(upload.error || dictionary.collaboration.uploadFailed)
        setWorking(false)
        continue
      }

      await run(() => addTaskAttachment(task.id, { attachment_type: 'FILE', name: file.name, url: upload.url, mime_type: file.type, file_size: file.size, locale }))
    }
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'], 'application/pdf': ['.pdf'] },
    disabled: working || !canUpdate,
    maxSize: 4 * 1024 * 1024,
    onDropAccepted: uploadFiles,
    onDropRejected: () => toast.error(dictionary.collaboration.uploadInvalid),
    noClick: true
  })

  const addMention = staff => {
    const start = comment.lastIndexOf('@')

    setComment(`${comment.slice(0, start)}@${staff.full_name} `)
  }

  const submitComment = async () => {
    const saved = await run(() => addTaskComment(task.id, { body: comment, locale }))

    if (saved) setComment('')
  }

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      <Card variant='outlined'>
        <CardContent>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <Typography variant='h6'>{dictionary.collaboration.subtasks}</Typography>
            <Chip size='small' variant='tonal' label={`${task.subtask_summary.completed}/${task.subtask_summary.total}`} />
          </div>
          <LinearProgress className='mb-3 bs-1.5 rounded' variant='determinate' value={task.subtask_summary.percentage} />
          <SubtaskRows items={task.subtasks} disabled={!canUpdate || working} onToggle={id => run(() => toggleTaskSubtask(task.id, id, { locale }))} onAddChild={setSubtaskParent} dictionary={dictionary} />
          {canUpdate && (
            <div className='mt-3 flex items-end gap-2'>
              <CustomTextField className='grow' size='small' label={subtaskParent ? dictionary.collaboration.childSubtask : dictionary.collaboration.newSubtask} value={subtaskTitle} onChange={event => setSubtaskTitle(event.target.value)} />
              {subtaskParent && <IconButton size='small' onClick={() => setSubtaskParent(null)}><i className='tabler-x' /></IconButton>}
              <Button variant='contained' size='small' disabled={!subtaskTitle.trim() || working} onClick={addSubtask}>{dictionary.actions.addItem}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' className='mb-3'>{dictionary.collaboration.attachments}</Typography>
          {canUpdate && (
            <div {...getRootProps()} className={`mb-3 rounded border-2 border-dashed p-4 text-center ${isDragActive ? 'border-primary bg-primaryLighter' : 'border-divider'}`}>
              <input {...getInputProps()} />
              <i className='tabler-cloud-upload text-3xl text-primary' />
              <Typography variant='body2'>{dictionary.collaboration.dropFiles}</Typography>
              <Button size='small' onClick={open} disabled={working}>{dictionary.actions.browse}</Button>
            </div>
          )}
          <div className='grid grid-cols-2 gap-2'>
            {task.attachments.map(item => item.mime_type?.startsWith('image/') ? (
              <a key={item.id} href={item.url} target='_blank' rel='noreferrer' className='overflow-hidden rounded border border-divider'>
                <img src={item.url} alt={item.name} className='bs-24 w-full object-cover' />
                <Typography variant='caption' className='block truncate p-2'>{item.name}</Typography>
              </a>
            ) : (
              <a key={item.id} href={item.url} target='_blank' rel='noreferrer' className='flex items-center gap-2 rounded border border-divider p-3'>
                <i className={`${item.attachment_type === 'LINK' ? 'tabler-link' : 'tabler-file-type-pdf'} text-xl text-primary`} />
                <Typography variant='body2' className='truncate'>{item.name}</Typography>
              </a>
            ))}
          </div>
          {!task.attachments.length && <Typography color='text.secondary'>{dictionary.collaboration.noAttachments}</Typography>}
          {canUpdate && (
            <div className='mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2'>
              <CustomTextField size='small' label={dictionary.collaboration.linkName} value={linkName} onChange={event => setLinkName(event.target.value)} />
              <CustomTextField size='small' label={dictionary.collaboration.linkUrl} value={linkUrl} onChange={event => setLinkUrl(event.target.value)} />
              <Button size='small' variant='tonal' disabled={!linkName.trim() || !linkUrl.trim() || working} onClick={addLink}>{dictionary.actions.addItem}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant='outlined' className='lg:col-span-2'>
        <CardContent>
          <Typography variant='h6' className='mb-3'>{dictionary.collaboration.comments}</Typography>
          <div className='mb-4 flex max-bs-80 flex-col gap-3 overflow-y-auto'>
            {task.comments.map(entry => (
              <div key={entry.id} className='flex items-start gap-3'>
                <UserAvatar user={entry.author} size={34} />
                <div className='min-is-0 grow rounded bg-actionHover px-3 py-2'>
                  <div className='flex justify-between gap-2'><Typography variant='body2' className='font-medium'>{entry.author.full_name}</Typography><Typography variant='caption' color='text.secondary'>{relativeTime(entry.created_at, locale)}</Typography></div>
                  <Typography variant='body2' className='whitespace-pre-wrap'>{entry.body}</Typography>
                </div>
              </div>
            ))}
            {!task.comments.length && <Typography color='text.secondary'>{dictionary.collaboration.noComments}</Typography>}
          </div>
          {canUpdate && (
            <div className='relative'>
              <CustomTextField fullWidth multiline minRows={2} label={dictionary.collaboration.commentPlaceholder} value={comment} onChange={event => setComment(event.target.value)} />
              {mentionMatch && mentionCandidates.length > 0 && (
                <div className='absolute bottom-full z-10 mb-1 max-bs-48 w-full overflow-y-auto rounded border border-divider bg-paper p-1 shadow-lg'>
                  {mentionCandidates.map(staff => <Button key={staff.id} fullWidth className='justify-start' onClick={() => addMention(staff)}>@{staff.full_name}</Button>)}
                </div>
              )}
              <div className='mt-2 flex justify-end'><Button variant='contained' disabled={!comment.trim() || working} onClick={submitComment}>{dictionary.actions.comment}</Button></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TaskCollaborationPanels

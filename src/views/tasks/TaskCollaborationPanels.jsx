'use client'

import { useMemo, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { uploadFileAction } from '@/app/actions/uploadActions'
import {
  addTaskAttachment,
  addTaskComment,
  addTaskSubtask,
  deleteTaskAttachment,
  deleteTaskComment,
  deleteTaskSubtask,
  toggleTaskSubtask,
  updateTaskAttachment,
  updateTaskComment,
  updateTaskSubtask
} from '@/actions/tasks'
import UserAvatar from '@/components/common/UserAvatar'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'

const relativeTime = (value, locale) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const ranges = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const [unit, divisor] = ranges.find(([, amount]) => Math.abs(seconds) >= amount) || ['second', 1]

  return formatter.format(Math.round(seconds / divisor), unit)
}

const SubtaskRow = ({ item, items, depth, disabled, onToggle, onAddChild, onEdit, onDelete, dictionary }) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const children = items.filter(candidate => candidate.parent_id === item.id)
  const editLabel = dictionary.collaboration.editSubtask || 'Edit sub-task'
  const deleteLabel = dictionary.collaboration.deleteSubtask || 'Delete sub-task'

  const save = async () => {
    if (!title.trim()) return
    const saved = await onEdit(item.id, title)

    if (saved) setEditing(false)
  }

  return (
    <div className={depth ? 'border-is border-divider pis-3' : ''}>
      <div className='group flex min-bs-10 items-center gap-1 rounded px-1 py-1 hover:bg-actionHover'>
        <Checkbox size='small' checked={item.is_completed} disabled={disabled} onChange={() => onToggle(item.id)} />
        {editing ? (
          <CustomTextField
            autoFocus
            className='grow'
            size='small'
            value={title}
            onChange={event => setTitle(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') save()
              if (event.key === 'Escape') { setTitle(item.title); setEditing(false) }
            }}
          />
        ) : (
          <Typography variant='body2' className={`min-is-0 grow break-words ${item.is_completed ? 'text-textDisabled line-through' : ''}`}>{item.title}</Typography>
        )}
        {!disabled && (editing ? (
          <>
            <Tooltip title={dictionary.actions.save}><IconButton size='small' color='primary' onClick={save}><i className='tabler-check' /></IconButton></Tooltip>
            <Tooltip title={dictionary.actions.cancel}><IconButton size='small' onClick={() => { setTitle(item.title); setEditing(false) }}><i className='tabler-x' /></IconButton></Tooltip>
          </>
        ) : (
          <>
            <Tooltip title={dictionary.collaboration.addChild}>
              <IconButton size='small' aria-label={dictionary.collaboration.addChild} onClick={() => onAddChild(item.id)}><i className='tabler-subtask' /></IconButton>
            </Tooltip>
            <Tooltip title={editLabel}>
              <IconButton size='small' aria-label={editLabel} onClick={() => setEditing(true)}><i className='tabler-edit' /></IconButton>
            </Tooltip>
            <Tooltip title={deleteLabel}>
              <IconButton size='small' color='error' aria-label={deleteLabel} onClick={() => onDelete(item)}><i className='tabler-trash' /></IconButton>
            </Tooltip>
          </>
        ))}
      </div>
      {children.map(child => (
        <SubtaskRow key={child.id} item={child} items={items} depth={depth + 1} disabled={disabled} onToggle={onToggle} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} dictionary={dictionary} />
      ))}
    </div>
  )
}

const SubtaskRows = props => props.items
  .filter(item => !item.parent_id)
  .map(item => <SubtaskRow key={item.id} item={item} depth={0} {...props} />)

const CommentRow = ({ entry, locale, dictionary, disabled, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(entry.body)
  const editLabel = dictionary.collaboration.editComment || 'Edit comment'
  const deleteLabel = dictionary.collaboration.deleteComment || 'Delete comment'

  const save = async () => {
    if (!body.trim()) return
    const saved = await onEdit(entry.id, body)

    if (saved) setEditing(false)
  }

  return (
    <div className='flex items-start gap-3'>
      <UserAvatar user={entry.author} size={34} />
      <div className='group min-is-0 grow rounded bg-actionHover px-3 py-2'>
        <div className='flex items-center justify-between gap-2'>
          <Typography variant='body2' className='font-medium'>{entry.author.full_name}</Typography>
          <div className='flex items-center gap-1'>
            <Typography variant='caption' color='text.secondary'>{relativeTime(entry.created_at, locale)}</Typography>
            {!disabled && !editing && (
              <div className='flex'>
                <Tooltip title={editLabel}><IconButton size='small' className='text-textSecondary hover:text-textPrimary' aria-label={editLabel} onClick={() => setEditing(true)}><i className='tabler-edit' /></IconButton></Tooltip>
                <Tooltip title={deleteLabel}><IconButton size='small' color='error' aria-label={deleteLabel} onClick={() => onDelete(entry)}><i className='tabler-trash' /></IconButton></Tooltip>
              </div>
            )}
          </div>
        </div>
        {editing ? (
          <>
            <CustomTextField autoFocus fullWidth multiline minRows={2} className='mt-2' value={body} onChange={event => setBody(event.target.value)} />
            <div className='mt-2 flex justify-end gap-1'>
              <Button size='small' variant='tonal' onClick={() => { setBody(entry.body); setEditing(false) }}>{dictionary.actions.cancel}</Button>
              <Button size='small' variant='contained' disabled={!body.trim()} onClick={save}>{dictionary.actions.save}</Button>
            </div>
          </>
        ) : <Typography variant='body2' className='whitespace-pre-wrap'>{entry.body}</Typography>}
      </div>
    </div>
  )
}

const TaskCollaborationPanels = ({ task, locale, dictionary, canUpdate, onChanged, section = 'all' }) => {
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [subtaskParent, setSubtaskParent] = useState(null)
  const [comment, setComment] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkToReplace, setLinkToReplace] = useState(null)
  const [subtaskToDelete, setSubtaskToDelete] = useState(null)
  const [attachmentToDelete, setAttachmentToDelete] = useState(null)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [attachmentToReplace, setAttachmentToReplace] = useState(null)
  const replacementInputRef = useRef(null)
  const [working, setWorking] = useState(false)
  const mentionMatch = comment.match(/(?:^|\s)@([^\s@]*)$/)
  const mentionQuery = mentionMatch?.[1]?.toLocaleLowerCase() || ''
  const showResources = section === 'all' || section === 'resources'
  const showDiscussion = section === 'all' || section === 'discussion'

  const mentionCandidates = useMemo(() => {
    const byId = new Map()

    task.project.members.forEach(member => byId.set(member.staff.id, member.staff))
    task.assignees.forEach(assignee => byId.set(assignee.staff.id, assignee.staff))

    return [...byId.values()].filter(staff => !mentionQuery || staff.full_name.toLocaleLowerCase().includes(mentionQuery)).slice(0, 6)
  }, [mentionQuery, task.assignees, task.project.members])

  const activity = useMemo(() => [
    { id: `created-${task.id}`, at: task.created_at, icon: 'tabler-plus', label: dictionary.collaboration.taskCreated || 'Task created', person: task.created_by?.full_name },
    ...(task.updated_at && task.updated_at !== task.created_at ? [{ id: `updated-${task.id}`, at: task.updated_at, icon: 'tabler-edit', label: dictionary.collaboration.taskUpdated || 'Task updated' }] : []),
    ...task.time_logs.map(entry => ({ id: `time-${entry.id}`, at: entry.created_at || entry.work_date, icon: 'tabler-clock', label: `${entry.worked_hours}h ${dictionary.collaboration.timeLogged || 'logged'}`, person: entry.staff.full_name })),
    ...task.comments.map(entry => ({ id: `comment-${entry.id}`, at: entry.created_at, icon: 'tabler-message-circle', label: dictionary.collaboration.commentAdded || 'Comment added', person: entry.author.full_name }))
  ].sort((left, right) => new Date(right.at) - new Date(left.at)), [dictionary.collaboration, task])

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

  const deleteSubtask = item => setSubtaskToDelete(item)

  const addLink = async () => {
    const saved = await run(() => linkToReplace
      ? updateTaskAttachment(task.id, linkToReplace.id, { attachment_type: 'LINK', name: linkName, url: linkUrl, locale })
      : addTaskAttachment(task.id, { attachment_type: 'LINK', name: linkName, url: linkUrl, locale }))

    if (saved) { setLinkName(''); setLinkUrl(''); setLinkToReplace(null) }
  }

  const uploadFiles = async (files, replacement = null) => {
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

      await run(() => replacement
        ? updateTaskAttachment(task.id, replacement.id, { attachment_type: 'FILE', name: file.name, url: upload.url, mime_type: file.type, file_size: file.size, locale })
        : addTaskAttachment(task.id, { attachment_type: 'FILE', name: file.name, url: upload.url, mime_type: file.type, file_size: file.size, locale }))
    }

    setAttachmentToReplace(null)
  }

  const chooseReplacementFile = attachment => {
    setAttachmentToReplace(attachment)
    replacementInputRef.current?.click()
  }

  const replaceLink = attachment => {
    setLinkToReplace(attachment)
    setLinkName(attachment.name)
    setLinkUrl(attachment.url)
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'], 'application/pdf': ['.pdf'] },
    disabled: working || !canUpdate,
    maxSize: 4 * 1024 * 1024,
    onDropAccepted: files => uploadFiles(files),
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
    <>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {showResources && <Card variant='outlined'>
        <CardContent>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <Typography variant='h6'>{dictionary.collaboration.subtasks}</Typography>
            <Chip size='small' variant='tonal' label={(dictionary.collaboration.progress || '{completed}/{total} Completed').replace('{completed}', task.subtask_summary.completed).replace('{total}', task.subtask_summary.total)} />
          </div>
          <LinearProgress className='mb-3 bs-1.5 rounded' variant='determinate' value={task.subtask_summary.percentage} />
          <SubtaskRows
            items={task.subtasks}
            disabled={!canUpdate || working}
            onToggle={id => run(() => toggleTaskSubtask(task.id, id, { locale }))}
            onAddChild={setSubtaskParent}
            onEdit={(id, title) => run(() => updateTaskSubtask(task.id, id, { title, locale }))}
            onDelete={deleteSubtask}
            dictionary={dictionary}
          />
          {!task.subtasks.length && <Typography color='text.secondary'>{dictionary.collaboration.noSubtasks || 'No sub-tasks yet.'}</Typography>}
          {canUpdate && (
            <div className='mt-3 flex items-end gap-2'>
              <CustomTextField className='grow' size='small' label={subtaskParent ? dictionary.collaboration.childSubtask : dictionary.collaboration.newSubtask} value={subtaskTitle} onChange={event => setSubtaskTitle(event.target.value)} />
              {subtaskParent && <IconButton size='small' onClick={() => setSubtaskParent(null)}><i className='tabler-x' /></IconButton>}
              <Button variant='contained' size='small' disabled={!subtaskTitle.trim() || working} onClick={addSubtask}>{dictionary.actions.addItem}</Button>
            </div>
          )}
        </CardContent>
      </Card>}

      {showResources && <Card variant='outlined'>
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
          <input
            ref={replacementInputRef}
            hidden
            type='file'
            accept='image/png,image/jpeg,image/gif,image/webp,application/pdf'
            onChange={event => {
              const replacement = attachmentToReplace
              const files = Array.from(event.target.files || [])

              event.target.value = ''
              if (replacement && files.length) uploadFiles(files, replacement)
            }}
          />
          <div className='grid grid-cols-2 gap-2'>
            {task.attachments.map(item => (
              <div key={item.id} className='group relative overflow-hidden rounded border border-divider'>
                <a href={item.url} target='_blank' rel='noreferrer' className={item.mime_type?.startsWith('image/') ? 'block' : 'flex items-center gap-2 p-3'}>
                  {item.mime_type?.startsWith('image/') ? (
                    <>
                      <img src={item.url} alt={item.name} className='bs-24 w-full object-cover' />
                      <Typography variant='caption' className='block truncate p-2'>{item.name}</Typography>
                    </>
                  ) : (
                    <>
                      <i className={`${item.attachment_type === 'LINK' ? 'tabler-link' : 'tabler-file-type-pdf'} text-xl text-primary`} />
                      <Typography variant='body2' className='truncate'>{item.name}</Typography>
                    </>
                  )}
                </a>
                {canUpdate && (
                  <div className='absolute end-1 top-1 flex rounded bg-background p-0.5 opacity-100 shadow sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100'>
                    <Tooltip title={dictionary.collaboration.replaceAttachment || 'Replace'}>
                      <IconButton size='small' aria-label={dictionary.collaboration.replaceAttachment || 'Replace'} onClick={() => item.attachment_type === 'LINK' ? replaceLink(item) : chooseReplacementFile(item)}>
                        <i className='tabler-replace' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={dictionary.collaboration.removeAttachment || 'Remove'}>
                      <IconButton size='small' color='error' aria-label={dictionary.collaboration.removeAttachment || 'Remove'} onClick={() => setAttachmentToDelete(item)}>
                        <i className='tabler-trash' />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!task.attachments.length && <Typography color='text.secondary'>{dictionary.collaboration.noAttachments}</Typography>}
          {canUpdate && (
            <div className='mt-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto_auto]'>
              <CustomTextField size='small' label={dictionary.collaboration.linkName} value={linkName} onChange={event => setLinkName(event.target.value)} />
              <CustomTextField size='small' label={dictionary.collaboration.linkUrl} value={linkUrl} onChange={event => setLinkUrl(event.target.value)} />
              {linkToReplace && <IconButton size='small' aria-label={dictionary.actions.cancel} onClick={() => { setLinkToReplace(null); setLinkName(''); setLinkUrl('') }}><i className='tabler-x' /></IconButton>}
              <Button size='small' variant='tonal' disabled={!linkName.trim() || !linkUrl.trim() || working} onClick={addLink}>{linkToReplace ? (dictionary.collaboration.replaceAttachment || 'Replace') : dictionary.actions.addItem}</Button>
            </div>
          )}
        </CardContent>
      </Card>}

      {showDiscussion && <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' className='mb-3'>{dictionary.collaboration.comments}</Typography>
          <div className='mb-4 flex max-bs-80 flex-col gap-3 overflow-y-auto'>
            {task.comments.map(entry => <CommentRow key={entry.id} entry={entry} locale={locale} dictionary={dictionary} disabled={!canUpdate || working} onEdit={(id, body) => run(() => updateTaskComment(task.id, id, { body, locale }))} onDelete={setCommentToDelete} />)}
            {!task.comments.length && <Typography color='text.secondary'>{dictionary.collaboration.noComments}</Typography>}
          </div>
          {canUpdate && (
            <div className='relative'>
              <CustomTextField fullWidth multiline minRows={2} label={dictionary.collaboration.commentPlaceholder} value={comment} onChange={event => setComment(event.target.value)} />
              {mentionMatch && mentionCandidates.length > 0 && (
                <Paper elevation={8} className='absolute bottom-full z-[1300] mb-1 max-bs-48 w-full overflow-y-auto rounded border border-divider p-1' sx={{ bgcolor: 'background.paper', opacity: 1 }}>
                  {mentionCandidates.map(staff => (
                    <Button key={staff.id} fullWidth className='gap-2 !justify-start !text-textPrimary' sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => addMention(staff)}>
                      <UserAvatar user={staff} size={28} />
                      <span className='truncate'>@{staff.full_name}</span>
                    </Button>
                  ))}
                </Paper>
              )}
              <div className='mt-2 flex justify-end'><Button variant='contained' disabled={!comment.trim() || working} onClick={submitComment}>{dictionary.actions.comment}</Button></div>
            </div>
          )}
        </CardContent>
      </Card>}

      {showDiscussion && <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' className='mb-3'>{dictionary.collaboration.activity || 'Activity'}</Typography>
          <div className='flex max-bs-96 flex-col overflow-y-auto'>
            {activity.map((entry, index) => (
              <div key={entry.id} className='relative flex gap-3 pb-4 last:pb-0'>
                {index < activity.length - 1 && <span className='absolute is-[15px] top-8 h-[calc(100%-1.5rem)] border-is border-divider' />}
                <span className='z-[1] flex size-8 shrink-0 items-center justify-center rounded-full bg-actionHover text-primary'><i className={entry.icon} /></span>
                <div className='min-is-0 grow'>
                  <Typography variant='body2' className='font-medium'>{entry.label}</Typography>
                  <Typography variant='caption' color='text.secondary'>{[entry.person, relativeTime(entry.at, locale)].filter(Boolean).join(' · ')}</Typography>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>}
      </div>
      <ConfirmDeleteModal
        open={Boolean(subtaskToDelete)}
        locale={locale}
        title={dictionary.collaboration.deleteSubtask || 'Delete sub-task?'}
        description={dictionary.collaboration.deleteSubtaskConfirm || 'Delete “{name}” and all of its nested sub-tasks?'}
        itemName={subtaskToDelete?.title}
        confirmText={dictionary.actions.delete || 'Delete'}
        cancelText={dictionary.actions.cancel}
        loading={working}
        onConfirm={async () => {
          if (subtaskToDelete && await run(() => deleteTaskSubtask(task.id, subtaskToDelete.id, { locale }))) setSubtaskToDelete(null)
        }}
        onClose={() => setSubtaskToDelete(null)}
      />
      <ConfirmDeleteModal
        open={Boolean(attachmentToDelete)}
        locale={locale}
        title={dictionary.collaboration.removeAttachment || 'Remove attachment?'}
        description={dictionary.collaboration.removeAttachmentConfirm || 'Remove “{name}”?'}
        itemName={attachmentToDelete?.name}
        confirmText={dictionary.collaboration.removeAttachment || 'Remove'}
        cancelText={dictionary.actions.cancel}
        loading={working}
        onConfirm={async () => {
          if (attachmentToDelete && await run(() => deleteTaskAttachment(task.id, attachmentToDelete.id, { locale }))) setAttachmentToDelete(null)
        }}
        onClose={() => setAttachmentToDelete(null)}
      />
      <ConfirmDeleteModal
        open={Boolean(commentToDelete)}
        locale={locale}
        title={dictionary.collaboration.deleteComment || 'Delete comment?'}
        description={dictionary.collaboration.deleteCommentConfirm || 'Delete this comment? This cannot be undone.'}
        itemName={commentToDelete?.author?.full_name}
        confirmText={dictionary.actions.delete || 'Delete'}
        cancelText={dictionary.actions.cancel}
        loading={working}
        onConfirm={async () => {
          if (commentToDelete && await run(() => deleteTaskComment(task.id, commentToDelete.id, { locale }))) setCommentToDelete(null)
        }}
        onClose={() => setCommentToDelete(null)}
      />
    </>
  )
}

export default TaskCollaborationPanels

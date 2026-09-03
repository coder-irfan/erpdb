'use client'

import { useState } from 'react'

import AvatarGroup from '@mui/material/AvatarGroup'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import KanbanCardSkeleton from '@/components/common/KanbanCardSkeleton'
import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import ConfirmationDeleteModal from '@/components/dialogs/ConfirmationDeleteModal'
import EntityActionsMenu from '@/components/table/EntityActionsMenu'
import { toDateInputValue } from '@/utils/contractDuration'

const PALETTE_COLORS = new Set(['primary', 'secondary', 'success', 'error', 'warning', 'info'])

const optionChipProps = option => {
  const color = option?.color_code?.toLowerCase()

  if (PALETTE_COLORS.has(color)) return { color }
  if (/^#[0-9a-f]{6}$/i.test(color || '')) return { sx: { color, backgroundColor: `${color}18`, borderColor: `${color}55` } }

  return { color: 'default' }
}

const ProjectKanbanView = ({ data, locale, dictionary, canWrite, canDelete, loading, statusUpdating, onView, onEdit, onMembers, onDelete, onStatusChange }) => {
  const [draggingId, setDraggingId] = useState(null)
  const [dropStatusId, setDropStatusId] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)

  if (loading) return <KanbanCardSkeleton columns={Math.max(data.statuses.length, 5)} minWidth={300} />

  const dropProject = (event, destination) => {
    event.preventDefault()
    const project = data.projects.find(item => item.id === draggingId)

    setDraggingId(null)
    setDropStatusId(null)
    if (!project || project.status_id === destination.id) return
    setPendingMove({ project, destination })
  }

  return (
    <>
      <div className='h-[calc(100vh-225px)] min-h-[455px] overflow-hidden'>
        <div className='no-scrollbar flex h-full items-stretch gap-4 overflow-x-auto overflow-y-hidden py-3'>
        {data.statuses.map(status => {
          const projects = data.projects.filter(project => project.status_id === status.id)

          return (
            <section
              key={status.id}
              className={`flex h-full min-h-0 min-w-[300px] max-w-[330px] flex-1 flex-col overflow-hidden rounded-xl p-3 transition-colors ${dropStatusId === status.id ? 'bg-primaryLighter ring-2 ring-primary' : 'bg-actionHover'}`}
              onDragOver={event => { if (canWrite) { event.preventDefault(); setDropStatusId(status.id) } }}
              onDragLeave={() => setDropStatusId(current => current === status.id ? null : current)}
              onDrop={event => dropProject(event, status)}
            >
              <div className='sticky top-0 z-10 mb-3 flex shrink-0 items-center justify-between gap-3 bg-transparent'>
                <Chip size='small' variant='tonal' label={status.label} {...optionChipProps(status)} />
                <Typography variant='caption' color='text.secondary'>{projects.length}</Typography>
              </div>
              <div className='custom-scrollbar flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-2 pe-1'>
                {projects.length === 0 ? (
                  <div className='flex min-h-0 flex-1 items-center justify-center rounded border border-dashed border-divider bg-paper p-5 text-center'>
                    <Typography variant='body2' color='text.secondary'>{dictionary.empty.title}</Typography>
                  </div>
                ) : projects.map(project => (
                  <Card
                    key={project.id}
                    variant='outlined'
                    draggable={canWrite && statusUpdating !== project.id}
                    className={`h-auto shrink-0 cursor-pointer transition-opacity ${draggingId === project.id ? 'opacity-40' : ''}`}
                    onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; setDraggingId(project.id) }}
                    onDragEnd={() => { setDraggingId(null); setDropStatusId(null) }}
                    onClick={() => onView(project)}
                  >
                    <CardContent className='flex flex-col gap-3'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-is-0'>
                          <Chip size='small' variant='tonal' color='primary' label={project.project_code} />
                          <Typography className='mt-2 line-clamp-2 font-semibold'>{project.title}</Typography>
                          <Typography variant='caption' color='text.secondary' className='block truncate'>{project.client.company_name}</Typography>
                        </div>
                        <div onClick={event => event.stopPropagation()}>
                          <EntityActionsMenu
                            locale={locale}
                            moreActionsLabel={dictionary.table.actions}
                            actions={[
                              { label: dictionary.actions.view, icon: 'tabler-eye', onClick: () => onView(project) },
                              canWrite && { label: dictionary.actions.edit, icon: 'tabler-edit', onClick: () => onEdit(project) },
                              canWrite && { label: dictionary.actions.manageMembers, icon: 'tabler-users-plus', onClick: () => onMembers(project) },
                              canDelete && { label: dictionary.actions.delete, icon: 'tabler-trash', color: 'error', onClick: () => onDelete(project) }
                            ]}
                            statusOptions={canWrite ? data.statuses : []}
                            currentStatus={project.status_id}
                            statusDisabled={statusUpdating === project.id}
                            changeStatusLabel={dictionary.actions.changeStatus}
                            onStatusChange={statusId => onStatusChange(project, statusId)}
                          />
                        </div>
                      </div>
                      <div className='flex items-center justify-between gap-2'>
                        <Chip size='small' variant='outlined' label={project.priority.label} {...optionChipProps(project.priority)} />
                        <Typography variant='caption' className={project.is_overdue ? 'font-semibold text-error' : 'text-textSecondary'}>
                          <i className='tabler-calendar-event mie-1' />{toDateInputValue(project.end_date)}
                        </Typography>
                      </div>
                      <div>
                        <div className='mb-1 flex justify-between gap-2'>
                          <Typography variant='caption'>{Number(project.logged_hours || 0).toFixed(2)} / {Number(project.estimated_hours || 0).toFixed(2)}h</Typography>
                          <Typography variant='caption' color='text.secondary'>{project.progress}%</Typography>
                        </div>
                        <LinearProgress variant='determinate' value={project.progress} color={project.progress > 100 ? 'error' : 'primary'} className='bs-1.5 rounded' />
                      </div>
                      <div className='flex items-end justify-between gap-2'>
                        <div>
                          <Tooltip title={project.project_manager?.full_name || dictionary.common.unassigned}>
                            <span><UserAvatar user={project.project_manager || { name: dictionary.common.unassigned }} size={30} /></span>
                          </Tooltip>
                          {project.members.length > 0 && <AvatarGroup max={4} className='mt-1 justify-end'>{project.members.map(member => <Tooltip key={member.id} title={member.staff.full_name}><UserAvatar user={member.staff} size={24} /></Tooltip>)}</AvatarGroup>}
                        </div>
                        <DualCurrencyAmount amount={project.budget} amountBase={project.amount_base} currency={project.currency} exchangeRate={project.exchange_rate} locale={locale} className='items-end' />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )
        })}
        </div>
      </div>
      <ConfirmationDeleteModal
        open={Boolean(pendingMove)}
        title={dictionary.actions.changeStatus}
        message={`${dictionary.actions.changeStatus}: ${pendingMove?.destination?.label || ''}?`}
        confirmText={dictionary.actions.changeStatus}
        cancelText={dictionary.actions.cancel}
        onClose={() => setPendingMove(null)}
        onConfirm={async () => {
          await onStatusChange(pendingMove.project, pendingMove.destination.id)
          setPendingMove(null)
        }}
      />
    </>
  )
}

export default ProjectKanbanView

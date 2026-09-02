'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import KanbanCardSkeleton from '@/components/common/KanbanCardSkeleton'
import ConfirmationComponent from '@/components/dialogs/ConfirmationComponent'
import CustomTextField from '@core/components/mui/TextField'
import { formatCurrency } from '@/utils/formatCurrency'

const COLOR_MAP = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

const DOT_CLASSES = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  secondary: 'bg-secondary'
}

const LeadKanbanBoard = ({
  leads,
  statuses,
  locale,
  currencyCode,
  dictionary,
  canWrite,
  loading,
  onStatusChange,
  onActivity
}) => {
  const now = new Date()
  const [pendingChange, setPendingChange] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [dropStatusId, setDropStatusId] = useState(null)

  if (loading) return <KanbanCardSkeleton minWidth={300} />

  const dropLead = (event, status) => {
    event.preventDefault()
    const lead = leads.find(item => item.id === draggingId)

    setDraggingId(null)
    setDropStatusId(null)
    if (!lead || lead.status_id === status.id) return
    setPendingChange({ lead, status })
  }

  return (
    <div className='h-[calc(100vh-225px)] min-h-[455px] overflow-hidden'>
      <div className='no-scrollbar grid h-full min-is-[1200px] grid-flow-col auto-cols-[300px] items-stretch gap-4 overflow-x-auto overflow-y-hidden py-3 scroll-smooth'>
        {statuses.map(status => {
          const columnLeads = leads.filter(lead => lead.status_id === status.id)
          const color = COLOR_MAP[status.color_code] || 'primary'

          return (
            <section
              key={status.id}
              className={`flex h-full min-h-0 min-bs-0 flex-col overflow-hidden rounded-xl p-3 transition-colors ${dropStatusId === status.id ? 'bg-primaryLighter ring-2 ring-primary' : 'bg-actionHover'}`}
              onDragOver={event => { if (canWrite) { event.preventDefault(); setDropStatusId(status.id) } }}
              onDragLeave={() => setDropStatusId(current => current === status.id ? null : current)}
              onDrop={event => dropLead(event, status)}
            >
              <div className='sticky top-0 z-10 mb-3 flex shrink-0 items-center justify-between bg-transparent'>
                <div className='flex items-center gap-2'>
                  <span className={`size-2.5 rounded-full ${DOT_CLASSES[color]}`} />
                  <Typography className='font-semibold'>{status.label}</Typography>
                </div>
                <Chip size='small' variant='tonal' color={color} label={columnLeads.length} />
              </div>
              <div className='custom-scrollbar flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-2 pe-1'>
                {columnLeads.length === 0 ? (
                  <div className='flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-divider p-7 text-center text-textSecondary'>
                    <i className='tabler-layout-kanban text-3xl' />
                    <Typography variant='body2' className='mt-2'>
                      {dictionary.kanban.empty}
                    </Typography>
                  </div>
                ) : (
                  columnLeads.map(lead => {
                    const overdue =
                      lead.next_follow_up_date && new Date(lead.next_follow_up_date) < now && !lead.converted_client

                    return (
                      <Card
                        key={lead.id}
                        variant='outlined'
                        draggable={canWrite}
                        className={`h-auto shrink-0 cursor-pointer transition-all duration-200 hover:shadow-md ${draggingId === lead.id ? 'opacity-40' : ''}`}
                        onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; setDraggingId(lead.id) }}
                        onDragEnd={() => { setDraggingId(null); setDropStatusId(null) }}
                        onClick={() => onActivity(lead)}
                      >
                        <CardContent className='flex flex-col gap-3'>
                          <div>
                            <Typography className='font-semibold' color='text.primary'>
                              {lead.title}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {lead.company_name || lead.contact_name}
                            </Typography>
                          </div>
                          <DualCurrencyAmount amount={lead.estimated_value} amountBase={lead.amount_base} currency={lead.currency || currencyCode} exchangeRate={lead.exchange_rate} locale={locale} className='items-end' primaryClassName='text-success' />
                          {lead.next_follow_up_date && (
                            <Chip
                              size='small'
                              variant='tonal'
                              color={overdue ? 'error' : 'warning'}
                              icon={<i className='tabler-calendar-time' />}
                              label={new Date(lead.next_follow_up_date).toLocaleDateString()}
                            />
                          )}
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              {lead.assigned_to ? (
                                <>
                                  <UserAvatar user={lead.assigned_to} size={28} />
                                  <Typography variant='body2'>{lead.assigned_to.full_name}</Typography>
                                </>
                              ) : (
                                <Typography variant='body2' color='text.secondary'>
                                  {dictionary.placeholders.unassigned}
                                </Typography>
                              )}
                            </div>
                            <Chip
                              size='small'
                              variant='tonal'
                              icon={<i className='tabler-activity' />}
                              label={lead.activities.length}
                            />
                          </div>
                          {canWrite && (
                            <CustomTextField
                              select
                              size='small'
                              value={lead.status_id}
                              onClick={event => event.stopPropagation()}
                              onChange={event => setPendingChange({ lead, status: statuses.find(item => item.id === event.target.value) })}
                            >
                              {statuses.map(item => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.label}
                                </MenuItem>
                              ))}
                            </CustomTextField>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>
      <ConfirmationComponent
        open={Boolean(pendingChange)}
        title={locale === 'en' ? 'Confirm Status Change' : locale === 'fa' ? 'تأیید تغییر وضعیت' : 'د حالت بدلون تایید'}
        message={locale === 'en' ? `Change this lead's status to “${pendingChange?.status?.label || ''}”?` : `«${pendingChange?.status?.label || ''}»`}
        confirmText={locale === 'en' ? 'Change Status' : locale === 'fa' ? 'تغییر وضعیت' : 'حالت بدلول'}
        cancelText={locale === 'en' ? 'Cancel' : 'لغو'}
        onClose={() => setPendingChange(null)}
        onConfirm={async () => {
          await onStatusChange(pendingChange.lead, pendingChange.status.id)
          setPendingChange(null)
        }}
      />
    </div>
  )
}

export default LeadKanbanBoard

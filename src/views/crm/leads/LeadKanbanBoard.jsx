'use client'

import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

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
  onStatusChange,
  onActivity
}) => {
  const now = new Date()

  return (
    <div className='no-scrollbar overflow-x-auto scroll-smooth pb-3'>
      <div className='grid min-is-[1200px] grid-flow-col auto-cols-[300px] gap-4'>
        {statuses.map(status => {
          const columnLeads = leads.filter(lead => lead.status_id === status.id)
          const color = COLOR_MAP[status.color_code] || 'primary'

          return (
            <section key={status.id} className='flex min-bs-[320px] flex-col rounded-xl bg-actionHover p-3'>
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className={`size-2.5 rounded-full ${DOT_CLASSES[color]}`} />
                  <Typography className='font-semibold'>{status.label}</Typography>
                </div>
                <Chip size='small' variant='tonal' color={color} label={columnLeads.length} />
              </div>
              <div className='flex flex-1 flex-col gap-3 pt-2'>
                {columnLeads.length === 0 ? (
                  <div className='flex min-bs-[300px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-divider p-7 text-center text-textSecondary'>
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
                        className='cursor-pointer transition-shadow duration-200 hover:shadow-md'
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
                          <Typography className='text-right font-semibold text-success'>
                            {formatCurrency(lead.estimated_value, locale, currencyCode)}
                          </Typography>
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
                                  <Avatar className='size-7 bg-primaryLighter text-primary'>
                                    {lead.assigned_to.full_name.slice(0, 1)}
                                  </Avatar>
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
                              onChange={event => onStatusChange(lead, event.target.value)}
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
    </div>
  )
}

export default LeadKanbanBoard

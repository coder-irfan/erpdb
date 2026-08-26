'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const TaskStatsCards = ({ summary, dictionary }) => {
  const cards = [
    {
      title: dictionary.metrics.total,
      value: summary.total,
      hint: dictionary.metrics.totalHint,
      icon: 'tabler-list-check',
      classes: 'bg-primaryLighter text-primary'
    },
    {
      title: dictionary.metrics.progress,
      value: summary.inProgress,
      hint: dictionary.metrics.progressHint,
      icon: 'tabler-progress',
      classes: 'bg-infoLighter text-info'
    },
    {
      title: dictionary.metrics.overdue,
      value: summary.overdue,
      hint: dictionary.metrics.overdueHint,
      icon: 'tabler-alert-triangle',
      classes: 'bg-errorLighter text-error'
    },
    {
      title: dictionary.metrics.hours,
      value: `${summary.actualHours} / ${summary.estimatedHours}`,
      hint: dictionary.metrics.hoursHint
        .replace('{actual}', summary.actualHours)
        .replace('{estimated}', summary.estimatedHours),
      icon: 'tabler-clock-hour-4',
      classes: 'bg-successLighter text-success'
    }
  ]

  return (
    <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-4'>
      {cards.map(card => (
        <Card key={card.title} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
          <CardContent className='flex items-start justify-between gap-4'>
            <div className='min-is-0'>
              <Typography color='text.secondary' variant='body2'>
                {card.title}
              </Typography>
              <Typography variant='h5' className='my-1 truncate'>
                {card.value}
              </Typography>
              <Typography color='text.secondary' variant='caption' className='line-clamp-1'>
                {card.hint}
              </Typography>
            </div>
            <span className={`flex size-11 shrink-0 items-center justify-center rounded ${card.classes}`}>
              <i className={`${card.icon} text-2xl`} />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default TaskStatsCards

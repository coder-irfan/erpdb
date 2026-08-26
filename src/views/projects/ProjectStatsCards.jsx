'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const ProjectStatsCards = ({ summary, locale, currency, dictionary }) => {
  const cards = [
    {
      title: dictionary.metrics.active,
      value: summary.activeCount,
      hint: dictionary.metrics.activeHint,
      icon: 'tabler-player-play',
      iconClass: 'bg-primaryLighter text-primary'
    },
    {
      title: dictionary.metrics.budget,
      value: formatCurrency(summary.amountBase, locale, currency),
      hint: dictionary.metrics.budgetHint.replace('{currency}', currency),
      icon: 'tabler-wallet',
      iconClass: 'bg-successLighter text-success'
    },
    {
      title: dictionary.metrics.hours,
      value: `${summary.actualHours} / ${summary.estimatedHours}`,
      hint: dictionary.metrics.hoursHint
        .replace('{actual}', summary.actualHours)
        .replace('{estimated}', summary.estimatedHours),
      icon: 'tabler-clock-hour-4',
      iconClass: 'bg-infoLighter text-info'
    },
    {
      title: dictionary.metrics.overdue,
      value: summary.overdueCount,
      hint: dictionary.metrics.overdueHint,
      icon: 'tabler-alert-triangle',
      iconClass: 'bg-errorLighter text-error'
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
            <span className={`flex size-11 shrink-0 items-center justify-center rounded ${card.iconClass}`}>
              <i className={`${card.icon} text-2xl`} />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default ProjectStatsCards

'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const FinanceLoanStatsCards = ({ summary, locale, dictionary }) => {
  const cards = [
    {
      label: dictionary.metrics.active,
      value: summary.active,
      hint: dictionary.metrics.activeHint,
      icon: 'tabler-building-bank',
      tone: 'bg-secondaryLighter text-warning'
    },
    {
      label: dictionary.metrics.repaid,
      value: summary.repaid,
      hint: dictionary.metrics.repaidHint,
      icon: 'tabler-cash-banknote',
      tone: 'bg-successLighter text-success'
    },
    {
      label: dictionary.metrics.recovery,
      value: summary.recovery,
      hint: dictionary.metrics.recoveryHint,
      icon: 'tabler-calendar-dollar',
      tone: 'bg-infoLighter text-info'
    },
    {
      label: dictionary.metrics.portfolio,
      value: summary.portfolio,
      hint: dictionary.metrics.portfolioHint,
      icon: 'tabler-report-money',
      tone: 'bg-primaryLighter text-primary'
    }
  ]

  return (
    <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-4'>
      {cards.map(card => (
        <Card key={card.label} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='min-is-0'>
              <Typography variant='body2' color='text.secondary' className='truncate'>
                {card.label}
              </Typography>
              <Typography variant='h5' className='mt-1 truncate'>
                {formatCurrency(card.value, locale, 'USD')}
              </Typography>
              <Typography variant='caption' color='text.secondary' className='block truncate'>
                {card.hint}
              </Typography>
            </div>
            <span className={`flex size-11 shrink-0 items-center justify-center rounded ${card.tone}`}>
              <i className={`${card.icon} text-2xl`} />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default FinanceLoanStatsCards

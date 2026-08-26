'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const FinanceExpenseStatsCards = ({ summary, locale, currency, dictionary }) => {
  const cards = [
    {
      label: dictionary.metrics.total,
      value: summary.total,
      hint: dictionary.metrics.baseCurrency.replace('{currency}', currency),
      icon: 'tabler-receipt-tax',
      tone: 'bg-errorLighter text-error'
    },
    {
      label: dictionary.metrics.project,
      value: summary.project,
      hint: dictionary.metrics.projectHint,
      icon: 'tabler-briefcase',
      tone: 'bg-primaryLighter text-primary'
    },
    {
      label: dictionary.metrics.overhead,
      value: summary.overhead,
      hint: dictionary.metrics.overheadHint,
      icon: 'tabler-building-bank',
      tone: 'bg-secondaryLighter text-warning'
    },
    {
      label: dictionary.metrics.month,
      value: summary.month,
      hint: dictionary.metrics.monthHint,
      icon: 'tabler-calendar-dollar',
      tone: 'bg-infoLighter text-info'
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
                {formatCurrency(card.value, locale, currency)}
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

export default FinanceExpenseStatsCards

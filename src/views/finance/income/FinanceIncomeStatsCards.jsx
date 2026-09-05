'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { useCurrency } from '@/contexts/CurrencyContext'

const FinanceIncomeStatsCards = ({ summary, locale, currency, dictionary }) => {
  const { currentCurrency, formatCurrency } = useCurrency()

  const cards = [
    {
      label: dictionary.metrics.totalIncome,
      value: summary.totalIncome,
      hint: dictionary.metrics.baseCurrency.replace('{currency}', currentCurrency),
      icon: 'tabler-cash-banknote',
      tone: 'bg-primaryLighter text-primary'
    },
    {
      label: dictionary.metrics.totalCollected,
      value: summary.totalCollected,
      hint: dictionary.metrics.collectedHint,
      icon: 'tabler-wallet',
      tone: 'bg-successLighter text-success'
    },
    {
      label: dictionary.metrics.pendingReceivables,
      value: summary.pendingReceivables,
      hint: dictionary.metrics.pendingHint,
      icon: 'tabler-clock-dollar',
      tone: 'bg-secondaryLighter text-warning'
    },
    {
      label: dictionary.metrics.overdueReceivables,
      value: summary.overdueReceivables,
      hint: dictionary.metrics.overdueHint,
      icon: 'tabler-alert-triangle',
      tone: 'bg-errorLighter text-error'
    }
  ]

  return (
    <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-3 md:pb-0'>
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

export default FinanceIncomeStatsCards

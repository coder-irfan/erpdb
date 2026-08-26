'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const InventoryStatsCards = ({ summary, locale, dictionary }) => {
  const cards = [
    {
      label: dictionary.metrics.totalValue,
      value: formatCurrency(summary.totalValue, locale, 'USD'),
      hint: dictionary.metrics.usdHint,
      icon: 'tabler-report-money',
      tone: 'bg-primaryLighter text-primary'
    },
    {
      label: dictionary.metrics.totalItems,
      value: summary.totalItems,
      hint: dictionary.metrics.itemsHint,
      icon: 'tabler-packages',
      tone: 'bg-infoLighter text-info'
    },
    {
      label: dictionary.metrics.lowStock,
      value: summary.lowStock,
      hint: dictionary.metrics.lowStockHint,
      icon: 'tabler-alert-triangle',
      tone: 'bg-secondaryLighter text-warning'
    },
    {
      label: dictionary.metrics.outOfStock,
      value: summary.outOfStock,
      hint: dictionary.metrics.outOfStockHint,
      icon: 'tabler-package-off',
      tone: 'bg-errorLighter text-error'
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
                {card.value}
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

export default InventoryStatsCards

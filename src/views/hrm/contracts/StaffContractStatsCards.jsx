import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const StaffContractStatsCards = ({ summary, locale, currency, dictionary }) => {
  const cards = [
    { key: 'active', label: dictionary.active, icon: 'tabler-file-check', classes: 'bg-successLighter text-success' },
    {
      key: 'expiringSoon',
      label: dictionary.expiringSoon,
      icon: 'tabler-calendar-time',
      classes: 'bg-secondaryLighter text-warning'
    },
    { key: 'draft', label: dictionary.draft, icon: 'tabler-file-pencil', classes: 'bg-primaryLighter text-primary' },
    {
      key: 'totalValue',
      label: dictionary.totalValue,
      icon: 'tabler-cash-banknote',
      classes: 'bg-infoLighter text-info',
      money: true
    }
  ]

  return (
    <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-3 md:pb-0'>
      {cards.map(card => (
        <Card key={card.key} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='min-is-0'>
              <Typography className='text-sm font-semibold md:text-base' color='text.secondary'>
                {card.label}
              </Typography>
              <Typography variant='h4' className='mt-1 truncate'>
                {card.money
                  ? formatCurrency(summary?.[card.key], locale, currency)
                  : toFiniteNumber(summary?.[card.key])}
              </Typography>
            </div>
            <div className={`flex size-12 shrink-0 items-center justify-center rounded ${card.classes}`}>
              <i className={`${card.icon} text-xl lg:text-2xl`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default StaffContractStatsCards

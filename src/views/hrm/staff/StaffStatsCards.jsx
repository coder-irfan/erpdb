import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import { toFiniteNumber } from '@/utils/formatCurrency'

const StaffStatsCards = ({ stats, dictionary }) => {
  const cards = [
    { key: 'total', label: dictionary.stats.total, icon: 'tabler-users', classes: 'bg-secondaryLighter text-warning' },
    { key: 'active', label: dictionary.stats.active, icon: 'tabler-user-check', classes: 'bg-infoLighter text-info' },
    {
      key: 'inactive',
      label: dictionary.stats.inactive,
      icon: 'tabler-user-pause',
      classes: 'bg-primaryLighter text-primary'
    },
    {
      key: 'terminated',
      label: dictionary.stats.terminated,
      icon: 'tabler-user-x',
      classes: 'bg-errorLighter text-error'
    }
  ]

  return (
    <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-3 md:pb-0'>
      {cards.map(card => (
        <Card key={card.key} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div>
              <Typography className='text-sm md:text-base font-semibold' color='text.secondary'>
                {card.label}
              </Typography>
              <Typography variant='h4' className='mt-1'>
                {toFiniteNumber(stats?.[card.key])}
              </Typography>
            </div>
            <div className={`flex size-12 items-center justify-center rounded ${card.classes}`}>
              <i className={`${card.icon} text-xl lg:text-2xl`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default StaffStatsCards

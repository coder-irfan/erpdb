import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { formatCurrency } from '@/utils/formatCurrency'

const cards = [
  { key: 'totalActive', icon: 'tabler-building-community', classes: 'bg-primaryLighter text-primary' },
  { key: 'lifetimeRevenue', icon: 'tabler-cash', classes: 'bg-successLight text-success', money: true },
  { key: 'activeProjects', icon: 'tabler-briefcase', classes: 'bg-infoLight text-info' },
  { key: 'pendingBalance', icon: 'tabler-receipt', classes: 'bg-warningLight text-warning', money: true }
]

const ClientStatsCards = ({ summary, locale, currencyCode, dictionary }) => (
  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
    {cards.map(card => (
      <Card key={card.key}>
        <CardContent className='flex items-center justify-between gap-4'>
          <div>
            <Typography color='text.secondary'>{dictionary.summary[card.key]}</Typography>
            <Typography variant='h5' className='mt-1'>
              {card.money ? formatCurrency(summary[card.key], locale, currencyCode) : summary[card.key] || 0}
            </Typography>
          </div>
          <span className={`flex size-12 items-center justify-center rounded ${card.classes}`}>
            <i className={`${card.icon} text-3xl`} />
          </span>
        </CardContent>
      </Card>
    ))}
  </div>
)

export default ClientStatsCards


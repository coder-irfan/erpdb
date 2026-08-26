import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const cards = [
  { key: 'totalToday', icon: 'tabler-users', classes: 'bg-primaryLighter text-primary' },
  { key: 'activeGuests', icon: 'tabler-door-enter', classes: 'bg-secondaryLighter text-warning' },
  { key: 'completedToday', icon: 'tabler-circle-check', classes: 'bg-successLighter text-success' },
  { key: 'convertedCount', icon: 'tabler-user-share', classes: 'bg-infoLighter text-info' }
]

const VisitorStatsCards = ({ summary, dictionary }) => (
  <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-3 md:pb-0'>
    {cards.map(card => (
      <Card key={card.key} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
        <CardContent className='flex items-center justify-between gap-4'>
          <div>
            <Typography color='text.secondary' className='text-sm md:text-base font-semibold'>
              {dictionary.summary[card.key]}
            </Typography>
            <Typography variant='h5' className='mt-1'>
              {summary[card.key] || 0}
            </Typography>
          </div>
          <span className={`flex size-12 items-center justify-center rounded ${card.classes}`}>
            <i className={`${card.icon} text-xl lg:text-2xl`} />
          </span>
        </CardContent>
      </Card>
    ))}
  </div>
)

export default VisitorStatsCards

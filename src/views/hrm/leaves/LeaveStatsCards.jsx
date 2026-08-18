import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const cards = [
  { key: 'pending', label: 'pending', icon: 'tabler-hourglass', classes: 'bg-secondaryLighter text-warning' },
  { key: 'onLeaveToday', label: 'onLeaveToday', icon: 'tabler-calendar-off', classes: 'bg-infoLighter text-info' },
  { key: 'monthlyDays', label: 'monthlyDays', icon: 'tabler-calendar-stats', classes: 'bg-primaryLighter text-primary' }
]

const LeaveStatsCards = ({ summary, dictionary }) => (
  <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible'>
    {cards.map(card => (
      <Card key={card.key} className='min-w-[220px] snap-start lg:min-w-0'>
        <CardContent className='flex items-center justify-between gap-4'>
          <div>
            <Typography color='text.secondary' className='text-sm md:text-base font-semibold'>
              {dictionary.summary[card.label]}
            </Typography>
            <Typography variant='h4' className='mt-1'>
              {summary[card.key] || 0}
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

export default LeaveStatsCards

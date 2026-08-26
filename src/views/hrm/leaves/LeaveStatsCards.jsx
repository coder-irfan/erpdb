import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const cards = [
  { key: 'pending', label: 'pending', icon: 'tabler-hourglass', classes: 'bg-secondaryLighter text-warning' },
  { key: 'onLeaveToday', label: 'onLeaveToday', icon: 'tabler-calendar-off', classes: 'bg-infoLighter text-info' },
  { key: 'monthlyDays', label: 'monthlyDays', icon: 'tabler-calendar-stats', classes: 'bg-primaryLighter text-primary' }
]

const LeaveStatsCards = ({ summary, dictionary }) => (
  <div className='no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-3 xl:overflow-visible pb-3 md:pb-0'>
    {cards.map(card => (
      <Card key={card.key} className='min-w-[265px] snap-start xl:min-w-0 border border-divider/70 shadow-sm'>
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

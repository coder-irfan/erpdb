import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const cards = [
  { key: 'pending', label: 'pending', icon: 'tabler-hourglass', classes: 'bg-warningLight text-warning' },
  { key: 'onLeaveToday', label: 'onLeaveToday', icon: 'tabler-calendar-off', classes: 'bg-infoLight text-info' },
  { key: 'monthlyDays', label: 'monthlyDays', icon: 'tabler-calendar-stats', classes: 'bg-primaryLighter text-primary' }
]

const LeaveStatsCards = ({ summary, dictionary }) => (
  <div className='grid grid-cols-1 gap-6 sm:grid-cols-3'>
    {cards.map(card => (
      <Card key={card.key}>
        <CardContent className='flex items-center justify-between gap-4'>
          <div>
            <Typography color='text.secondary'>{dictionary.summary[card.label]}</Typography>
            <Typography variant='h4' className='mt-1'>{summary[card.key] || 0}</Typography>
          </div>
          <div className={`flex size-12 items-center justify-center rounded ${card.classes}`}>
            <i className={`${card.icon} text-3xl`} />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

export default LeaveStatsCards

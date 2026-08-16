import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const cards = [
  { key: 'totalToday', icon: 'tabler-users', classes: 'bg-primaryLighter text-primary' },
  { key: 'activeGuests', icon: 'tabler-door-enter', classes: 'bg-warningLight text-warning' },
  { key: 'completedToday', icon: 'tabler-circle-check', classes: 'bg-successLight text-success' },
  { key: 'convertedCount', icon: 'tabler-user-share', classes: 'bg-infoLight text-info' }
]

const VisitorStatsCards = ({ summary, dictionary }) => (
  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
    {cards.map(card => (
      <Card key={card.key}>
        <CardContent className='flex items-center justify-between gap-4'>
          <div><Typography color='text.secondary'>{dictionary.summary[card.key]}</Typography><Typography variant='h5' className='mt-1'>{summary[card.key] || 0}</Typography></div>
          <span className={`flex size-12 items-center justify-center rounded ${card.classes}`}><i className={`${card.icon} text-3xl`} /></span>
        </CardContent>
      </Card>
    ))}
  </div>
)

export default VisitorStatsCards


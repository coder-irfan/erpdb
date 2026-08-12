import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const cards = [
  { key: 'total_present', label: 'present', icon: 'tabler-user-check', classes: 'bg-successLight text-success' },
  { key: 'total_absent', label: 'absent', icon: 'tabler-user-x', classes: 'bg-errorLight text-error' },
  { key: 'total_leave', label: 'leave', icon: 'tabler-calendar-off', classes: 'bg-infoLight text-info' },
  { key: 'unmarked_count', label: 'unmarked', icon: 'tabler-clock-question', classes: 'bg-warningLight text-warning' }
]

const AttendanceStatsCards = ({ summary, dictionary }) => (
  <div className='attendance-summary grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
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

export default AttendanceStatsCards

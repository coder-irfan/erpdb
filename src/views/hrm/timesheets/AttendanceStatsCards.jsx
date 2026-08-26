import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const cards = [
  { key: 'total_present', label: 'present', icon: 'tabler-user-check', classes: 'bg-successLighter text-success' },
  { key: 'total_absent', label: 'absent', icon: 'tabler-user-x', classes: 'bg-errorLight text-error' },
  { key: 'total_leave', label: 'leave', icon: 'tabler-calendar-off', classes: 'bg-infoLighter text-info' },
  {
    key: 'unmarked_count',
    label: 'unmarked',
    icon: 'tabler-clock-question',
    classes: 'bg-secondaryLighter text-warning'
  }
]

const AttendanceStatsCards = ({ summary, dictionary }) => (
  <div className='attendance-summary no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible pb-3 md:pb-0'>
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

export default AttendanceStatsCards

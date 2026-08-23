import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

const ACCENTS = [
  'bg-primaryLight text-primary',
  'bg-successLighter text-success',
  'bg-secondaryLighter text-warning',
  'bg-infoLighter text-info'
]

const ReportStatsCards = ({ items, loading, className = '' }) => (
  <div className={`no-scrollbar flex w-full snap-x items-center gap-4 overflow-x-auto xl:grid xl:grid-cols-4 xl:overflow-visible ${className}`}>
    {items.map((item, index) => {
      const accentClasses = ACCENTS[index % ACCENTS.length]

      return (
        <Card key={item.label} className='report-summary-card min-w-[380px] snap-start xl:min-w-0'>
          <CardContent className='flex items-center justify-between gap-4'>
            <div className='min-w-0'>
              <Typography color='text.secondary' className='truncate'>
                {item.label}
              </Typography>
              {loading ? (
                <Skeleton variant='rounded' width={120} height={32} className='mt-2' />
              ) : (
                <Typography variant='h4' className='mt-1 font-semibold'>
                  {item.value}
                </Typography>
              )}
            </div>
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${accentClasses}`}>
              <i className={`${item.icon} text-2xl`} />
            </div>
          </CardContent>
        </Card>
      )
    })}
  </div>
)

export default ReportStatsCards

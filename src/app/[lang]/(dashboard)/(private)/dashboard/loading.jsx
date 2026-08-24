import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'

const DashboardLoading = () => (
  <div className='w-full space-y-4' aria-busy='true' aria-label='Loading dashboard'>
    <div className='no-scrollbar overflow-x-auto'>
      <div className='grid min-is-max grid-cols-4 gap-4 lg:min-is-0'>
        {Array.from({ length: 4 }, (_, index) => <Card key={index} className='h-[148px] is-[235px] border border-divider shadow-sm lg:is-auto'><CardContent className='p-4'><div className='flex items-center gap-2'><Skeleton variant='rounded' width={32} height={32} /><Skeleton variant='text' width={90} /></div><div className='mt-6 flex items-end justify-between gap-4'><div><Skeleton variant='text' width={100} height={34} /><Skeleton variant='rounded' width={58} height={20} /></div><Skeleton variant='rounded' width={100} height={58} /></div></CardContent></Card>)}
      </div>
    </div>
    <Grid container spacing={4}>
      {[8, 4].map(size => <Grid key={size} size={{ xs: 12, lg: size }}><Card className='border border-divider shadow-sm'><CardContent className='p-4'><Skeleton variant='text' width={180} height={30} /><Skeleton variant='rounded' height={250} className='mt-2' /></CardContent></Card></Grid>)}
    </Grid>
  </div>
)

export default DashboardLoading

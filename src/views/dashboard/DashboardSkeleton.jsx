import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'

const shimmer = 'wave'

const DashboardPanelSkeleton = ({ children, height = 382 }) => (
  <Card className='border border-divider/70 shadow-sm'>
    <div className='flex items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5'>
      <div>
        <Skeleton animation={shimmer} variant='text' width={156} height={26} />
        <Skeleton animation={shimmer} variant='text' width={214} height={18} />
      </div>
      <Skeleton animation={shimmer} variant='rounded' width={96} height={32} />
    </div>
    <CardContent className='pt-2'>{children || <Skeleton animation={shimmer} variant='rounded' height={height - 76} />}</CardContent>
  </Card>
)

const KpiSkeleton = () => (
  <Card className='h-[154px] border border-divider/70 shadow-sm'>
    <CardContent className='flex h-full flex-col p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='w-full max-w-[130px]'>
          <Skeleton animation={shimmer} variant='text' width='72%' height={18} />
          <Skeleton animation={shimmer} variant='text' width='96%' height={34} />
        </div>
        <Skeleton animation={shimmer} variant='rounded' width={36} height={36} className='rounded-xl' />
      </div>
      <div className='mt-auto flex items-end justify-between gap-3'>
        <div className='w-24'>
          <Skeleton animation={shimmer} variant='rounded' width={54} height={20} className='rounded-full' />
          <Skeleton animation={shimmer} variant='text' width='100%' height={18} />
        </div>
        <Skeleton animation={shimmer} variant='rounded' width={104} height={56} />
      </div>
    </CardContent>
  </Card>
)

const ListPanelSkeleton = () => (
  <DashboardPanelSkeleton height={244}>
    <div className='space-y-3'>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className='flex items-center gap-3 py-1'>
          <Skeleton animation={shimmer} variant='rounded' width={32} height={32} className='rounded-lg' />
          <div className='flex-1'>
            <Skeleton animation={shimmer} variant='text' width={`${72 - index * 7}%`} height={19} />
            <Skeleton animation={shimmer} variant='text' width={`${52 - index * 5}%`} height={16} />
          </div>
          <Skeleton animation={shimmer} variant='text' width={48} height={18} />
        </div>
      ))}
    </div>
  </DashboardPanelSkeleton>
)

const DashboardSkeleton = ({ label = 'Loading dashboard' }) => (
  <div className='flex flex-col gap-5' aria-busy='true' aria-live='polite' aria-label={label}>
    <header className='flex flex-wrap items-center justify-between gap-4'>
      <div className='flex min-is-0 items-center gap-3'>
        <Skeleton animation={shimmer} variant='circular' width={44} height={44} />
        <div>
          <Skeleton animation={shimmer} variant='text' width={178} height={31} />
          <Skeleton animation={shimmer} variant='text' width={244} height={20} />
        </div>
      </div>
      <Skeleton animation={shimmer} variant='rounded' width={132} height={32} className='rounded-lg' />
    </header>
    <div className='no-scrollbar overflow-x-auto pb-1'>
      <div className='grid min-is-max grid-cols-4 gap-4 lg:min-is-0'>
        {Array.from({ length: 4 }, (_, index) => <div key={index} className='is-[260px] lg:is-auto'><KpiSkeleton /></div>)}
      </div>
    </div>
    <section className='grid grid-cols-1 gap-4 xl:grid-cols-2'><DashboardPanelSkeleton /><DashboardPanelSkeleton /></section>
    <section className='grid grid-cols-1 gap-4 xl:grid-cols-2'><ListPanelSkeleton /><ListPanelSkeleton /></section>
    <section>
      <div className='mb-3'><Skeleton animation={shimmer} variant='text' width={148} height={28} /><Skeleton animation={shimmer} variant='text' width={248} height={20} /></div>
      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'><ListPanelSkeleton /><ListPanelSkeleton /></div>
    </section>
  </div>
)

export default DashboardSkeleton

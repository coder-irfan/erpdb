import Skeleton from '@mui/material/Skeleton'

const DetailSkeleton = ({ rows = 4 }) => (
  <div className='grid min-bs-[320px] grid-cols-1 content-start gap-4 p-1 sm:grid-cols-2'>
    <Skeleton variant='rounded' height={92} className='sm:col-span-2' />
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} variant='rounded' height={76} />
    ))}
    <Skeleton variant='rounded' height={140} className='sm:col-span-2' />
  </div>
)

export default DetailSkeleton

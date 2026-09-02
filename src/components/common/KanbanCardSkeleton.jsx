import Skeleton from '@mui/material/Skeleton'

const KanbanCardSkeleton = ({ columns = 4, cards = 3, minWidth = 290 }) => (
  <div className='no-scrollbar flex h-[calc(100vh-220px)] min-h-[420px] items-stretch gap-4 overflow-x-auto py-3' aria-label='Loading board' aria-busy='true'>
    {Array.from({ length: columns }, (_, columnIndex) => (
      <section
        key={columnIndex}
        className='flex h-full flex-col gap-3 overflow-hidden rounded-xl bg-actionHover p-3'
        style={{ minWidth, maxWidth: 320, flex: 1 }}
      >
        <div className='flex items-center justify-between gap-3'>
          <Skeleton animation='wave' variant='rounded' width={126} height={26} className='rounded-full' />
          <Skeleton animation='wave' variant='circular' width={24} height={24} />
        </div>
        <div className='custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto pe-1'>
          {Array.from({ length: cards }, (_, cardIndex) => (
            <div key={cardIndex} className='rounded-lg border border-divider bg-paper p-4 shadow-sm'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex-1'>
                  <Skeleton animation='wave' variant='text' width={cardIndex % 2 ? '78%' : '92%'} height={25} />
                  <Skeleton animation='wave' variant='rounded' width='68%' height={20} className='mt-2' />
                </div>
                <Skeleton animation='wave' variant='circular' width={28} height={28} />
              </div>
              <div className='mt-4 flex justify-between gap-3'>
                <Skeleton animation='wave' variant='rounded' width={72} height={24} className='rounded-full' />
                <Skeleton animation='wave' variant='text' width={64} height={20} />
              </div>
              <Skeleton animation='wave' variant='rounded' height={6} className='mt-4 rounded-full' />
              <div className='mt-4 flex items-center justify-between'>
                <Skeleton animation='wave' variant='rounded' width={92} height={28} className='rounded-full' />
                <Skeleton animation='wave' variant='rounded' width={54} height={22} className='rounded-full' />
              </div>
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
)

export default KanbanCardSkeleton

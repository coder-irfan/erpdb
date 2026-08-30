'use client'

import { useTransition } from 'react'

import { useParams } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { getDashboardDictionary } from '@/data/dictionaries/dashboard'

const DashboardError = ({ reset }) => {
  const params = useParams()
  const dictionary = getDashboardDictionary(params?.lang)
  const [isPending, startTransition] = useTransition()

  const retry = () => startTransition(() => reset())

  return (
    <Card className='border border-divider shadow-sm'>
      <CardContent className='flex min-bs-[360px] flex-col items-center justify-center gap-4 text-center'>
        <span className='flex size-16 items-center justify-center rounded-full bg-errorLight text-error'><i className='tabler-alert-triangle text-3xl' /></span>
        <div><Typography variant='h5' className='font-semibold'>{dictionary.common.loadError}</Typography><Typography color='text.secondary' className='mt-1'>{dictionary.common.noData}</Typography></div>
        <Button
          variant='contained'
          onClick={retry}
          disabled={isPending}
          aria-busy={isPending}
          startIcon={<i className={`tabler-refresh ${isPending ? 'animate-spin' : ''}`} />}
        >
          {dictionary.common.retry || dictionary.common.refresh}
        </Button>
      </CardContent>
    </Card>
  )
}

export default DashboardError

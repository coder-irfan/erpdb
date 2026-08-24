'use client'

import { FileQuestion } from 'lucide-react'

import { GoBackButton, HomeLink, SystemPage } from '@/components/system/SystemPage'

const NotFound = () => (
  <SystemPage
    icon={props => <FileQuestion {...props} className='size-16 text-primary/70' />}
    title='404 - Page Not Found'
    description="The page you are looking for doesn't exist or has been moved."
  >
    <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
      <HomeLink />
      <GoBackButton />
    </div>
  </SystemPage>
)

export default NotFound

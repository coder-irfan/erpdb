'use client'

import { FileQuestion } from 'lucide-react'

import { GoBackButton, HomeLink, SystemPage, useSystemPagesDictionary } from '@/components/system/SystemPage'

const NotFound = () => {
  const dictionary = useSystemPagesDictionary()

  return (
    <SystemPage
      icon={props => <FileQuestion {...props} className='size-16 text-primary/70' />}
      title={dictionary.notFound.title}
      description={dictionary.notFound.description}
    >
      <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
        <HomeLink className="cursor-pointer" />
        <GoBackButton className="cursor-pointer" />
      </div>
    </SystemPage>
  )
}

export default NotFound

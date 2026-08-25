'use client'

import { ShieldAlert } from 'lucide-react'

import { HomeLink, SwitchAccountButton, SystemPage, useSystemPagesDictionary } from '@/components/system/SystemPage'

const AccessDeniedPage = () => {
  const dictionary = useSystemPagesDictionary()

  return (
    <SystemPage
      icon={props => <ShieldAlert {...props} className='size-16 text-rose-500' />}
      title={dictionary.accessDenied.title}
      description={dictionary.accessDenied.description}
    >
      <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
        <HomeLink />
        <SwitchAccountButton />
      </div>
    </SystemPage>
  )
}

export default AccessDeniedPage

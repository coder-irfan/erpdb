'use client'

import { ShieldAlert } from 'lucide-react'

import { HomeLink, SwitchAccountButton, SystemPage } from '@/components/system/SystemPage'

const AccessDeniedPage = () => (
  <SystemPage
    icon={props => <ShieldAlert {...props} className='size-16 text-rose-500' />}
    title='Access Denied'
    description='You do not have permission to view this section or resource. Please contact your system administrator.'
  >
    <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
      <HomeLink />
      <SwitchAccountButton />
    </div>
  </SystemPage>
)

export default AccessDeniedPage

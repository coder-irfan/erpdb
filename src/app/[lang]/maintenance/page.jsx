'use client'

import { Activity, Wrench } from 'lucide-react'

import { HomeLink, SystemPage } from '@/components/system/SystemPage'

const MaintenancePage = () => (
  <SystemPage
    icon={props => <Wrench {...props} className='size-16 text-primary' />}
    title='System Under Maintenance'
    description="We are performing scheduled updates to improve our enterprise system. We'll be back online shortly."
  >
    <div className='mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950'>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
        <Activity className='size-5' aria-hidden='true' />
      </span>
      <div>
        <p className='text-sm font-semibold text-slate-800 dark:text-slate-100'>Maintenance in progress</p>
        <p className='mt-0.5 text-sm text-slate-500 dark:text-slate-400'>Expected completion: shortly</p>
      </div>
    </div>
    <div className='mt-7 flex justify-center'>
      <HomeLink />
    </div>
  </SystemPage>
)

export default MaintenancePage

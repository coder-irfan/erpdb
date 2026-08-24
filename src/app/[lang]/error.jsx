'use client'

import { AlertTriangle } from 'lucide-react'

import { HomeLink, RetryButton, SystemPage } from '@/components/system/SystemPage'

const getSafeErrorMessage = error => {
  const message = typeof error?.message === 'string' ? error.message.replace(/[\r\n]+/g, ' ').trim() : ''

  return message.slice(0, 500) || 'No technical details are available.'
}

const ErrorPage = ({ error, reset }) => (
  <SystemPage
    icon={props => <AlertTriangle {...props} className='size-16 text-amber-500' />}
    title='Something Went Wrong'
    description='An unexpected system error occurred. Our team has been notified.'
  >
    {process.env.NODE_ENV !== 'production' && (
      <details className='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-950'>
        <summary className='cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200'>Technical details</summary>
        <p className='mt-3 break-words font-mono text-xs leading-5 text-slate-500 dark:text-slate-400'>{getSafeErrorMessage(error)}</p>
      </details>
    )}
    <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
      <RetryButton reset={reset} />
      <HomeLink />
    </div>
  </SystemPage>
)

export default ErrorPage

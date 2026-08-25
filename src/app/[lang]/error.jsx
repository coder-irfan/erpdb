'use client'

import { AlertTriangle } from 'lucide-react'

import { HomeLink, RetryButton, SystemPage, useSystemPagesDictionary } from '@/components/system/SystemPage'

const getSafeErrorMessage = (error, fallback) => {
  const message = typeof error?.message === 'string' ? error.message.replace(/[\r\n]+/g, ' ').trim() : ''

  return message.slice(0, 500) || fallback
}

const ErrorPage = ({ error, reset }) => {
  const dictionary = useSystemPagesDictionary()

  return (
    <SystemPage
      icon={props => <AlertTriangle {...props} className='size-16 text-amber-500' />}
      title={dictionary.error.title}
      description={dictionary.error.description}
    >
      {process.env.NODE_ENV !== 'production' && (
        <details className='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-start dark:border-slate-800 dark:bg-slate-950'>
          <summary className='cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200'>{dictionary.error.technicalDetails}</summary>
          <p className='mt-3 break-words font-mono text-xs leading-5 text-slate-500 dark:text-slate-400'>{getSafeErrorMessage(error, dictionary.error.noTechnicalDetails)}</p>
        </details>
      )}
      <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
        <RetryButton reset={reset} />
        <HomeLink />
      </div>
    </SystemPage>
  )
}

export default ErrorPage

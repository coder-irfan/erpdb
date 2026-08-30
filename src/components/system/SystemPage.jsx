'use client'

import { useTransition } from 'react'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { ArrowLeft, Home, LoaderCircle, LogOut, RotateCcw } from 'lucide-react'

import { i18n } from '@/configs/i18n'
import { getSystemPagesDictionary } from '@/data/dictionaries/systemPages'

const actionClassName =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950'

const getLocale = lang => (i18n.locales.includes(lang) ? lang : i18n.defaultLocale)

export const useSystemPagesDictionary = () => {
  const params = useParams()

  return getSystemPagesDictionary(getLocale(params?.lang))
}

export const SystemPage = ({ children, description, icon: Icon, title }) => (
  <main className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 text-center dark:bg-slate-950'>
    <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,color-mix(in_srgb,var(--primary-color)_10%,transparent),transparent_34rem)] dark:bg-[radial-gradient(circle_at_50%_35%,color-mix(in_srgb,var(--primary-color)_18%,transparent),transparent_34rem)]' />
    <section className='relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900'>
      <div className='mx-auto mb-5 flex size-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'>
        <Icon className='size-16' aria-hidden='true' />
      </div>
      <h1 className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>{title}</h1>
      <p className='mx-auto mt-3 max-w-md text-base leading-7 text-slate-500 dark:text-slate-400'>{description}</p>
      {children}
    </section>
  </main>
)

export const HomeLink = () => {
  const params = useParams()
  const dictionary = useSystemPagesDictionary()
  const lang = getLocale(params?.lang)

  return (
    <Link
      href={`/${lang}/dashboard`}
      className={`${actionClassName} bg-primary text-white shadow-sm hover:opacity-90 cursor-pointer`}
    >
      <Home className='size-4' aria-hidden='true' />
      {dictionary.actions.backToHome}
    </Link>
  )
}

export const GoBackButton = () => {
  const router = useRouter()
  const dictionary = useSystemPagesDictionary()

  return (
    <button
      type='button'
      onClick={() => router.back()}
      className={`${actionClassName} border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer`}
    >
      <ArrowLeft className='size-4' aria-hidden='true' />
      {dictionary.actions.goBack}
    </button>
  )
}

export const RetryButton = ({ reset }) => {
  const dictionary = useSystemPagesDictionary()
  const [isPending, startTransition] = useTransition()

  const retry = () => startTransition(() => reset())

  return (
    <button
      type='button'
      onClick={retry}
      disabled={isPending}
      aria-busy={isPending}
      className={`${actionClassName} bg-primary text-white shadow-sm hover:opacity-90 disabled:cursor-wait disabled:opacity-80`}
    >
      {isPending ? <LoaderCircle className='size-4 animate-spin' aria-hidden='true' /> : <RotateCcw className='size-4' aria-hidden='true' />}
      {dictionary.actions.tryAgain}
    </button>
  )
}

export const SwitchAccountButton = () => {
  const router = useRouter()
  const params = useParams()
  const dictionary = useSystemPagesDictionary()
  const lang = getLocale(params?.lang)

  return (
    <button
      type='button'
      onClick={() => router.push(`/${lang}/login`)}
      className={`${actionClassName} border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}
    >
      <LogOut className='size-4' aria-hidden='true' />
      {dictionary.actions.switchAccount}
    </button>
  )
}

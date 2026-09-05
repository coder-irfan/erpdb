'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import classnames from 'classnames'

import LanguageDropdown from '@components/layout/shared/LanguageDropdown'
import CurrencyDropdown from '@components/layout/shared/CurrencyDropdown'
import Logo from '@components/layout/shared/Logo'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import NotificationsDropdown from '@components/layout/shared/NotificationsDropdown'
import NavSearch from '@components/layout/shared/search'
import UserDropdown from '@components/layout/shared/UserDropdown'
import { LayoutToggle } from '@components/layout/shared/LayoutControls'
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'
import { getLocalizedUrl } from '@/utils/i18n'

import NavToggle from './NavToggle'

const NavbarContent = ({ dictionary }) => {
  const { lang: locale } = useParams()

  return (
    <div className={classnames(horizontalLayoutClasses.navbarContent, 'flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-4 is-full')}>
      <div className='flex items-center gap-4'>
        <NavToggle />
        <Link className='hidden lg:flex' href={getLocalizedUrl('/dashboard', locale)}><Logo /></Link>
      </div>
      <div className='flex shrink-0 flex-wrap items-center justify-end gap-0.5'>
        <NavSearch dictionary={dictionary} />
        <LayoutToggle />
        <LanguageDropdown />
        <CurrencyDropdown />
        <ModeDropdown />
        <NotificationsDropdown dictionary={dictionary.notifications} />
        <UserDropdown dictionary={dictionary} />
      </div>
    </div>
  )
}

export default NavbarContent

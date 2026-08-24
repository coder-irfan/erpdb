'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import classnames from 'classnames'

import LanguageDropdown from '@components/layout/shared/LanguageDropdown'
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
    <div className={classnames(horizontalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-4'>
        <NavToggle />
        <Link className='hidden lg:flex' href={getLocalizedUrl('/dashboard', locale)}><Logo /></Link>
      </div>
      <div className='flex items-center'>
        <LayoutToggle />
        <NavSearch dictionary={dictionary} />
        <LanguageDropdown />
        <ModeDropdown />
        <NotificationsDropdown dictionary={dictionary.notifications} />
        <UserDropdown dictionary={dictionary} />
      </div>
    </div>
  )
}

export default NavbarContent

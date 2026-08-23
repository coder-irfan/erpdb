'use client'

import classnames from 'classnames'

import LanguageDropdown from '@components/layout/shared/LanguageDropdown'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import NotificationsDropdown from '@components/layout/shared/NotificationsDropdown'
import NavSearch from '@components/layout/shared/search'
import UserDropdown from '@components/layout/shared/UserDropdown'
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

import NavToggle from './NavToggle'

const NavbarContent = ({ dictionary }) => (
  <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
    <div className='flex items-center gap-4'><NavToggle /><NavSearch dictionary={dictionary} /></div>
    <div className='flex items-center'>
      <LanguageDropdown />
      <ModeDropdown />
      <NotificationsDropdown dictionary={dictionary?.notifications} />
      <UserDropdown dictionary={dictionary} />
    </div>
  </div>
)

export default NavbarContent

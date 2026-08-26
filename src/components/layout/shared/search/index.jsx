'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import { useParams, useRouter, usePathname } from 'next/navigation'

// MUI Imports
import IconButton from '@mui/material/IconButton'

// Third-party Imports
import classnames from 'classnames'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk'
import { useSession } from 'next-auth/react'
import { Title, Description } from '@radix-ui/react-dialog'

// Component Imports
import NoResult from './NoResult'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'
import { filterNavByPermissions, flattenNavigationItems } from '@/utils/permissions'

// Style Imports
import './styles.css'

// Data Imports
import horizontalMenuData from '@/data/navigation/horizontalMenuData'

// SearchItem Component for introduce the shortcut keys
const SearchItem = ({ children, shortcut, value, currentPath, url, onSelect = () => {} }) => {
  return (
    <CommandItem
      onSelect={onSelect}
      value={value}
      className={classnames('mli-2 my-2 rounded py-3 sm:py-4', {
        'active-searchItem': currentPath === url
      })}
    >
      {children}
      {shortcut && (
        <div cmdk-vercel-shortcuts=''>
          {shortcut.split(' ').map(key => {
            return <kbd key={key}>{key}</kbd>
          })}
        </div>
      )}
    </CommandItem>
  )
}

// Helper function to filter and limit results per section based on the number of sections
const getFilteredResults = sections => {
  const limit = sections.length > 1 ? 3 : 5

  return sections.map(section => ({
    ...section,
    items: section.items.slice(0, limit)
  }))
}

const groupNavigationItems = menuData =>
  flattenNavigationItems(menuData).reduce((sections, item) => {
    const sectionTitle = item.parentLabels[0] || item.label
    const existingSection = sections.find(section => section.title === sectionTitle)

    const searchItem = {
      breadcrumb: item.breadcrumb,
      icon: item.icon,
      id: item.href,
      name: item.label,
      url: item.href
    }

    if (existingSection) {
      existingSection.items.push(searchItem)
    } else {
      sections.push({ title: sectionTitle, items: [searchItem] })
    }

    return sections
  }, [])

// Footer component for the search menu
const CommandFooter = () => {
  return (
    <div cmdk-footer=''>
      <div className='flex items-center gap-1'>
        <kbd>
          <i className='tabler-arrow-up text-base' />
        </kbd>
        <kbd>
          <i className='tabler-arrow-down text-base' />
        </kbd>
        <span>to navigate</span>
      </div>
      <div className='flex items-center gap-1'>
        <kbd>
          <i className='tabler-corner-down-left text-base' />
        </kbd>
        <span>to open</span>
      </div>
      <div className='flex items-center gap-1'>
        <kbd>esc</kbd>
        <span>to close</span>
      </div>
    </div>
  )
}

const NavSearch = ({ dictionary }) => {
  // States
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Hooks
  const router = useRouter()
  const pathName = usePathname()
  const { settings } = useSettings()
  const { lang: locale } = useParams()
  const { isBreakpointReached } = useVerticalNav()
  const { data: session } = useSession()

  const transformedData = useMemo(() => {
    if (!dictionary) return []

    const filteredMenuData = filterNavByPermissions(
      horizontalMenuData(dictionary),
      session?.user?.permissions,
      session?.user?.roles
    )

    return groupNavigationItems(filteredMenuData)
  }, [dictionary, session?.user?.permissions, session?.user?.roles])

  // When an item is selected from the search results
  const onSearchItemSelect = item => {
    item.url.startsWith('http')
      ? window.open(item.url, '_blank')
      : router.push(item.excludeLang ? item.url : getLocalizedUrl(item.url, locale))
    setOpen(false)
  }

  // Filter the data based on the search query
  const filteredData = (sections, query) => {
    const searchQuery = query.trim().toLowerCase()

    return sections
      .filter(section => {
        const sectionMatches = section.title.toLowerCase().includes(searchQuery)

        const itemsMatch = section.items.some(
          item =>
            item.name.toLowerCase().includes(searchQuery) ||
            item.breadcrumb.toLowerCase().includes(searchQuery) ||
            (item.shortcut && item.shortcut.toLowerCase().includes(searchQuery))
        )

        return sectionMatches || itemsMatch
      })
      .map(section => ({
        ...section,
        items: section.items.filter(
          item =>
            section.title.toLowerCase().includes(searchQuery) ||
            item.name.toLowerCase().includes(searchQuery) ||
            item.breadcrumb.toLowerCase().includes(searchQuery) ||
            (item.shortcut && item.shortcut.toLowerCase().includes(searchQuery))
        )
      }))
  }

  const limitedData = getFilteredResults(filteredData(transformedData, searchValue))

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = e => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }

    document.addEventListener('keydown', down)

    return () => document.removeEventListener('keydown', down)
  }, [])

  // Reset the search value when the menu is closed
  useEffect(() => {
    if (!open && searchValue !== '') {
      setSearchValue('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      {isBreakpointReached || settings.layout === 'horizontal' ? (
        <IconButton className='text-textPrimary' onClick={() => setOpen(true)}>
          <i className='tabler-search text-2xl' />
        </IconButton>
      ) : (
        <div className='cursor-pointer' onClick={() => setOpen(true)}>
          <IconButton className='text-textPrimary' onClick={() => setOpen(true)}>
            <i className='tabler-search text-2xl' />
          </IconButton>
        </div>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className='flex items-center justify-between border-be pli-4 plb-3 gap-2'>
          <Title hidden />
          <Description hidden />
          <i className='tabler-search' />
          <CommandInput value={searchValue} onValueChange={setSearchValue} />
          <span className='text-textDisabled'>[esc]</span>
          <i className='tabler-x cursor-pointer' onClick={() => setOpen(false)} />
        </div>
        <CommandList>
          {limitedData.length > 0 ? (
            limitedData.map(section => (
              <CommandGroup key={section.title} heading={section.title.toUpperCase()} className='my-2 px-1 text-xs'>
                {section.items.map(item => (
                  <SearchItem
                    shortcut={item.shortcut}
                    key={item.id}
                    currentPath={pathName}
                    url={getLocalizedUrl(item.url, locale)}
                    value={[item.name, item.breadcrumb, section.title, item.shortcut].filter(Boolean).join(' ')}
                    onSelect={() => onSearchItemSelect(item)}
                  >
                    {item.icon && <i className={classnames('text-xl', item.icon)} />}
                    <div className='flex min-is-0 flex-col'>
                      <span>{item.name}</span>
                      {item.breadcrumb !== item.name && (
                        <span className='truncate text-xs text-textDisabled'>{item.breadcrumb}</span>
                      )}
                    </div>
                  </SearchItem>
                ))}
              </CommandGroup>
            ))
          ) : (
            <CommandEmpty>
              <NoResult searchValue={searchValue} setOpen={setOpen} />
            </CommandEmpty>
          )}
        </CommandList>
        <CommandFooter />
      </CommandDialog>
    </>
  )
}

export default NavSearch

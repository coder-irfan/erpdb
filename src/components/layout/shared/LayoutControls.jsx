'use client'

import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useLayoutPreference } from '@/contexts/layoutPreferenceContext'

export const LayoutToggle = () => {
  const { layout, toggleLayout } = useLayoutPreference()
  const showSidebar = layout === 'topbar'
  const label = showSidebar ? 'Use sidebar navigation' : 'Use top navigation'

  return (
    <Tooltip title={label} arrow>
      <IconButton color='inherit' className='hidden lg:inline-flex' aria-label={label} onClick={toggleLayout}>
        <i className={showSidebar ? 'tabler-layout-sidebar-left-expand' : 'tabler-layout-navbar-expand'} />
      </IconButton>
    </Tooltip>
  )
}

export const SidebarCollapseToggle = () => {
  const { isCollapsed, toggleCollapsed } = useLayoutPreference()
  const { collapseVerticalNav } = useVerticalNav()
  const label = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'

  const handleClick = () => {
    collapseVerticalNav(!isCollapsed)
    toggleCollapsed()
  }

  return (
    <Tooltip title={label} arrow>
      <IconButton color='inherit' className='hidden lg:inline-flex' aria-label={label} onClick={handleClick}>
        <i className={isCollapsed ? 'tabler-layout-sidebar-left-expand' : 'tabler-layout-sidebar-left-collapse'} />
      </IconButton>
    </Tooltip>
  )
}

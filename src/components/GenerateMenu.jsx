// React Imports
import { forwardRef } from 'react'

// Next Imports
import { useParams } from 'next/navigation'

// MUI Imports
import Tooltip from '@mui/material/Tooltip'
import { useTheme } from '@mui/material/styles'

// Component Imports
import { SubMenu as HorizontalSubMenu, MenuItem as HorizontalMenuItem } from '@menu/horizontal-menu'
import { SubMenu as VerticalSubMenu, MenuItem as VerticalMenuItem, MenuSection } from '@menu/vertical-menu'
import CustomChip from '@core/components/mui/Chip'
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

const MiniSidebarTooltipItem = forwardRef(({ menuItemProps, children, ...tooltipProps }, ref) => (
  <VerticalMenuItem ref={ref} {...menuItemProps} tooltipProps={tooltipProps}>
    {children}
  </VerticalMenuItem>
))

MiniSidebarTooltipItem.displayName = 'MiniSidebarTooltipItem'

// Generate a menu from the menu data array
export const GenerateVerticalMenu = ({ menuData }) => {
  // Hooks
  const { lang: locale } = useParams()
  const theme = useTheme()
  const { isCollapsed, isHovered } = useVerticalNav()

  const renderMenuItems = (data, level = 0) => {
    // Use the map method to iterate through the array of menu data
    return data.map((item, index) => {
      const menuSectionItem = item
      const subMenuItem = item
      const menuItem = item

      // Check if the current item is a section
      if (menuSectionItem.isSection) {
        const { children, isSection, permission, ...rest } = menuSectionItem

        // If it is, return a MenuSection component and call generateMenu with the current menuSectionItem's children
        return (
          <MenuSection key={index} {...rest}>
            {children && renderMenuItems(children, level + 1)}
          </MenuSection>
        )
      }

      // Check if the current item is a sub menu
      if (subMenuItem.children) {
        const { children, icon, permission, prefix, suffix, ...rest } = subMenuItem
        const Icon = icon ? <i className={icon} /> : null
        const subMenuPrefix = prefix && prefix.label ? <CustomChip size='small' round='true' {...prefix} /> : prefix
        const subMenuSuffix = suffix && suffix.label ? <CustomChip size='small' round='true' {...suffix} /> : suffix

        // If it is, return a SubMenu component and call generateMenu with the current subMenuItem's children
        return (
          <VerticalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
          {children && renderMenuItems(children, level + 1)}
          </VerticalSubMenu>
        )
      }

      // If the current item is neither a section nor a sub menu, return a MenuItem component
      const { label, excludeLang, icon, permission, prefix, suffix, ...rest } = menuItem

      // Localize the href
      const href = rest.href?.startsWith('http')
        ? rest.href
        : rest.href && (excludeLang ? rest.href : getLocalizedUrl(rest.href, locale))

      const Icon = icon ? <i className={icon} /> : null
      const menuItemPrefix = prefix && prefix.label ? <CustomChip size='small' round='true' {...prefix} /> : prefix
      const menuItemSuffix = suffix && suffix.label ? <CustomChip size='small' round='true' {...suffix} /> : suffix

      const menuItemProps = {
        prefix: menuItemPrefix,
        suffix: menuItemSuffix,
        ...rest,
        href,
        ...(Icon && { icon: Icon })
      }

      return isCollapsed && !isHovered && level === 0 ? (
        <Tooltip key={index} title={label} placement={theme.direction === 'rtl' ? 'left' : 'right'} arrow>
          <MiniSidebarTooltipItem menuItemProps={menuItemProps}>{label}</MiniSidebarTooltipItem>
        </Tooltip>
      ) : (
        <VerticalMenuItem key={index} {...menuItemProps}>
          {label}
        </VerticalMenuItem>
      )
    })
  }

  return <>{renderMenuItems(menuData)}</>
}

// Generate a menu from the menu data array
export const GenerateHorizontalMenu = ({ menuData }) => {
  // Hooks
  const { lang: locale } = useParams()

  const renderMenuItems = data => {
    // Use the map method to iterate through the array of menu data
    return data.map((item, index) => {
      const subMenuItem = item
      const menuItem = item

      // Check if the current item is a sub menu
      if (subMenuItem.children) {
        const { children, icon, permission, prefix, suffix, ...rest } = subMenuItem
        const Icon = icon ? <i className={icon} /> : null
        const subMenuPrefix = prefix && prefix.label ? <CustomChip size='small' round='true' {...prefix} /> : prefix
        const subMenuSuffix = suffix && suffix.label ? <CustomChip size='small' round='true' {...suffix} /> : suffix

        // If it is, return a SubMenu component and call generateMenu with the current subMenuItem's children
        return (
          <HorizontalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
            {children && renderMenuItems(children)}
          </HorizontalSubMenu>
        )
      }

      // If the current item is not a sub menu, return a MenuItem component
      const { label, excludeLang, icon, permission, prefix, suffix, ...rest } = menuItem

      // Localize the href
      const href = rest.href?.startsWith('http')
        ? rest.href
        : rest.href && (excludeLang ? rest.href : getLocalizedUrl(rest.href, locale))

      const Icon = icon ? <i className={icon} /> : null
      const menuItemPrefix = prefix && prefix.label ? <CustomChip size='small' round='true' {...prefix} /> : prefix
      const menuItemSuffix = suffix && suffix.label ? <CustomChip size='small' round='true' {...suffix} /> : suffix

      return (
        <HorizontalMenuItem
          key={index}
          prefix={menuItemPrefix}
          suffix={menuItemSuffix}
          {...rest}
          href={href}
          {...(Icon && { icon: Icon })}
        >
          {label}
        </HorizontalMenuItem>
      )
    })
  }

  return <>{renderMenuItems(menuData)}</>
}

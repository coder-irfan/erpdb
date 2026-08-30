const SUPER_ADMIN_ROLES = new Set(['Super Admin', 'super_admin'])

const normalizePermissions = userPermissions => {
  if (userPermissions instanceof Set) return userPermissions

  return new Set(Array.isArray(userPermissions) ? userPermissions : [])
}

const hasSuperAdminRole = userRole => {
  const roles = Array.isArray(userRole) ? userRole : [userRole]

  return roles.some(role => SUPER_ADMIN_ROLES.has(role))
}

const hasNavigationPermission = (permissions, requiredPermission) => {
  if (!requiredPermission || permissions.has(requiredPermission)) return Boolean(requiredPermission)

  const [resource, action] = requiredPermission.split(':')
  const moduleName = resource?.split('_')[0]
  const globalPermission = moduleName && action ? `${moduleName}:${action}` : null

  if (globalPermission && permissions.has(globalPermission)) return true

  return [...permissions].some(permission => permission.startsWith(`${requiredPermission}_`))
}

export const filterNavByPermissions = (menuData, userPermissions, userRole) => {
  if (!Array.isArray(menuData)) return []
  if (hasSuperAdminRole(userRole)) return menuData

  const permissions = normalizePermissions(userPermissions)

  return menuData.reduce((filteredItems, item) => {
    if (Array.isArray(item.children)) {
      const children = filterNavByPermissions(item.children, permissions, userRole)

      if (children.length > 0) filteredItems.push({ ...item, children })

      return filteredItems
    }

    if (Array.isArray(item.roles)) {
      const roles = Array.isArray(userRole) ? userRole : [userRole]

      if (!item.roles.some(role => roles.includes(role))) return filteredItems
    }

    if (hasNavigationPermission(permissions, item.permission)) filteredItems.push(item)

    return filteredItems
  }, [])
}

export const flattenNavigationItems = (menuData, parentLabels = [], inheritedIcon = null) => {
  if (!Array.isArray(menuData)) return []

  return menuData.flatMap(item => {
    const icon = item.icon || inheritedIcon
    const labels = [...parentLabels, item.label]

    if (Array.isArray(item.children)) {
      return flattenNavigationItems(item.children, labels, icon)
    }

    if (!item.href) return []

    return [
      {
        breadcrumb: labels.join(' / '),
        href: item.href,
        icon,
        label: item.label,
        parentLabels,
        permission: item.permission
      }
    ]
  })
}

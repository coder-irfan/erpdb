const hasSuperAdminRole = session => session?.user?.roles?.includes('super_admin') === true

export const hasPermission = (session, requiredPermissionKey) => {
  if (!requiredPermissionKey) return false

  return hasSuperAdminRole(session) || session?.user?.permissions?.includes(requiredPermissionKey) === true
}

export const hasAnyPermission = (session, permissionKeys) => {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return false

  return hasSuperAdminRole(session) || permissionKeys.some(permission => hasPermission(session, permission))
}

export const hasAllPermissions = (session, permissionKeys) => {
  if (!Array.isArray(permissionKeys)) return false

  return hasSuperAdminRole(session) || permissionKeys.every(permission => hasPermission(session, permission))
}

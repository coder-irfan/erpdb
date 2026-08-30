const hasSuperAdminRole = session => session?.user?.roles?.includes('super_admin') === true
const PAYROLL_PAYOUT_ROLES = new Set(['super_admin', 'admin', 'finance_manager'])
const ATTENDANCE_PAYROLL_OVERRIDE_ROLES = new Set(['super_admin', 'hr_admin'])

export const hasAttendancePayrollOverrideRole = session =>
  (session?.user?.roles || []).some(role =>
    ATTENDANCE_PAYROLL_OVERRIDE_ROLES.has(String(role).trim().toLowerCase().replace(/[\s-]+/g, '_'))
  )

export const hasPayrollPayoutRole = session =>
  (session?.user?.roles || []).some(role => PAYROLL_PAYOUT_ROLES.has(String(role).toLowerCase()))

const permissionAliases = {
  'finance_salary:read': ['hrm_payroll:read'],
  'finance_salary:write': ['hrm_payroll:write'],
  'finance_salary:delete': ['hrm_payroll:delete']
}

export const hasPermission = (session, requiredPermissionKey) => {
  if (!requiredPermissionKey) return false

  const permissions = session?.user?.permissions || []

  return hasSuperAdminRole(session) || permissions.includes(requiredPermissionKey) || permissionAliases[requiredPermissionKey]?.some(permission => permissions.includes(permission)) === true
}

export const hasAnyPermission = (session, permissionKeys) => {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return false

  return hasSuperAdminRole(session) || permissionKeys.some(permission => hasPermission(session, permission))
}

export const hasAllPermissions = (session, permissionKeys) => {
  if (!Array.isArray(permissionKeys)) return false

  return hasSuperAdminRole(session) || permissionKeys.every(permission => hasPermission(session, permission))
}

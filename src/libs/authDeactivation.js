export const USER_DEACTIVATED_CODE = 'USER_DEACTIVATED'

export const USER_DEACTIVATED_MESSAGE =
  'Your account has been deactivated. Please contact your administrator.'

export const isAccessDeactivated = user =>
  Boolean(user && (user.account_status !== 'ACTIVE' || (user.staff && user.staff.status !== 'ACTIVE')))

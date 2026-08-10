'use client'

// Third-party Imports
import { useSession } from 'next-auth/react'

// Util Imports
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/utils/rbac'

const Can = ({ permission, anyOf, allOf, fallback = null, children }) => {
  const { data: session, status } = useSession()

  if (status === 'loading') return fallback

  let isAllowed = false

  if (permission) {
    isAllowed = hasPermission(session, permission)
  } else if (Array.isArray(anyOf)) {
    isAllowed = hasAnyPermission(session, anyOf)
  } else if (Array.isArray(allOf)) {
    isAllowed = hasAllPermissions(session, allOf)
  }

  return isAllowed ? children : fallback
}

export default Can

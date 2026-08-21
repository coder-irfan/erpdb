'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomAvatar from '@core/components/mui/Avatar'
import { createRole, deleteRole, toggleRoleStatus, updateRolePermissions } from '@/app/actions/roleActions'
import {
  assignUserRole,
  inviteUser,
  removeUserAccess,
  revokeUserInvitation,
  updateUserStatus
} from '@/app/actions/userActions'
import ConfirmDeleteModal from '@/components/dialogs/ConfirmDeleteModal'

import CreateRoleDialog from './CreateRoleDialog'
import InviteUserDialog from './InviteUserDialog'
import PermissionDrawer from './PermissionDrawer'
import UsersTable from './UsersTable'

const replaceCount = (value, count) => value.replace('{count}', String(count))

const RolesPermissionsView = ({
  dictionary,
  locale,
  initialRoles,
  permissionGroups,
  initialUsers,
  initialStaff,
  initialError
}) => {
  const [roles, setRoles] = useState(initialRoles)
  const [users, setUsers] = useState(initialUsers)
  const [staff, setStaff] = useState(initialStaff)
  const [permissionRole, setPermissionRole] = useState(null)
  const [createRoleOpen, setCreateRoleOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busyRoleId, setBusyRoleId] = useState(null)
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [isDeletingRole, setIsDeletingRole] = useState(false)

  const activeRoles = roles.filter(role => role.isActive)

  const runAction = async (action, fallbackError) => {
    try {
      return await action()
    } catch {
      return { success: false, error: fallbackError }
    }
  }

  const handlePermissionSave = async (roleId, permissionIds) => {
    const result = await runAction(
      () => updateRolePermissions({ roleId, permissionIds, locale }),
      dictionary.messages.operationFailed
    )

    if (!result.success) {
      toast.error(result.error)

      return false
    }

    setRoles(current => current.map(role => (role.id === roleId ? result.data : role)))
    toast.success(result.message)

    return true
  }

  const handleRoleCreate = async values => {
    const result = await runAction(() => createRole({ ...values, locale }), dictionary.messages.operationFailed)

    if (!result.success) {
      toast.error(result.error)

      return false
    }

    setRoles(current =>
      [...current, result.data].sort((first, second) => first.displayName.localeCompare(second.displayName))
    )
    toast.success(result.message)

    return true
  }

  const handleRoleStatusChange = async role => {
    setBusyRoleId(role.id)

    const result = await runAction(
      () => toggleRoleStatus({ roleId: role.id, isActive: !role.isActive, locale }),
      dictionary.messages.operationFailed
    )

    if (!result.success) toast.error(result.error)
    else {
      setRoles(current => current.map(item => (item.id === role.id ? result.data : item)))
      toast.success(result.message)
    }

    setBusyRoleId(null)
  }

  const handleRoleDelete = async () => {
    if (!roleToDelete) return

    setIsDeletingRole(true)

    const result = await runAction(
      () => deleteRole({ roleId: roleToDelete.id, locale }),
      dictionary.messages.operationFailed
    )

    if (!result.success) toast.error(result.error)
    else {
      setRoles(current => current.filter(role => role.id !== roleToDelete.id))
      setRoleToDelete(null)
      toast.success(result.message)
    }

    setIsDeletingRole(false)
  }

  const handleInvite = async values => {
    const result = await runAction(() => inviteUser({ ...values, locale }), dictionary.messages.operationFailed)

    if (!result.success) {
      toast.error(result.error)

      return false
    }

    setUsers(current => [result.data.user, ...current])

    if (values.staffId) setStaff(current => current.filter(employee => employee.id !== values.staffId))

    toast.success(result.message)

    return true
  }

  const handleStatusChange = async (userId, status) => {
    const result = await runAction(
      () => updateUserStatus({ userId, status, locale }),
      dictionary.messages.operationFailed
    )

    if (!result.success) {
      toast.error(result.error)

      return false
    }

    setUsers(current => current.map(user => (user.id === userId ? result.data : user)))
    toast.success(result.message)

    return true
  }

  const handleRoleChange = async (userId, roleId) => {
    const result = await runAction(
      () => assignUserRole({ userId, roleId, locale }),
      dictionary.messages.operationFailed
    )

    if (!result.success) {
      toast.error(result.error)

      return false
    }

    setUsers(current => current.map(user => (user.id === userId ? result.data : user)))
    toast.success(result.message)

    return true
  }

  const handleInvitationRevoke = async userId => {
    const result = await runAction(
      () => revokeUserInvitation({ userId, locale }),
      dictionary.messages.operationFailed
    )

    if (!result.success) {
      toast.error(result.error)

      return false
    }

    setUsers(current => current.map(user => (user.id === userId ? result.data : user)))
    toast.success(result.message)

    return true
  }

  const handleUserAccessRemove = async userId => {
    const result = await runAction(
      () => removeUserAccess({ userId, locale }),
      dictionary.messages.operationFailed
    )

    if (!result.success) {
      toast.error(result.error)

      return false
    }

    setUsers(current => current.map(user => (user.id === userId ? result.data : user)))
    toast.success(result.message)

    return true
  }

  return (
    <div className='flex flex-col md:gap-4 gap-2'>
      {initialError && <Alert severity='error'>{initialError}</Alert>}

      <div className='flex justify-end'>
        <Button
          variant='contained'
          startIcon={<i className='tabler-shield-plus' />}
          onClick={() => setCreateRoleOpen(true)}
        >
          {dictionary.createRole}
        </Button>
      </div>

      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3'>
        {roles.map(role => {
          const assignedUsers = users.filter(user => user.roles.some(userRole => userRole.id === role.id)).length
          const isProtected = role.name === 'super_admin'

          return (
            <Card key={role.id} className='h-full'>
              <CardContent className='flex h-full flex-col gap-4'>
                <div className='flex items-start justify-between gap-3'>
                  <CustomAvatar skin='light' color={isProtected ? 'primary' : 'info'} size={44}>
                    <i className={isProtected ? 'tabler-crown' : 'tabler-shield-check'} />
                  </CustomAvatar>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={role.isSystem ? 'primary' : 'secondary'}
                    label={role.isSystem ? dictionary.systemRole : dictionary.customRole}
                  />
                </div>
                <div>
                  <Typography variant='h5'>{role.displayName}</Typography>
                  <Typography color='text.secondary'>{role.description}</Typography>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={role.isActive ? 'success' : 'secondary'}
                    label={role.isActive ? dictionary.activeRole : dictionary.inactiveRole}
                  />
                  <Chip
                    size='small'
                    icon={<i className='tabler-users' />}
                    label={replaceCount(dictionary.usersAssigned, assignedUsers)}
                  />
                  <Chip
                    size='small'
                    icon={<i className='tabler-key' />}
                    label={replaceCount(dictionary.permissionsAssigned, role.permissions.length)}
                  />
                </div>
                {isProtected && (
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.protectedRole}
                  </Typography>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      color={role.isActive ? 'primary' : 'secondary'}
                      checked={role.isActive}
                      onChange={() => handleRoleStatusChange(role)}
                      disabled={isProtected || busyRoleId === role.id}
                    />
                  }
                  label={role.isActive ? dictionary.activeRole : dictionary.inactiveRole}
                />
                <div className='mt-auto flex flex-wrap gap-2'>
                  <Button
                    variant='tonal'
                    startIcon={<i className='tabler-edit' />}
                    disabled={isProtected}
                    onClick={() => setPermissionRole(role)}
                  >
                    {dictionary.editPermissions}
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant='tonal'
                      color='error'
                      startIcon={<i className='tabler-trash' />}
                      disabled={assignedUsers > 0 || busyRoleId === role.id}
                      onClick={() => setRoleToDelete(role)}
                    >
                      {dictionary.deleteRole}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <UsersTable
        users={users}
        roles={activeRoles}
        locale={locale}
        onInvite={() => setInviteOpen(true)}
        onStatusChange={handleStatusChange}
        onRoleChange={handleRoleChange}
        onInvitationRevoke={handleInvitationRevoke}
        onUserAccessRemove={handleUserAccessRemove}
        translations={dictionary}
      />

      <PermissionDrawer
        open={Boolean(permissionRole)}
        role={permissionRole}
        groups={permissionGroups}
        onClose={() => setPermissionRole(null)}
        onSave={handlePermissionSave}
        translations={dictionary}
      />

      <CreateRoleDialog
        open={createRoleOpen}
        groups={permissionGroups}
        onClose={() => setCreateRoleOpen(false)}
        onSubmit={handleRoleCreate}
        translations={dictionary}
      />

      <InviteUserDialog
        open={inviteOpen}
        roles={activeRoles}
        staff={staff}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
        translations={dictionary}
      />

      <ConfirmDeleteModal
        open={Boolean(roleToDelete)}
        title={dictionary.deleteRole}
        description={dictionary.deleteRoleConfirmation}
        itemName={roleToDelete?.displayName}
        confirmText={dictionary.deleteRole}
        cancelText={dictionary.cancel}
        loading={isDeletingRole}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleRoleDelete}
      />
    </div>
  )
}

export default RolesPermissionsView

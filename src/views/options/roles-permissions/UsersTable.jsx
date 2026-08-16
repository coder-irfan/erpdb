'use client'

import { useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import DashboardTablePagination from '@/components/table/DashboardTablePagination'
import TableEmptyStateRow from '@/components/table/TableEmptyStateRow'
import { getInitials } from '@/utils/getInitials'

import tableStyles from '@core/styles/table.module.css'

const STATUS_COLORS = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'error',
  PENDING_ACTIVATION: 'warning'
}

const formatDate = (value, locale) => {
  const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

  try {
    return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return new Date(value).toLocaleDateString()
  }
}

const UsersTable = ({ users, roles, locale, onInvite, onStatusChange, onRoleChange, translations }) => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [busyUserId, setBusyUserId] = useState(null)
  const [roleUser, setRoleUser] = useState(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [isRoleSaving, setIsRoleSaving] = useState(false)

  const currentUserIsSuperAdmin = users.some(user => user.isCurrentUser && user.isSuperAdmin)
  const assignableRoles = currentUserIsSuperAdmin ? roles : roles.filter(role => role.name !== 'super_admin')

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    if (!query) return users

    return users.filter(user =>
      [
        user.name,
        user.email,
        user.status,
        user.invitedBy?.name,
        user.staff?.name,
        ...user.roles.map(role => role.displayName)
      ]
        .filter(Boolean)
        .some(value => value.toLocaleLowerCase().includes(query))
    )
  }, [search, users])

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const handleStatusChange = async (userId, status) => {
    setBusyUserId(userId)

    try {
      await onStatusChange(userId, status)
    } finally {
      setBusyUserId(null)
    }
  }

  const openRoleDialog = user => {
    setRoleUser(user)
    setSelectedRoleId(user.roles[0]?.id ?? '')
  }

  const closeRoleDialog = () => {
    if (!isRoleSaving) setRoleUser(null)
  }

  const saveRole = async () => {
    if (!roleUser || !selectedRoleId) return

    setIsRoleSaving(true)

    try {
      const succeeded = await onRoleChange(roleUser.id, selectedRoleId)

      if (succeeded) setRoleUser(null)
    } finally {
      setIsRoleSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title={translations.usersTitle}
          subheader={translations.usersDescription}
        />
        <CardContent className='border-bs border-divider'>
          <div className='mb-4 mt-5 flex flex-wrap items-center justify-between gap-4'>
            <CustomTextField
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(0)
              }}
              placeholder={translations.searchUsers}
              className='is-full sm:is-[260px]'
              slotProps={{ input: { startAdornment: <i className='tabler-search me-2 text-textSecondary' /> } }}
            />
            <Button
              variant='contained'
              startIcon={<i className='tabler-user-plus' />}
              onClick={onInvite}
              className='is-full sm:is-auto'
            >
              {translations.inviteUser}
            </Button>
          </div>
        </CardContent>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{translations.table.user}</th>
                <th>{translations.table.role}</th>
                <th>{translations.table.status}</th>
                <th>{translations.table.invitedDate}</th>
                <th>{translations.table.invitedBy}</th>
                <th className='text-right'>{translations.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={6}
                  icon='tabler-users-plus'
                  title={translations.noUsers}
                  description={translations.usersDescription}
                  actionLabel={translations.inviteUser}
                  onAction={onInvite}
                />
              ) : (
                paginatedUsers.map(user => {
                  const protectedUser = user.isCurrentUser || user.isSuperAdmin
                  const currentStatusIsSelectable = ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(user.status)

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className='flex min-is-[220px] items-center gap-3'>
                          <CustomAvatar src={user.image || undefined} skin='light' color='primary' size={38}>
                            {!user.image && getInitials(user.name || user.email || '?')}
                          </CustomAvatar>
                          <div className='flex flex-col'>
                            <Typography color='text.primary' className='font-medium'>
                              {user.name || translations.table.notAssigned}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {user.email}
                            </Typography>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className='flex max-is-[220px] flex-wrap gap-1'>
                          {user.roles.length > 0 ? (
                            user.roles.map(role => (
                              <Chip
                                key={role.id}
                                size='small'
                                variant='tonal'
                                color={role.name === 'super_admin' ? 'primary' : 'info'}
                                label={role.displayName}
                              />
                            ))
                          ) : (
                            <Typography variant='body2'>{translations.table.notAssigned}</Typography>
                          )}
                        </div>
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={STATUS_COLORS[user.status] || 'default'}
                          label={translations.status[user.status] || user.status}
                        />
                      </td>
                      <td>{formatDate(user.createdAt, locale)}</td>
                      <td>{user.invitedBy?.name || translations.table.system}</td>
                      <td className='text-right'>
                        <div className='flex min-is-[210px] items-center justify-end gap-2'>
                          <CustomTextField
                            select
                            value={user.status}
                            onChange={event => handleStatusChange(user.id, event.target.value)}
                            disabled={protectedUser || busyUserId === user.id}
                            aria-label={translations.table.status}
                            className='is-[150px]'
                          >
                            {!currentStatusIsSelectable && (
                              <MenuItem value={user.status} disabled>
                                {translations.status[user.status] || user.status}
                              </MenuItem>
                            )}
                            {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(status => (
                              <MenuItem key={status} value={status}>
                                {translations.status[status]}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                          <Tooltip title={translations.editUserRole}>
                            <span>
                              <IconButton
                                disabled={protectedUser || busyUserId === user.id}
                                onClick={() => openRoleDialog(user)}
                              >
                                <i className='tabler-user-cog' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <DashboardTablePagination
          count={filteredUsers.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          rowsPerPageLabel={translations.rowsPerPage}
          ofLabel={translations.of}
        />
      </Card>

      <Dialog open={Boolean(roleUser)} onClose={closeRoleDialog} fullWidth maxWidth='xs'>
        <DialogTitle>{translations.editUserRole}</DialogTitle>
        <DialogContent dividers className='flex flex-col gap-4'>
          <Typography color='text.secondary'>{roleUser?.name || roleUser?.email}</Typography>
          <CustomTextField
            fullWidth
            select
            label={translations.inviteForm.role}
            value={selectedRoleId}
            onChange={event => setSelectedRoleId(event.target.value)}
            disabled={isRoleSaving}
          >
            {assignableRoles.map(role => (
              <MenuItem key={role.id} value={role.id}>
                {role.displayName}
              </MenuItem>
            ))}
          </CustomTextField>
        </DialogContent>
        <DialogActions className='p-5'>
          <Button variant='tonal' color='secondary' onClick={closeRoleDialog} disabled={isRoleSaving}>
            {translations.cancel}
          </Button>
          <Button variant='contained' onClick={saveRole} disabled={isRoleSaving || !selectedRoleId}>
            <LoadingButtonContent loading={isRoleSaving} loadingLabel={translations.saving}>
              {translations.saveRole}
            </LoadingButtonContent>
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default UsersTable

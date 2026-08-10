'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import LoadingButtonContent from '@/components/LoadingButtonContent'

import PermissionMatrix from './PermissionMatrix'

const replaceToken = (value, token, replacement) => value.replace(`{${token}}`, replacement)

const PermissionDrawer = ({ open, role, groups, onClose, onSave, translations }) => {
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setSelectedPermissionIds(role?.permissions?.map(permission => permission.id) ?? [])
  }, [role])

  const handleSave = async () => {
    if (!role) return

    setIsSaving(true)

    try {
      const succeeded = await onSave(role.id, selectedPermissionIds)

      if (succeeded) onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={isSaving ? undefined : onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 640, lg: 760 } } } }}
    >
      <div className='flex items-start justify-between gap-4 p-6'>
        <div>
          <Typography variant='h5'>{translations.permissionMatrix}</Typography>
          <Typography color='text.secondary'>
            {replaceToken(translations.permissionMatrixDescription, 'role', role?.displayName ?? '')}
          </Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSaving} aria-label={translations.close}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <Divider />
      <div className='grow overflow-y-auto p-6'>
        <PermissionMatrix
          groups={groups}
          selectedPermissionIds={selectedPermissionIds}
          onChange={setSelectedPermissionIds}
          translations={translations}
          disabled={isSaving}
        />
      </div>
      <Divider />
      <div className='flex justify-end gap-3 p-6'>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={isSaving}>
          {translations.cancel}
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={isSaving || role?.name === 'super_admin'}>
          <LoadingButtonContent loading={isSaving} loadingLabel={translations.saving}>
            {translations.savePermissions}
          </LoadingButtonContent>
        </Button>
      </div>
    </Drawer>
  )
}

export default PermissionDrawer

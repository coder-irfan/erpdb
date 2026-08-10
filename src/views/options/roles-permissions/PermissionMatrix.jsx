import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'

const PermissionMatrix = ({ groups, selectedPermissionIds, onChange, translations, disabled = false }) => {
  const selectedIds = new Set(selectedPermissionIds)

  const getPermissionLabel = permission => {
    const action = permission.key.split(':')[1]

    return translations.permissionLabels?.[permission.key] || translations.permissionActions?.[action] || translations.permissionFallback
  }

  const togglePermission = permissionId => {
    const nextIds = new Set(selectedIds)

    if (nextIds.has(permissionId)) nextIds.delete(permissionId)
    else nextIds.add(permissionId)

    onChange([...nextIds])
  }

  const toggleModule = permissions => {
    const nextIds = new Set(selectedIds)
    const allSelected = permissions.every(permission => nextIds.has(permission.id))

    permissions.forEach(permission => {
      if (allSelected) nextIds.delete(permission.id)
      else nextIds.add(permission.id)
    })

    onChange([...nextIds])
  }

  if (groups.length === 0) {
    return <Typography color='text.secondary'>{translations.noPermissions}</Typography>
  }

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      {groups.map(group => {
        const selectedCount = group.permissions.filter(permission => selectedIds.has(permission.id)).length
        const allSelected = selectedCount === group.permissions.length && group.permissions.length > 0

        return (
          <div key={group.module} className='rounded-lg border border-divider p-4'>
            <div className='mb-3 flex items-start justify-between gap-3'>
              <div>
                <Typography variant='h6'>
                  {translations.permissionModules?.[group.module] || translations.permissionModules?.Other}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {`${selectedCount}/${group.permissions.length}`}
                </Typography>
              </div>
              <FormControlLabel
                className='m-0'
                control={
                  <Checkbox
                    size='small'
                    checked={allSelected}
                    indeterminate={selectedCount > 0 && !allSelected}
                    disabled={disabled}
                    onChange={() => toggleModule(group.permissions)}
                  />
                }
                label={<Typography variant='caption'>{translations.selectModule}</Typography>}
              />
            </div>
            <div className='flex flex-col gap-1'>
              {group.permissions.map(permission => (
                <FormControlLabel
                  key={permission.id}
                  className='m-0 items-start'
                  control={
                    <Checkbox
                      size='small'
                      checked={selectedIds.has(permission.id)}
                      disabled={disabled}
                      onChange={() => togglePermission(permission.id)}
                    />
                  }
                  label={
                    <Typography variant='body2' color='text.primary' className='py-1'>
                      {getPermissionLabel(permission)}
                    </Typography>
                  }
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PermissionMatrix

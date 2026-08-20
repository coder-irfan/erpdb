'use client'

import { useId, useState } from 'react'

import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

const EntityActionsMenu = ({
  actions = [],
  statusOptions = [],
  currentStatus,
  onStatusChange,
  statusDisabled = false,
  changeStatusLabel = 'Change Status',
  moreActionsLabel = 'Actions'
}) => {
  const menuId = useId()
  const [anchorEl, setAnchorEl] = useState(null)
  const [statusAnchorEl, setStatusAnchorEl] = useState(null)

  const closeAll = () => {
    setStatusAnchorEl(null)
    setAnchorEl(null)
  }

  const visibleActions = actions.filter(Boolean)
  const hasStatuses = statusOptions.length > 0 && typeof onStatusChange === 'function'

  if (visibleActions.length === 0 && !hasStatuses) return null

  return (
    <>
      <Tooltip title={moreActionsLabel}>
        <span>
          <IconButton
            aria-label={moreActionsLabel}
            aria-controls={anchorEl ? menuId : undefined}
            aria-haspopup='menu'
            aria-expanded={anchorEl ? 'true' : undefined}
            onClick={event => {
              event.stopPropagation()
              setAnchorEl(event.currentTarget)
            }}
          >
            <i className='tabler-dots-vertical' />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeAll}
        onClick={event => event.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {visibleActions.map(action => (
          <MenuItem
            key={action.label}
            disabled={action.disabled}
            className={action.color === 'error' ? 'text-error' : undefined}
            onClick={() => {
              closeAll()
              action.onClick()
            }}
          >
            <i className={`${action.icon} mie-2 text-xl`} />
            {action.label}
          </MenuItem>
        ))}
        {visibleActions.length > 0 && hasStatuses && <Divider />}
        {hasStatuses && (
          <MenuItem
            disabled={statusDisabled}
            aria-haspopup='menu'
            aria-expanded={Boolean(statusAnchorEl)}
            onClick={event => setStatusAnchorEl(event.currentTarget)}
          >
            <i className='tabler-switch-horizontal mie-2 text-xl' />
            <span className='grow'>{changeStatusLabel}</span>
            <i className='tabler-chevron-right mis-4 text-lg rtl:rotate-180' />
          </MenuItem>
        )}
      </Menu>
      <Menu
        anchorEl={statusAnchorEl}
        open={Boolean(statusAnchorEl)}
        onClose={() => setStatusAnchorEl(null)}
        onClick={event => event.stopPropagation()}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {statusOptions.map(status => (
          <MenuItem
            key={status.id || status.value}
            selected={(status.id || status.value) === currentStatus}
            disabled={(status.id || status.value) === currentStatus}
            onClick={() => {
              closeAll()
              onStatusChange(status.id || status.value)
            }}
          >
            <i
              className={`tabler-check mie-2 text-lg ${(status.id || status.value) === currentStatus ? 'visible' : 'invisible'}`}
            />
            {status.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default EntityActionsMenu

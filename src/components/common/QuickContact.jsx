'use client'

import { useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'

const phoneForLink = value => String(value || '').replace(/[^\d]/g, '')

const QuickContact = ({ email, phone, children, className = '' }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const hasEmail = Boolean(email)
  const hasPhone = Boolean(phone)

  if (!hasEmail && !hasPhone) return children || null

  const close = () => setAnchorEl(null)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      // Clipboard access can be blocked by the browser; the mail action remains available.
    }

    close()
  }

  return (
    <>
      <span
        role='button'
        tabIndex={0}
        className={`inline-flex max-is-full cursor-pointer items-center gap-1 break-all text-primary hover:underline focus:outline-none ${className}`}
        onClick={event => {
          event.stopPropagation()
          setAnchorEl(event.currentTarget)
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setAnchorEl(event.currentTarget)
          }
        }}
      >
        {children || email || phone}
        <i className='tabler-dots-vertical text-sm' aria-hidden='true' />
      </span>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: { className: 'min-is-[190px] overflow-hidden rounded-lg border border-divider shadow-lg' }
        }}
      >
        {hasPhone && (
          <>
            <MenuItem
              component='a'
              href={`https://wa.me/${phoneForLink(phone)}`}
              target='_blank'
              rel='noreferrer'
              onClick={close}
            >
              <i className='tabler-brand-whatsapp mie-2 text-success' /> WhatsApp
            </MenuItem>
            <MenuItem component='a' href={`tel:${phone}`} onClick={close}>
              <i className='tabler-phone-call mie-2 text-primary' /> Call
            </MenuItem>
          </>
        )}
        {hasEmail && (
          <>
            <MenuItem component='a' href={`mailto:${email}`} onClick={close}>
              <i className='tabler-mail mie-2 text-primary' /> Email
            </MenuItem>
            <MenuItem onClick={copyEmail}>
              <i className='tabler-copy mie-2' /> Copy email
            </MenuItem>
          </>
        )}
      </Popover>
    </>
  )
}

export default QuickContact

'use client'

import { useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'

const phoneForLink = value => String(value || '').replace(/[^\d]/g, '')

const CONTACT_LABELS = {
  en: { whatsapp: 'WhatsApp', call: 'Call', email: 'Email', copy: 'Copy email' },
  ps: { whatsapp: 'واټس‌اپ', call: 'زنګ', email: 'برېښنالیک', copy: 'برېښنالیک کاپي کړئ' },
  fa: { whatsapp: 'واتساپ', call: 'تماس', email: 'ایمیل', copy: 'کپی ایمیل' }
}

const QuickContact = ({ email, phone, children, className = '', table = false }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const hasEmail = Boolean(email)
  const hasPhone = Boolean(phone)
  const language = typeof document !== 'undefined' ? document.documentElement.lang.split('-')[0] : 'en'
  const labels = CONTACT_LABELS[language] || CONTACT_LABELS.en

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

  const contactClass = table
    ? 'text-gray underline underline-offset-2 transition-colors hover:text-primary'
    : 'text-primary hover:underline'

  return (
    <>
      <span
        role='button'
        tabIndex={0}
        className={`inline-flex max-is-full cursor-pointer items-center gap-1 break-all focus:outline-none ${contactClass} ${className}`}
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
          paper: { className: 'min-is-[190px] my-2 overflow-hidden rounded-lg border border-divider py-1 shadow-lg' }
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
              <i className='tabler-brand-whatsapp mie-2 text-success' /> {labels.whatsapp}
            </MenuItem>
            <MenuItem component='a' href={`tel:${phone}`} onClick={close}>
              <i className='tabler-phone-call mie-2 text-primary' /> {labels.call}
            </MenuItem>
          </>
        )}
        {hasEmail && (
          <>
            <MenuItem component='a' href={`mailto:${email}`} onClick={close}>
              <i className='tabler-mail mie-2 text-primary' /> {labels.email}
            </MenuItem>
            <MenuItem onClick={copyEmail}>
              <i className='tabler-copy mie-2' /> {labels.copy}
            </MenuItem>
          </>
        )}
      </Popover>
    </>
  )
}

export default QuickContact
